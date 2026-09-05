"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import PortalShell from "../../../components/PortalShell";

type Employee = { user_id: string; full_name: string | null; role: string | null; designation: string | null; official_email: string | null; personal_email: string | null; mobile_number: string | null; employment_status: string | null; active_for_assignment: boolean | null; joining_date: string | null; date_of_exit: string | null; exit_reason: string | null; };

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [profileName, setProfileName] = useState("");
  const [loading, setLoading] = useState(true); const [message, setMessage] = useState(""); const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { router.push("/login"); return; }
    const { data: mp } = await supabase.from("employee_profiles").select("*").eq("user_id", u.user.id).single();
    const role = (mp?.role || "").toLowerCase();
    if (!role.includes("admin") && !role.includes("partner")) { router.push("/dashboard"); return; }
    setProfileName(mp?.full_name || "");
    const { data } = await supabase.from("employee_profiles").select("user_id,full_name,role,designation,official_email,personal_email,mobile_number,employment_status,active_for_assignment,joining_date,date_of_exit,exit_reason").order("full_name", { ascending: true });
    setEmployees(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const markPast = async (emp: Employee) => {
    const reason = window.prompt(`Exit reason for ${emp.full_name || "this employee"}?`);
    if (reason === null) return;
    const { error } = await supabase.from("employee_profiles").update({ employment_status: "Past Employee", active_for_assignment: false, date_of_exit: new Date().toISOString().slice(0, 10), exit_reason: reason || null }).eq("user_id", emp.user_id);
    if (error) { setMessage(error.message); return; }
    setMessage("Employee moved to past database."); await load();
  };
  const reactivate = async (emp: Employee) => {
    const { error } = await supabase.from("employee_profiles").update({ employment_status: "Active", active_for_assignment: true, date_of_exit: null, exit_reason: null }).eq("user_id", emp.user_id);
    if (error) { setMessage(error.message); return; }
    setMessage("Employee reactivated."); await load();
  };

  const filtered = employees.filter(e => !search || `${e.full_name} ${e.role} ${e.designation} ${e.official_email} ${e.personal_email} ${e.mobile_number}`.toLowerCase().includes(search.toLowerCase()));
  const active = filtered.filter(e => e.active_for_assignment !== false);
  const past = filtered.filter(e => e.active_for_assignment === false);
  const articles = employees.filter(e => (e.role || "").toLowerCase().includes("article"));
  const departments = ["All", ...Array.from(new Set(employees.map(e => e.designation).filter(Boolean)))];

  if (loading) return <div style={{ marginLeft: 220, padding: "2rem" }}><div className="skeleton" style={{ height: 90, borderRadius: 12, marginBottom: "1rem" }} /><div className="skeleton" style={{ height: 300, borderRadius: 12 }} /></div>;

  const TH = ({ children }: { children: React.ReactNode }) => (
    <th style={{ padding: "0.6rem 1rem", textAlign: "left", fontWeight: 700, color: "var(--forest)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)", background: "#f7f9f5", whiteSpace: "nowrap" }}>{children}</th>
  );
  const TD = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <td style={{ padding: "0.65rem 1rem", fontSize: "0.845rem", color: "var(--text)", ...style }}>{children}</td>
  );

  const EmpTable = ({ emps, isPast }: { emps: Employee[]; isPast: boolean }) => (
    <div style={{ overflowX: "auto" }}>
      {emps.length === 0 ? <p style={{ padding: "1rem", color: "var(--muted)", fontSize: "0.875rem" }}>No employees found.</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.845rem" }}>
          <thead>
            <tr>
              {["#", "Name", "Role", "Designation", "Email", "Mobile", "Status", "Joining", ...(isPast ? ["Exit", "Reason"] : []), "Action"].map(h => <TH key={h}>{h}</TH>)}
            </tr>
          </thead>
          <tbody>
            {emps.map((e, i) => (
              <tr key={e.user_id} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "#fff" : "#fafaf8" }}>
                <TD style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{i + 1}</TD>
                <TD><span style={{ fontWeight: 700 }}>{e.full_name || "—"}</span></TD>
                <TD>{e.role || "—"}</TD>
                <TD style={{ color: "var(--muted)" }}>{e.designation || "—"}</TD>
                <TD style={{ color: "var(--forest-mid)", fontSize: "0.8rem" }}>{e.official_email || e.personal_email || "—"}</TD>
                <TD style={{ color: "var(--muted)" }}>{e.mobile_number || "—"}</TD>
                <TD><span className={`badge ${isPast ? "br" : "bg"}`}>{e.employment_status || "Active"}</span></TD>
                <TD style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{e.joining_date || "—"}</TD>
                {isPast && <><TD style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{e.date_of_exit || "—"}</TD><TD style={{ color: "var(--muted)", fontSize: "0.78rem", maxWidth: 160 }}>{e.exit_reason || "—"}</TD></>}
                <TD>
                  {isPast
                    ? <button className="btn btn-p btn-sm" onClick={() => reactivate(e)}>Reactivate</button>
                    : <button style={{ background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: 6, padding: "0.3rem 0.7rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }} onClick={() => markPast(e)}>Mark Past</button>}
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <PortalShell isAdminOrPartner profileName={profileName} pageTitle="Employees">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--forest)", marginBottom: 4 }}>Employees</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Employee directory, roles and management.</p>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, role..." className="fi" style={{ width: 260 }} />
      </div>

      {message && <div style={{ background: "#e8f4ec", borderRadius: 9, padding: "0.7rem 1rem", color: "var(--forest)", fontWeight: 600, fontSize: "0.85rem", marginBottom: "1rem" }}>{message}</div>}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
        <div className="sc"><div className="sv">{employees.length}</div><div className="sl">Total Employees</div></div>
        <div className="sc"><div className="sv">{employees.filter(e => e.active_for_assignment !== false).length}</div><div className="sl">Active</div></div>
        <div className="sc"><div className="sv">{employees.filter(e => e.active_for_assignment === false).length}</div><div className="sl">Past Employees</div></div>
        <div className="sc"><div className="sv">{articles.length}</div><div className="sl">Articles</div></div>
      </div>

      {/* Active */}
      <div className="card" style={{ overflow: "hidden", marginBottom: "1.25rem" }}>
        <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)", background: "#fafaf8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.9rem" }}>Active Employees</span>
          <span className="badge bg">{active.length}</span>
        </div>
        <EmpTable emps={active} isPast={false} />
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)", background: "#fafaf8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.9rem" }}>Past Employees</span>
            <span className="badge br">{past.length}</span>
          </div>
          <EmpTable emps={past} isPast={true} />
        </div>
      )}
    </PortalShell>
  );
}
