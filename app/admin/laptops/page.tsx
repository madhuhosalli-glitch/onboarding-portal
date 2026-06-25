"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Profile = {
  user_id: string;
  full_name: string | null;
  official_email: string | null;
  personal_email: string | null;
  role: string | null;
  employment_status: string | null;
  active_for_assignment: boolean | null;
  date_of_exit: string | null;
  exit_reason: string | null;
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
  vendor: string | null;
  purchase_price: number | null;
  accessories: string | null;
  deleted_at: string | null;
  deleted_reason: string | null;
  antivirus_name: string | null;
  antivirus_license_key: string | null;
  antivirus_expiry: string | null;
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
  assigned_to: string | null;
  resolution_notes: string | null;
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

type LaptopForm = {
  asset_tag: string;
  serial_number: string;
  brand: string;
  model: string;
  processor: string;
  ram: string;
  storage: string;
  operating_system: string;
  purchase_date: string;
  warranty_expiry: string;
  status: string;
  condition_notes: string;
  current_user_id: string;
  vendor: string;
  purchase_price: string;
  accessories: string;
  antivirus_name: string;
  antivirus_license_key: string;
  antivirus_expiry: string;
};

const blankLaptop: LaptopForm = {
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
  vendor: "",
  purchase_price: "",
  accessories: "",
  accessories: "",
  antivirus_name: "",
  antivirus_license_key: "",
  antivirus_expiry: "",
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
  const [search, setSearch] = useState("");

  const [laptopForm, setLaptopForm] = useState<LaptopForm>(blankLaptop);
  const [selectedLaptop, setSelectedLaptop] = useState<Laptop | null>(null);
  const [editLaptop, setEditLaptop] = useState<Laptop | null>(null);
  const [transferLaptop, setTransferLaptop] = useState<Laptop | null>(null);
  const [transferToUserId, setTransferToUserId] = useState("");
  const [transferRemarks, setTransferRemarks] = useState("");

  const [complaintNotes, setComplaintNotes] = useState<Record<string, string>>({});
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [assignedTo, setAssignedTo] = useState<Record<string, string>>({});

  const activeProfiles = profiles.filter((p) => p.active_for_assignment !== false);
  const pastProfiles = profiles.filter((p) => p.active_for_assignment === false);
  const activeLaptops = laptops.filter((l) => !l.deleted_at);
  const retiredLaptops = laptops.filter((l) => l.deleted_at);

  const getPersonName = (userId?: string | null) => {
    if (!userId) return "Unassigned";
    const person = profiles.find((p) => p.user_id === userId);
    return person?.full_name || person?.official_email || person?.personal_email || userId;
  };

  const getPersonEmail = (person: Profile) => person.official_email || person.personal_email || "No email";

  const getLaptopName = (laptopId?: string | null) => {
    if (!laptopId) return "No laptop selected";
    const laptop = laptops.find((l) => l.id === laptopId);
    return laptop ? `${laptop.asset_tag} - ${laptop.brand || ""} ${laptop.model || ""}` : laptopId;
  };

  const getLaptopTransfers = (laptopId: string) => transfers.filter((t) => t.laptop_id === laptopId);
  const getLaptopComplaints = (laptopId: string) => complaints.filter((c) => c.laptop_id === laptopId);

  const filteredLaptops = useMemo(() => {

    const text = search.trim().toLowerCase();
    if (!text) return activeLaptops;
    return activeLaptops.filter((l) =>
      [
        l.asset_tag,
        l.serial_number,
        l.brand,
        l.model,
        l.processor,
        l.ram,
        l.storage,
        l.operating_system,
        l.vendor,
        l.status,
        getPersonName(l.current_user_id),
      ]
        .join(" ")
        .toLowerCase()
        .includes(text)
    );
  }, [search, laptops, profiles]);
    const availableLaptops = activeLaptops.filter(
    (l) => !l.current_user_id
  ).length;

  const assignedLaptops = activeLaptops.filter(
    (l) => l.current_user_id
  ).length;

  const repairLaptops = activeLaptops.filter(
    (l) => l.status === "Repair"
  ).length;

  const pendingComplaints = complaints.filter(
    (c) => c.status === "Pending"
  ).length;

  const inProgressComplaints = complaints.filter(
    (c) => c.status === "In Progress"
  ).length;

  const resolvedComplaints = complaints.filter(
    (c) => c.status === "Resolved"
  ).length;

  const loadData = async () => {
    setLoading(true);
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

    const { data: profilesData, error: profilesError } = await supabase
      .from("employee_profiles")
      .select("user_id, full_name, official_email, personal_email, role, employment_status, active_for_assignment, date_of_exit, exit_reason")
      .order("full_name", { ascending: true });

    if (profilesError) setMessage("Profiles could not be loaded: " + profilesError.message);

    const { data: laptopsData, error: laptopsError } = await supabase
      .from("laptops")
      .select("*")
      .order("asset_tag", { ascending: true });

    if (laptopsError) setMessage("Laptops could not be loaded: " + laptopsError.message);

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

  const resetLaptopForm = () => {
    setLaptopForm(blankLaptop);
    setEditLaptop(null);
  };

  const openEditModal = (laptop: Laptop) => {
    setEditLaptop(laptop);
    setLaptopForm({
      asset_tag: laptop.asset_tag || "",
      serial_number: laptop.serial_number || "",
      brand: laptop.brand || "",
      model: laptop.model || "",
      processor: laptop.processor || "",
      ram: laptop.ram || "",
      storage: laptop.storage || "",
      operating_system: laptop.operating_system || "",
      purchase_date: laptop.purchase_date || "",
      warranty_expiry: laptop.warranty_expiry || "",
      status: laptop.status || "Active",
      condition_notes: laptop.condition_notes || "",
      current_user_id: laptop.current_user_id || "",
      vendor: laptop.vendor || "",
      purchase_price: laptop.purchase_price ? String(laptop.purchase_price) : "",
      accessories: laptop.accessories || "",
      antivirus_name: laptop.antivirus_name || "",
      antivirus_license_key: laptop.antivirus_license_key || "",
      antivirus_expiry: laptop.antivirus_expiry || "",
    });
  };

  const openTransferModal = (laptop: Laptop) => {
    setTransferLaptop(laptop);
    setTransferToUserId(laptop.current_user_id || "");
    setTransferRemarks("");
  };

  const buildPayload = () => ({
    asset_tag: laptopForm.asset_tag.trim(),
    serial_number: laptopForm.serial_number || null,
    brand: laptopForm.brand || null,
    model: laptopForm.model || null,
    processor: laptopForm.processor || null,
    ram: laptopForm.ram || null,
    storage: laptopForm.storage || null,
    operating_system: laptopForm.operating_system || null,
    purchase_date: laptopForm.purchase_date || null,
    warranty_expiry: laptopForm.warranty_expiry || null,
    status: laptopForm.status || "Active",
    condition_notes: laptopForm.condition_notes || null,
    current_user_id: laptopForm.current_user_id || null,
    vendor: laptopForm.vendor || null,
    purchase_price: laptopForm.purchase_price ? Number(laptopForm.purchase_price) : null,
    accessories: laptopForm.accessories || null,
    antivirus_name: laptopForm.antivirus_name || null,
    antivirus_license_key: laptopForm.antivirus_license_key || null,
    antivirus_expiry: laptopForm.antivirus_expiry || null,
    updated_at: new Date().toISOString(),
  });

  const handleAddLaptop = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    if (!laptopForm.asset_tag.trim()) {
      setMessage("Asset tag is required.");
      setSaving(false);
      return;
    }

    const { data, error } = await supabase.from("laptops").insert(buildPayload()).select().single();

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

  const handleEditLaptop = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editLaptop) return;
    setSaving(true);
    setMessage("");

    if (!laptopForm.asset_tag.trim()) {
      setMessage("Asset tag is required.");
      setSaving(false);
      return;
    }

    const previousUserId = editLaptop.current_user_id || null;
    const newUserId = laptopForm.current_user_id || null;
    const { error } = await supabase.from("laptops").update(buildPayload()).eq("id", editLaptop.id);

    if (error) {
      setMessage("Laptop could not be updated: " + error.message);
      setSaving(false);
      return;
    }

    if (previousUserId !== newUserId) {
      await supabase.from("laptop_transfers").insert({
        laptop_id: editLaptop.id,
        from_user_id: previousUserId,
        to_user_id: newUserId,
        remarks: "Changed during laptop edit",
      });
    }

    setMessage("Laptop updated successfully.");
    resetLaptopForm();
    await loadData();
    setSaving(false);
  };

  const handleTransferLaptop = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!transferLaptop) return;
    setSaving(true);
    setMessage("");

    if (!transferToUserId) {
      setMessage("Please select an employee.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("laptops")
      .update({ current_user_id: transferToUserId, updated_at: new Date().toISOString() })
      .eq("id", transferLaptop.id);

    if (error) {
      setMessage("Transfer failed: " + error.message);
      setSaving(false);
      return;
    }

    await supabase.from("laptop_transfers").insert({
      laptop_id: transferLaptop.id,
      from_user_id: transferLaptop.current_user_id,
      to_user_id: transferToUserId,
      remarks: transferRemarks || null,
    });

    setTransferLaptop(null);
    setTransferToUserId("");
    setTransferRemarks("");
    setMessage("Laptop assigned/transferred successfully.");
    await loadData();
    setSaving(false);
  };

  const retireLaptop = async (laptopId: string) => {
    const reason = window.prompt("Reason for retiring this laptop?");
    if (!reason) return;

    const { error } = await supabase
      .from("laptops")
      .update({
        status: "Retired",
        current_user_id: null,
        deleted_at: new Date().toISOString(),
        deleted_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", laptopId);

    if (error) {
      setMessage("Laptop could not be retired: " + error.message);
      return;
    }

    setMessage("Laptop retired. History has been preserved.");
    await loadData();
  };

  const restoreLaptop = async (laptopId: string) => {
    const { error } = await supabase
      .from("laptops")
      .update({ status: "Active", deleted_at: null, deleted_reason: null, updated_at: new Date().toISOString() })
      .eq("id", laptopId);

    if (error) {
      setMessage("Laptop could not be restored: " + error.message);
      return;
    }

    setMessage("Laptop restored.");
    await loadData();
  };

  const updateComplaint = async (id: string, status: string) => {
    setMessage("");
    const notes = complaintNotes[id] || complaints.find((c) => c.id === id)?.admin_notes || "";
    const resolution = resolutionNotes[id] || complaints.find((c) => c.id === id)?.resolution_notes || "";
    const assigned = assignedTo[id] || complaints.find((c) => c.id === id)?.assigned_to || "";

    const { error } = await supabase
      .from("laptop_complaints")
      .update({
        status,
        admin_notes: notes,
        assigned_to: assigned || null,
        resolution_notes: resolution || null,
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
              <p className="mt-2 text-blue-100">Track laptops, assignments, transfers, users and complaints.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => router.push("/admin")} className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-slate-900">Admin Dashboard</button>
              <button onClick={() => router.push("/dashboard")} className="rounded-2xl bg-blue-700 px-6 py-3 text-sm font-bold text-white">Main Dashboard</button>
            </div>
          </div>
        </div>

        {message && <div className="rounded-2xl bg-blue-50 p-4 font-bold text-blue-900 ring-1 ring-blue-200">{message}</div>}

        <div className="grid gap-4 md:grid-cols-5">
          <Summary title="Active Laptops" value={activeLaptops.length} color="bg-slate-900" />
          <Summary title="Assigned" value={assignedLaptops} color="bg-green-700" />
          <Summary title="Available" value={availableLaptops} color="bg-blue-700" />
          <Summary title="Repair" value={repairLaptops} color="bg-orange-700" />
          <Summary title="Pending Complaints" value={pendingComplaints} color="bg-yellow-600" />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <LaptopFormBox
            title="Add Laptop"
            laptopForm={laptopForm}
            setLaptopForm={setLaptopForm}
            activeProfiles={activeProfiles}
            getPersonEmail={getPersonEmail}
            onSubmit={handleAddLaptop}
            saving={saving}
            buttonText="Add Laptop"
          />

          <Section title="Search & Status">
            <Input label="Search Laptop / User" value={search} onChange={setSearch} placeholder="Search asset tag, serial, user, specs..." />
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <InfoLine label="Past Employees" value={pastProfiles.length} />
              <InfoLine label="Retired Laptops" value={retiredLaptops.length} />
              <InfoLine label="In Progress Complaints" value={inProgressComplaints} />
              <InfoLine label="Resolved Complaints" value={resolvedComplaints} />
            </div>
          </Section>
        </div>

        <Section title="Laptop Inventory">
          <div className="overflow-x-auto">
            <table className="min-w-full border border-slate-300 text-sm">
              <thead>
                <tr className="bg-slate-900 text-left text-white">
                  <th className="px-4 py-3">Asset Tag</th>
                  <th className="px-4 py-3">Specs</th>
                  <th className="px-4 py-3">Current User</th>
                  <th className="px-4 py-3">Warranty</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLaptops.map((l) => (
                  <tr key={l.id} className="border-b border-slate-200 bg-white text-slate-900">
                    <td className="px-4 py-3 font-bold">
                      {l.asset_tag}
                      <p className="text-xs font-semibold text-slate-500">SN: {l.serial_number || "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{l.brand || "-"} {l.model || ""}</p>
                      <p className="text-xs text-slate-600">{l.processor || "-"} | {l.ram || "-"} | {l.storage || "-"}</p>
                      <p className="text-xs text-slate-600">OS: {l.operating_system || "-"}</p>
                      <p className="text-xs text-slate-600">Accessories: {l.accessories || "-"}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold">{getPersonName(l.current_user_id)}</td>
                    <td className="px-4 py-3">{l.warranty_expiry || "-"}</td>
                    <td className="px-4 py-3"><Badge text={l.status || "Active"} color="bg-green-100 text-green-900" /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <ActionButton label="View" color="bg-slate-900" onClick={() => setSelectedLaptop(l)} />
                        <ActionButton label="Edit" color="bg-blue-700" onClick={() => openEditModal(l)} />
                        <ActionButton label={l.current_user_id ? "Transfer" : "Assign"} color="bg-green-700" onClick={() => openTransferModal(l)} />
                        <ActionButton label="Retire" color="bg-red-700" onClick={() => retireLaptop(l.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Retired / Deleted Laptop Database">
          {retiredLaptops.length === 0 ? <p className="text-slate-700">No retired laptops.</p> : (
            <div className="grid gap-3">
              {retiredLaptops.map((l) => (
                <div key={l.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-300">
                  <p className="font-bold text-slate-950">{l.asset_tag} - {l.brand || ""} {l.model || ""}</p>
                  <p className="text-sm text-slate-700">Reason: {l.deleted_reason || "-"}</p>
                  <button onClick={() => restoreLaptop(l.id)} className="mt-3 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white">Restore</button>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Recent Transfers">
          <div className="grid gap-3">
            {transfers.slice(0, 20).map((t) => (
              <div key={t.id} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-300">
                <p className="font-bold text-slate-950">{getLaptopName(t.laptop_id)}</p>
                <p className="text-sm text-slate-700">{getPersonName(t.from_user_id)} → {getPersonName(t.to_user_id)}</p>
                <p className="text-xs font-semibold text-slate-500">{new Date(t.transfer_date).toLocaleString("en-GB")}</p>
                {t.remarks && <p className="mt-1 text-sm text-slate-700">{t.remarks}</p>}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Laptop Complaints">
          {complaints.length === 0 ? <p className="text-slate-700">No complaints raised.</p> : (
            <div className="grid gap-4">
              {complaints.map((c) => (
                <div key={c.id} className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-300">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-950">{c.subject}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-700">User: {getPersonName(c.user_id)} | Laptop: {getLaptopName(c.laptop_id)} | Priority: {c.priority}</p>
                      <p className="mt-2 text-sm text-slate-700">{c.description}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-500">Raised: {new Date(c.created_at).toLocaleString("en-GB")}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${getComplaintStyle(c.status)}`}>{c.status}</span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <Input label="Assigned To" value={assignedTo[c.id] ?? c.assigned_to ?? ""} onChange={(v) => setAssignedTo({ ...assignedTo, [c.id]: v })} />
                    <TextArea label="Admin Notes" value={complaintNotes[c.id] ?? c.admin_notes ?? ""} onChange={(v) => setComplaintNotes({ ...complaintNotes, [c.id]: v })} />
                    <TextArea label="Resolution Notes" value={resolutionNotes[c.id] ?? c.resolution_notes ?? ""} onChange={(v) => setResolutionNotes({ ...resolutionNotes, [c.id]: v })} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <ActionButton label="In Progress" color="bg-blue-700" onClick={() => updateComplaint(c.id, "In Progress")} />
                    <ActionButton label="Resolved" color="bg-green-700" onClick={() => updateComplaint(c.id, "Resolved")} />
                    <ActionButton label="Reject" color="bg-red-700" onClick={() => updateComplaint(c.id, "Rejected")} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {selectedLaptop && (
        <Modal title={`Laptop Details - ${selectedLaptop.asset_tag}`} onClose={() => setSelectedLaptop(null)}>
          <div className="grid gap-4 md:grid-cols-2">
            <InfoLine label="Current User" value={getPersonName(selectedLaptop.current_user_id)} />
            <InfoLine label="Brand / Model" value={`${selectedLaptop.brand || "-"} ${selectedLaptop.model || ""}`} />
            <InfoLine label="Processor" value={selectedLaptop.processor || "-"} />
            <InfoLine label="RAM / Storage" value={`${selectedLaptop.ram || "-"} / ${selectedLaptop.storage || "-"}`} />
            <InfoLine label="OS" value={selectedLaptop.operating_system || "-"} />
            <InfoLine label="Warranty" value={selectedLaptop.warranty_expiry || "-"} />
            <InfoLine label="Vendor" value={selectedLaptop.vendor || "-"} />
            <InfoLine label="Purchase Price" value={selectedLaptop.purchase_price ? `₹ ${selectedLaptop.purchase_price}` : "-"} />
          </div>

          <h3 className="mt-6 text-xl font-bold text-slate-950">Transfer History</h3>
          <HistoryList transfers={getLaptopTransfers(selectedLaptop.id)} getPersonName={getPersonName} />

          <h3 className="mt-6 text-xl font-bold text-slate-950">Complaint History</h3>
          <ComplaintMiniList complaints={getLaptopComplaints(selectedLaptop.id)} />
        </Modal>
      )}

      {transferLaptop && (
        <Modal title={`${transferLaptop.current_user_id ? "Transfer" : "Assign"} Laptop - ${transferLaptop.asset_tag}`} onClose={() => setTransferLaptop(null)}>
          <form onSubmit={handleTransferLaptop} className="grid gap-4">
            <InfoLine label="Current User" value={getPersonName(transferLaptop.current_user_id)} />
            <Select label="Transfer / Assign To" value={transferToUserId} onChange={setTransferToUserId} options={[{ value: "", label: "Select active employee" }, ...activeProfiles.map((p) => ({ value: p.user_id, label: `${p.full_name || getPersonEmail(p)} - ${p.role || "User"}` }))]} />
            <TextArea label="Remarks" value={transferRemarks} onChange={setTransferRemarks} placeholder="Reason / handover note" />
            <button disabled={saving} className="rounded-2xl bg-green-700 px-6 py-3 font-bold text-white hover:bg-green-800 disabled:opacity-60">{saving ? "Saving..." : "Submit Transfer"}</button>
          </form>
        </Modal>
      )}

      {editLaptop && (
        <Modal title={`Edit Laptop - ${editLaptop.asset_tag}`} onClose={resetLaptopForm}>
          <LaptopFormBox title="" laptopForm={laptopForm} setLaptopForm={setLaptopForm} activeProfiles={activeProfiles} getPersonEmail={getPersonEmail} onSubmit={handleEditLaptop} saving={saving} buttonText="Update Laptop" />
        </Modal>
      )}
    </div>
  );
}

function LaptopFormBox({ title, laptopForm, setLaptopForm, activeProfiles, getPersonEmail, onSubmit, saving, buttonText }: { title: string; laptopForm: LaptopForm; setLaptopForm: (form: LaptopForm) => void; activeProfiles: Profile[]; getPersonEmail: (person: Profile) => string; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; saving: boolean; buttonText: string; }) {
  return (
    <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-300">
      {title && <h2 className="text-2xl font-bold text-slate-950">{title}</h2>}
      <form onSubmit={onSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
        <Input label="Asset Tag *" value={laptopForm.asset_tag} onChange={(v) => setLaptopForm({ ...laptopForm, asset_tag: v })} />
        <Input label="Serial Number" value={laptopForm.serial_number} onChange={(v) => setLaptopForm({ ...laptopForm, serial_number: v })} />
        <Input label="Brand" value={laptopForm.brand} onChange={(v) => setLaptopForm({ ...laptopForm, brand: v })} />
        <Input label="Model" value={laptopForm.model} onChange={(v) => setLaptopForm({ ...laptopForm, model: v })} />
        <Input label="Processor" value={laptopForm.processor} onChange={(v) => setLaptopForm({ ...laptopForm, processor: v })} />
        <Input label="RAM" value={laptopForm.ram} onChange={(v) => setLaptopForm({ ...laptopForm, ram: v })} />
        <Input label="Storage" value={laptopForm.storage} onChange={(v) => setLaptopForm({ ...laptopForm, storage: v })} />
        <Input label="Operating System" value={laptopForm.operating_system} onChange={(v) => setLaptopForm({ ...laptopForm, operating_system: v })} />
        <Input label="Vendor" value={laptopForm.vendor} onChange={(v) => setLaptopForm({ ...laptopForm, vendor: v })} />
        <Input label="Purchase Price" type="number" value={laptopForm.purchase_price} onChange={(v) => setLaptopForm({ ...laptopForm, purchase_price: v })} />
        <Input label="Purchase Date" type="date" value={laptopForm.purchase_date} onChange={(v) => setLaptopForm({ ...laptopForm, purchase_date: v })} />
        <Input label="Warranty Expiry" type="date" value={laptopForm.warranty_expiry} onChange={(v) => setLaptopForm({ ...laptopForm, warranty_expiry: v })} />
        <Input
          label="Antivirus Name"
          value={laptopForm.antivirus_name}
          onChange={(v) =>
            setLaptopForm({
              ...laptopForm,
              antivirus_name: v,
            })
          }
        />

        <Input
          label="Antivirus Licence Key"
          value={laptopForm.antivirus_license_key}
          onChange={(v) =>
            setLaptopForm({
              ...laptopForm,
              antivirus_license_key: v,
            })
          }
        />

        <Input
          label="Antivirus Expiry"
          type="date"
          value={laptopForm.antivirus_expiry}
          onChange={(v) =>
            setLaptopForm({
              ...laptopForm,
              antivirus_expiry: v,
            })
          }
        />
        <Select label="Current User" value={laptopForm.current_user_id} onChange={(v) => setLaptopForm({ ...laptopForm, current_user_id: v })} options={[{ value: "", label: "Unassigned" }, ...activeProfiles.map((p) => ({ value: p.user_id, label: `${p.full_name || getPersonEmail(p)} - ${p.role || "User"}` }))]} />
        <Select label="Status" value={laptopForm.status} onChange={(v) => setLaptopForm({ ...laptopForm, status: v })} options={["Active", "Repair", "Lost", "Retired", "Scrapped"].map((s) => ({ value: s, label: s }))} />
        <TextArea label="Accessories Issued" value={laptopForm.accessories} onChange={(v) => setLaptopForm({ ...laptopForm, accessories: v })} />
        <TextArea label="Condition / Notes" value={laptopForm.condition_notes} onChange={(v) => setLaptopForm({ ...laptopForm, condition_notes: v })} />
        <div className="md:col-span-2"><button disabled={saving} className="rounded-2xl bg-blue-700 px-6 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-60">{saving ? "Saving..." : buttonText}</button></div>
      </form>
    </div>
  );
}

function Summary({ title, value, color }: { title: string; value: string | number; color: string }) { return <div className={`${color} rounded-2xl p-5 text-white shadow-xl`}><p className="text-sm font-bold text-white/80">{title}</p><p className="mt-2 text-3xl font-extrabold">{value}</p></div>; }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-300"><h2 className="mb-6 text-2xl font-bold text-slate-950">{title}</h2>{children}</div>; }
function Badge({ text, color }: { text: string; color: string }) { return <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${color}`}>{text}</span>; }
function ActionButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) { return <button onClick={onClick} className={`rounded-xl ${color} px-3 py-2 text-xs font-bold text-white hover:opacity-90`}>{label}</button>; }
function Input({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) { return <div><label className="mb-2 block text-sm font-bold text-slate-800">{label}</label><input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white" /></div>; }
function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) { return <div className="md:col-span-2"><label className="mb-2 block text-sm font-bold text-slate-800">{label}</label><textarea value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="min-h-24 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white" /></div>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) { return <div><label className="mb-2 block text-sm font-bold text-slate-800">{label}</label><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white">{options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>; }
function InfoLine({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-300"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-950">{value}</p></div>; }
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white p-8 shadow-2xl"><div className="mb-6 flex items-center justify-between gap-4"><h2 className="text-2xl font-extrabold text-slate-950">{title}</h2><button onClick={onClose} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Close</button></div>{children}</div></div>; }
function HistoryList({ transfers, getPersonName }: { transfers: Transfer[]; getPersonName: (id?: string | null) => string }) { if (transfers.length === 0) return <p className="mt-2 text-slate-700">No transfer history.</p>; return <div className="mt-3 grid gap-2">{transfers.map((t) => <div key={t.id} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-300"><p className="font-bold text-slate-900">{getPersonName(t.from_user_id)} → {getPersonName(t.to_user_id)}</p><p className="text-xs font-semibold text-slate-500">{new Date(t.transfer_date).toLocaleString("en-GB")}</p>{t.remarks && <p className="text-sm text-slate-700">{t.remarks}</p>}</div>)}</div>; }
function ComplaintMiniList({ complaints }: { complaints: Complaint[] }) { if (complaints.length === 0) return <p className="mt-2 text-slate-700">No complaints for this laptop.</p>; return <div className="mt-3 grid gap-2">{complaints.map((c) => <div key={c.id} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-300"><p className="font-bold text-slate-900">{c.subject}</p><p className="text-sm text-slate-700">{c.description}</p><p className="text-xs font-semibold text-slate-500">Status: {c.status} | Priority: {c.priority}</p></div>)}</div>; }
