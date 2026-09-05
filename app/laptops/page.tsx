"use client";

import PortalShell from "../../components/PortalShell";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

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
  warranty_expiry: string | null;
  condition_notes: string | null;
  status: string | null;
};

type Complaint = {
  id: string;
  laptop_id: string | null;
  subject: string;
  description: string;
  priority: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

export default function LaptopUserPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [laptopId, setLaptopId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");

  const loadData = async (uid: string) => {
    const { data: laptopData } = await supabase
      .from("laptops")
      .select("*")
      .eq("current_user_id", uid)
      .order("asset_tag", { ascending: true });

    const { data: complaintData } = await supabase
      .from("laptop_complaints")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    setLaptops(laptopData || []);
    setComplaints(complaintData || []);

    if (!laptopId && laptopData && laptopData.length > 0) {
      setLaptopId(laptopData[0].id);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace("/login");
        return;
      }

      setUserId(data.user.id);
      await loadData(data.user.id);
      setLoading(false);
    };

    init();
  }, [router]);

  const handleSubmitComplaint = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    if (!subject.trim() || !description.trim()) {
      setMessage("Please enter subject and description.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("laptop_complaints").insert({
      user_id: userId,
      laptop_id: laptopId || null,
      subject,
      description,
      priority,
      status: "Pending",
    });

    if (error) {
      setMessage("Complaint could not be submitted: " + error.message);
    } else {
      setMessage("Complaint submitted successfully.");
      setSubject("");
      setDescription("");
      setPriority("Medium");
      await loadData(userId);
    }

    setSaving(false);
  };

  const getStatusStyle = (status?: string | null) => {
    if (status === "Resolved") return "bg-green-100 text-green-900 ring-green-300";
    if (status === "In Progress") return "bg-blue-100 text-blue-900 ring-blue-300";
    if (status === "Rejected") return "bg-red-100 text-red-900 ring-red-300";
    return "bg-yellow-100 text-yellow-900 ring-yellow-300";
  };

  if (loading) {
    return <p className="p-10 text-lg font-bold text-slate-900">Loading laptop dashboard...</p>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "1.75rem" }}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-300">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-950">Laptop Support</h1>
              <p className="mt-2 text-slate-700">View your assigned laptop and raise support complaints.</p>
            </div>
            <button
              onClick={() => { const o=document.getElementById("page-transition-overlay"); if(o){o.classList.add("active");setTimeout(()=>{router.push("/dashboard");setTimeout(()=>o.classList.remove("active"),80)},120);}else router.push("/dashboard"); }}
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white hover:bg-slate-800"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-300">
          <h2 className="text-2xl font-bold text-slate-950">My Laptop</h2>

          {laptops.length === 0 ? (
            <p className="mt-4 rounded-xl bg-yellow-50 p-4 font-semibold text-yellow-900 ring-1 ring-yellow-300">
              No laptop is currently assigned to you.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {laptops.map((laptop) => (
                <div key={laptop.id} className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-300">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-bold text-slate-950">{laptop.asset_tag}</h3>
                      <p className="text-sm font-medium text-slate-600">
                        {laptop.brand || "-"} {laptop.model || ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-900 ring-1 ring-green-300">
                      {laptop.status || "Active"}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 text-sm text-slate-800">
                    <Info label="Serial No." value={laptop.serial_number} />
                    <Info label="Processor" value={laptop.processor} />
                    <Info label="RAM" value={laptop.ram} />
                    <Info label="Storage" value={laptop.storage} />
                    <Info label="OS" value={laptop.operating_system} />
                    <Info label="Warranty Expiry" value={laptop.warranty_expiry} />
                    <Info label="Notes" value={laptop.condition_notes} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-300">
          <h2 className="text-2xl font-bold text-slate-950">Raise Laptop Complaint</h2>

          <form onSubmit={handleSubmitComplaint} className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-800">Laptop</label>
              <select
                value={laptopId}
                onChange={(e) => setLaptopId(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
              >
                {laptops.length === 0 && <option value="">No laptop assigned</option>}
                {laptops.map((laptop) => (
                  <option key={laptop.id} value={laptop.id}>
                    {laptop.asset_tag} - {laptop.brand || ""} {laptop.model || ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-800">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-bold text-slate-800">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
                placeholder="Example: Battery backup issue"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-bold text-slate-800">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-32 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
                placeholder="Explain the issue clearly."
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-4">
              <button
                disabled={saving}
                className="rounded-2xl bg-blue-700 px-6 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {saving ? "Submitting..." : "Submit Complaint"}
              </button>
              {message && <p className="text-sm font-bold text-slate-800">{message}</p>}
            </div>
          </form>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-300">
          <h2 className="text-2xl font-bold text-slate-950">My Complaints</h2>

          {complaints.length === 0 ? (
            <p className="mt-4 text-slate-700">No complaints raised yet.</p>
          ) : (
            <div className="mt-6 grid gap-4">
              {complaints.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-300">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-950">{item.subject}</h3>
                      <p className="mt-1 text-sm text-slate-700">{item.description}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        Priority: {item.priority} | Raised: {new Date(item.created_at).toLocaleString()}
                      </p>
                      {item.admin_notes && (
                        <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-900 ring-1 ring-blue-200">
                          Admin Note: {item.admin_notes}
                        </p>
                      )}
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${getStatusStyle(item.status)}`}>
                      {item.status}
                    </span>
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

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value || "-"}</p>
    </div>
  );
}
