"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Profile = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
};

type Laptop = {
  id: string;
  asset_tag: string;
  serial_number: string | null;
  brand: string | null;
  model: string | null;
  processor: string | null;
  ram: string | null;
  storage: string | null;
  operating_system: string | null;
  purchase_date: string | null;
  warranty_expiry: string | null;
  status: string | null;
  condition_notes: string | null;
  current_user_id: string | null;
};

type Complaint = {
  id: string;
  laptop_id: string | null;
  user_id: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

type Transfer = {
  id: string;
  laptop_id: string;
  from_user_id: string | null;
  to_user_id: string | null;
  transfer_date: string;
  remarks: string | null;
};

const blankLaptop = {
  asset_tag: "",
  serial_number: "",
  brand: "",
  model: "",
  processor: "",
  ram: "",
  storage: "",
  operating_system: "",
  purchase_date: "",
  warranty_expiry: "",
  status: "Active",
  condition_notes: "",
  current_user_id: "",
};

export default function AdminLaptopPage() {
  const router = useRouter();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [laptopForm, setLaptopForm] = useState(blankLaptop);
  const [transferLaptopId, setTransferLaptopId] = useState("");
  const [transferToUserId, setTransferToUserId] = useState("");
  const [transferRemarks, setTransferRemarks] = useState("");
  const [complaintNotes, setComplaintNotes] = useState<Record<string, string>>({});

  const loadData = async () => {
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      router.push("/login");
      return;
    }

    const { data: myProfile } = await supabase
      .from("employee_profiles")
      .select("*")
      .eq("user_id", authData.user.id)
      .single();

    const role = (myProfile?.role || "").toLowerCase();

    if (!role.includes("admin") && !role.includes("partner")) {
      router.push("/dashboard");
      return;
    }

    const { data: profilesData } = await supabase
      .from("employee_profiles")
      .select("user_id, full_name, email, role")
      .order("full_name", { ascending: true });

    const { data: laptopsData } = await supabase
      .from("laptops")
      .select("*")
      .order("asset_tag", { ascending: true });

    const { data: complaintsData } = await supabase
      .from("laptop_complaints")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: transfersData } = await supabase
      .from("laptop_transfers")
      .select("*")
      .order("transfer_date", { ascending: false });

    setProfiles(profilesData || []);
    setLaptops(laptopsData || []);
    setComplaints(complaintsData || []);
    setTransfers(transfersData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getPersonName = (userId?: string | null) => {
    if (!userId) return "Unassigned";
    const person = profiles.find((p) => p.user_id === userId);
    return person?.full_name || person?.email || userId;
  };

  const getLaptopName = (laptopId?: string | null) => {
    if (!laptopId) return "No laptop selected";
    const laptop = laptops.find((l) => l.id === laptopId);
    return laptop ? `${laptop.asset_tag} - ${laptop.brand || ""} ${laptop.model || ""}` : laptopId;
  };

  const handleAddLaptop = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    if (!laptopForm.asset_tag.trim()) {
      setMessage("Asset tag is required.");
      setSaving(false);
      return;
    }

    const payload = {
      ...laptopForm,
      current_user_id: laptopForm.current_user_id || null,
      purchase_date: laptopForm.purchase_date || null,
      warranty_expiry: laptopForm.warranty_expiry || null,
    };

    const { data, error } = await supabase
      .from("laptops")
      .insert(payload)
      .select()
      .single();

    if (error) {
      setMessage("Laptop could not be added: " + error.message);
      setSaving(false);
      return;
    }

    if (data?.current_user_id) {
      await supabase.from("laptop_transfers").insert({
        laptop_id: data.id,
        from_user_id: null,
        to_user_id: data.current_user_id,
        remarks: "Initial assignment",
      });
    }

    setMessage("Laptop added successfully.");
    setLaptopForm(blankLaptop);
    await loadData();
    setSaving(false);
  };

  const handleTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const laptop = laptops.find((item) => item.id === transferLaptopId);

    if (!laptop || !transferToUserId) {
      setMessage("Please select laptop and new user.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("laptops")
      .update({ current_user_id: transferToUserId, updated_at: new Date().toISOString() })
      .eq("id", transferLaptopId);

    if (updateError) {
      setMessage("Transfer failed: " + updateError.message);
      setSaving(false);
      return;
    }

    await supabase.from("laptop_transfers").insert({
      laptop_id: transferLaptopId,
      from_user_id: laptop.current_user_id,
      to_user_id: transferToUserId,
      remarks: transferRemarks,
    });

    setTransferLaptopId("");
    setTransferToUserId("");
    setTransferRemarks("");
    setMessage("Laptop transferred successfully.");
    await loadData();
    setSaving(false);
  };

  const updateComplaint = async (id: string, status: string) => {
    setMessage("");
    const notes = complaintNotes[id] || complaints.find((c) => c.id === id)?.admin_notes || "";

    const { error } = await supabase
      .from("laptop_complaints")
      .update({
        status,
        admin_notes: notes,
        updated_at: new Date().toISOString(),
        resolved_at: status === "Resolved" ? new Date().toISOString() : null,
      })
      .eq("id", id);

    if (error) {
      setMessage("Complaint status update failed: " + error.message);
      return;
    }

    setMessage(`Complaint marked as ${status}.`);
    await loadData();
  };

  const pendingComplaints = complaints.filter((c) => c.status === "Pending").length;
  const inProgressComplaints = complaints.filter((c) => c.status === "In Progress").length;
  const resolvedComplaints = complaints.filter((c) => c.status === "Resolved").length;

  const getComplaintStyle = (status: string) => {
    if (status === "Resolved") return "bg-green-100 text-green-900 ring-green-300";
    if (status === "In Progress") return "bg-blue-100 text-blue-900 ring-blue-300";
    if (status === "Rejected") return "bg-red-100 text-red-900 ring-red-300";
    return "bg-yellow-100 text-yellow-900 ring-yellow-300";
  };

  if (loading) {
    return <p className="p-10 text-lg font-bold text-slate-900">Loading laptop management...</p>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-slate-950 to-blue-950 p-8 text-white shadow-2xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold">Laptop Management</h1>
              <p className="mt-2 text-blue-100">
                Track laptops, assignments, transfers and support complaints.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push("/admin")}
                className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-slate-900"
              >
                Admin Dashboard
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-2xl bg-blue-700 px-6 py-3 text-sm font-bold text-white"
              >
                Main Dashboard
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className="rounded-2xl bg-blue-50 p-4 font-bold text-blue-900 ring-1 ring-blue-200">
            {message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Summary title="Total Laptops" value={laptops.length} color="bg-slate-900" />
          <Summary title="Assigned" value={laptops.filter((l) => l.current_user_id).length} color="bg-green-700" />
          <Summary title="Pending Complaints" value={pendingComplaints} color="bg-yellow-600" />
          <Summary title="In Progress / Resolved" value={`${inProgressComplaints}/${resolvedComplaints}`} color="bg-blue-700" />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-300">
            <h2 className="text-2xl font-bold text-slate-950">Add Laptop</h2>
            <form onSubmit={handleAddLaptop} className="mt-6 grid gap-4 md:grid-cols-2">
              <Input label="Asset Tag *" value={laptopForm.asset_tag} onChange={(v) => setLaptopForm({ ...laptopForm, asset_tag: v })} />
              <Input label="Serial Number" value={laptopForm.serial_number} onChange={(v) => setLaptopForm({ ...laptopForm, serial_number: v })} />
              <Input label="Brand" value={laptopForm.brand} onChange={(v) => setLaptopForm({ ...laptopForm, brand: v })} />
              <Input label="Model" value={laptopForm.model} onChange={(v) => setLaptopForm({ ...laptopForm, model: v })} />
              <Input label="Processor" value={laptopForm.processor} onChange={(v) => setLaptopForm({ ...laptopForm, processor: v })} />
              <Input label="RAM" value={laptopForm.ram} onChange={(v) => setLaptopForm({ ...laptopForm, ram: v })} />
              <Input label="Storage" value={laptopForm.storage} onChange={(v) => setLaptopForm({ ...laptopForm, storage: v })} />
              <Input label="Operating System" value={laptopForm.operating_system} onChange={(v) => setLaptopForm({ ...laptopForm, operating_system: v })} />
              <Input label="Purchase Date" type="date" value={laptopForm.purchase_date} onChange={(v) => setLaptopForm({ ...laptopForm, purchase_date: v })} />
              <Input label="Warranty Expiry" type="date" value={laptopForm.warranty_expiry} onChange={(v) => setLaptopForm({ ...laptopForm, warranty_expiry: v })} />

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-800">Initial User</label>
                <select
                  value={laptopForm.current_user_id}
                  onChange={(e) => setLaptopForm({ ...laptopForm, current_user_id: e.target.value })}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
                >
                  <option value="">Unassigned</option>
                  {profiles.map((p) => (
                    <option key={p.user_id} value={p.user_id}>
                      {p.full_name || p.email || p.user_id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-800">Status</label>
                <select
                  value={laptopForm.status}
                  onChange={(e) => setLaptopForm({ ...laptopForm, status: e.target.value })}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
                >
                  <option>Active</option>
                  <option>Repair</option>
                  <option>Retired</option>
                  <option>Lost</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-800">Condition / Notes</label>
                <textarea
                  value={laptopForm.condition_notes}
                  onChange={(e) => setLaptopForm({ ...laptopForm, condition_notes: e.target.value })}
                  className="min-h-24 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <button disabled={saving} className="rounded-2xl bg-blue-700 px-6 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-60">
                  {saving ? "Saving..." : "Add Laptop"}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-300">
            <h2 className="text-2xl font-bold text-slate-950">Transfer Laptop</h2>
            <form onSubmit={handleTransfer} className="mt-6 grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-800">Laptop</label>
                <select
                  value={transferLaptopId}
                  onChange={(e) => setTransferLaptopId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
                >
                  <option value="">Select laptop</option>
                  {laptops.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.asset_tag} - current: {getPersonName(l.current_user_id)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-800">Transfer To</label>
                <select
                  value={transferToUserId}
                  onChange={(e) => setTransferToUserId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
                >
                  <option value="">Select user</option>
                  {profiles.map((p) => (
                    <option key={p.user_id} value={p.user_id}>
                      {p.full_name || p.email || p.user_id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-800">Remarks</label>
                <textarea
                  value={transferRemarks}
                  onChange={(e) => setTransferRemarks(e.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
                  placeholder="Reason / handover note"
                />
              </div>

              <button disabled={saving} className="rounded-2xl bg-green-700 px-6 py-3 font-bold text-white hover:bg-green-800 disabled:opacity-60">
                Transfer Laptop
              </button>
            </form>

            <div className="mt-8">
              <h3 className="text-xl font-bold text-slate-950">Recent Transfers</h3>
              <div className="mt-4 max-h-80 space-y-3 overflow-auto pr-2">
                {transfers.slice(0, 8).map((t) => (
                  <div key={t.id} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-300">
                    <p className="font-bold text-slate-950">{getLaptopName(t.laptop_id)}</p>
                    <p className="text-sm text-slate-700">
                      {getPersonName(t.from_user_id)} → {getPersonName(t.to_user_id)}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {new Date(t.transfer_date).toLocaleString()}
                    </p>
                    {t.remarks && <p className="mt-1 text-sm text-slate-700">{t.remarks}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-300">
          <h2 className="text-2xl font-bold text-slate-950">Laptop Inventory</h2>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border border-slate-300 text-sm">
              <thead>
                <tr className="bg-slate-900 text-left text-white">
                  <th className="px-4 py-3">Asset Tag</th>
                  <th className="px-4 py-3">Specs</th>
                  <th className="px-4 py-3">Current User</th>
                  <th className="px-4 py-3">Warranty</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {laptops.map((l) => (
                  <tr key={l.id} className="border-b border-slate-200 bg-white text-slate-900">
                    <td className="px-4 py-3 font-bold">
                      {l.asset_tag}
                      <p className="text-xs font-semibold text-slate-500">SN: {l.serial_number || "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{l.brand || "-"} {l.model || ""}</p>
                      <p className="text-xs text-slate-600">{l.processor || "-"} | {l.ram || "-"} | {l.storage || "-"}</p>
                      <p className="text-xs text-slate-600">OS: {l.operating_system || "-"}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold">{getPersonName(l.current_user_id)}</td>
                    <td className="px-4 py-3">{l.warranty_expiry || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-900 ring-1 ring-green-300">
                        {l.status || "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-300">
          <h2 className="text-2xl font-bold text-slate-950">Laptop Complaints</h2>
          {complaints.length === 0 ? (
            <p className="mt-4 text-slate-700">No complaints raised.</p>
          ) : (
            <div className="mt-6 grid gap-4">
              {complaints.map((c) => (
                <div key={c.id} className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-300">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-950">{c.subject}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        User: {getPersonName(c.user_id)} | Laptop: {getLaptopName(c.laptop_id)} | Priority: {c.priority}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">{c.description}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-500">Raised: {new Date(c.created_at).toLocaleString()}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${getComplaintStyle(c.status)}`}>
                      {c.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-800">Admin Notes</label>
                      <textarea
                        value={complaintNotes[c.id] ?? c.admin_notes ?? ""}
                        onChange={(e) => setComplaintNotes({ ...complaintNotes, [c.id]: e.target.value })}
                        className="min-h-20 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-600"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => updateComplaint(c.id, "In Progress")} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">In Progress</button>
                      <button onClick={() => updateComplaint(c.id, "Resolved")} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800">Resolved</button>
                      <button onClick={() => updateComplaint(c.id, "Rejected")} className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800">Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Summary({ title, value, color }: { title: string; value: string | number; color: string }) {
  return (
    <div className={`${color} rounded-2xl p-5 text-white shadow-xl`}>
      <p className="text-sm font-bold text-white/90">{title}</p>
      <p className="mt-1 text-3xl font-extrabold">{value}</p>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-800">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
      />
    </div>
  );
}
