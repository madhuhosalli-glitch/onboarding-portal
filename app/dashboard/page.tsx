"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type UploadedDoc = {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
};

const ADMIN_EMAIL = "ca.madhuhegde@gmail.com";

export default function DashboardPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [status, setStatus] = useState("Pending");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const [fullName, setFullName] = useState("");
  const [pan, setPan] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [joiningDate, setJoiningDate] = useState("");

  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<{
    pan_copy?: string;
    aadhaar_copy?: string;
    photo?: string;
  }>({});

  const isAdmin =
    userEmail.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase();

  const loadDocuments = async (uid: string) => {
    const { data, error } = await supabase
      .from("employee_documents")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Error loading documents: " + error.message);
      return;
    }

    setDocuments(data || []);
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.push("/login");
        return;
      }

      const uid = data.user.id;
      setUserId(uid);
      setUserEmail(data.user.email || "");

      const { data: profile } = await supabase
        .from("employee_profiles")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();

      if (profile) {
        setFullName(profile.full_name || "");
        setPan(profile.pan || "");
        setAadhaar(profile.aadhaar || "");
        setBankName(profile.bank_name || "");
        setAccountNumber(profile.account_number || "");
        setIfscCode(profile.ifsc_code || "");
        setJoiningDate(profile.joining_date || "");
        setStatus(profile.status || "Pending");
      }

      await loadDocuments(uid);
      setLoading(false);
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("employee_profiles").upsert(
      {
        user_id: userId,
        full_name: fullName,
        pan,
        aadhaar,
        bank_name: bankName,
        account_number: accountNumber,
        ifsc_code: ifscCode,
        joining_date: joiningDate || null,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      setMessage("Error saving data: " + error.message);
    } else {
      setMessage("Profile saved successfully.");
    }

    setSaving(false);
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    documentType: string
  ) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setSelectedFiles((prev) => ({
      ...prev,
      [documentType]: file.name,
    }));

    setUploading(true);
    setMessage("");

    const fileExt = file.name.split(".").pop();
    const filePath = `${userId}/${documentType}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("employee-documents")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      setMessage("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from("employee_documents").upsert(
      {
        user_id: userId,
        document_type: documentType,
        file_name: file.name,
        file_path: filePath,
      },
      { onConflict: "user_id,document_type" }
    );

    if (dbError) {
      setMessage("Database error after upload: " + dbError.message);
      setUploading(false);
      return;
    }

    await loadDocuments(userId);
    setMessage(`${documentType.replace("_", " ")} uploaded successfully.`);
    setUploading(false);
  };

  const handleViewDocument = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from("employee-documents")
      .download(filePath);

    if (error) {
      setMessage("Unable to open file: " + error.message);
      return;
    }

    if (!data) {
      setMessage("Unable to download file.");
      return;
    }

    const fileUrl = URL.createObjectURL(data);
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  const getStatusStyle = (currentStatus: string) => {
    if (currentStatus === "Approved") {
      return "bg-green-100 text-green-900 ring-green-200";
    }
    if (currentStatus === "Rejected") {
      return "bg-red-100 text-red-900 ring-red-200";
    }
    if (currentStatus === "Under Review") {
      return "bg-amber-100 text-amber-900 ring-amber-200";
    }
    return "bg-yellow-100 text-yellow-900 ring-yellow-200";
  };

  const getDocumentLabel = (docType: string) => {
    if (docType === "pan_copy") return "PAN Copy";
    if (docType === "aadhaar_copy") return "Aadhaar Copy";
    if (docType === "photo") return "Photo";
    return docType;
  };

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-300">
        <p className="text-slate-800">Loading...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-300">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">
            Employee Dashboard
          </h1>
          <p className="mt-2 text-slate-700">
            Fill in your details and upload your onboarding documents.
          </p>

          <p className="mt-2 text-sm font-semibold text-slate-600">
            Logged in as: {userEmail}
          </p>

          <p
            className={`mt-3 inline-block rounded-full px-4 py-1.5 text-sm font-bold ring-1 ${getStatusStyle(
              status
            )}`}
          >
            Current Status: {status || "Pending"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {isAdmin && (
            <button
              onClick={() => router.push("/admin")}
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white hover:bg-slate-800"
            >
              Admin Panel
            </button>
          )}
          <button
 	    onClick={() => router.push("/training")}
            className="rounded-xl bg-indigo-700 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-800"
            >
              Training Modules
            </button>
          <button
            onClick={handleLogout}
            className="rounded-xl bg-red-700 px-5 py-2 text-sm font-bold text-white hover:bg-red-800"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-300">
        <h2 className="mb-6 text-2xl font-bold text-slate-950">
          Employee Information Form
        </h2>

        <form onSubmit={handleSave} className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-bold text-slate-800">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
              placeholder="Enter full name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-800">
              PAN
            </label>
            <input
              type="text"
              value={pan}
              onChange={(e) => setPan(e.target.value.toUpperCase())}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
              placeholder="ABCDE1234F"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-800">
              Aadhaar
            </label>
            <input
              type="text"
              value={aadhaar}
              onChange={(e) => setAadhaar(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
              placeholder="Enter Aadhaar number"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-800">
              Bank Name
            </label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
              placeholder="Enter bank name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-800">
              Account Number
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
              placeholder="Enter account number"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-800">
              IFSC Code
            </label>
            <input
              type="text"
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
              placeholder="SBIN0001234"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-800">
              Joining Date
            </label>
            <input
              type="date"
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-blue-700 px-6 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save Details"}
            </button>

            {message && (
              <p className="text-sm font-semibold text-slate-800">{message}</p>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-300">
        <h2 className="mb-6 text-2xl font-bold text-slate-950">
          Upload Documents
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-300 p-5">
            <p className="mb-3 font-bold text-slate-950">PAN Copy</p>
            <label className="inline-block cursor-pointer rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
              Upload PAN
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e, "pan_copy")}
                className="hidden"
              />
            </label>
            {selectedFiles.pan_copy && (
              <p className="mt-3 text-sm font-medium text-slate-700">
                {selectedFiles.pan_copy}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-300 p-5">
            <p className="mb-3 font-bold text-slate-950">Aadhaar Copy</p>
            <label className="inline-block cursor-pointer rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
              Upload Aadhaar
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e, "aadhaar_copy")}
                className="hidden"
              />
            </label>
            {selectedFiles.aadhaar_copy && (
              <p className="mt-3 text-sm font-medium text-slate-700">
                {selectedFiles.aadhaar_copy}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-300 p-5">
            <p className="mb-3 font-bold text-slate-950">Photo</p>
            <label className="inline-block cursor-pointer rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
              Upload Photo
              <input
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e, "photo")}
                className="hidden"
              />
            </label>
            {selectedFiles.photo && (
              <p className="mt-3 text-sm font-medium text-slate-700">
                {selectedFiles.photo}
              </p>
            )}
          </div>
        </div>

        {uploading && (
          <p className="mt-4 text-sm font-semibold text-slate-700">
            Uploading document...
          </p>
        )}
      </div>

      <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-300">
        <h2 className="mb-4 text-2xl font-bold text-slate-950">
          Uploaded Documents
        </h2>

        {documents.length === 0 ? (
          <p className="text-slate-700">No documents uploaded yet.</p>
        ) : (
          <div className="grid gap-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-2xl border border-slate-300 px-4 py-3"
              >
                <div>
                  <p className="font-bold text-slate-950">
                    {getDocumentLabel(doc.document_type)}
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    {doc.file_name}
                  </p>
                </div>

                <button
                  onClick={() => handleViewDocument(doc.file_path)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                >
                  Open File
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
