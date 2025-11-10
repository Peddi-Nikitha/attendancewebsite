"use client";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEmployeeDocuments, useUploadEmployeeDocument, useDeleteEmployeeDocument } from "@/lib/firebase/hooks/useEmployeeDocuments";
import { useState } from "react";

export default function AdminEmployeeDocumentsPage() {
  const params = useParams() as { id: string };
  const employeeId = params?.id;
  const { docs, loading, refresh } = useEmployeeDocuments(employeeId);
  const { mutate: uploadDoc, isLoading: uploading } = useUploadEmployeeDocument();
  const { mutate: deleteDoc, isLoading: deleting } = useDeleteEmployeeDocument();

  const [open, setOpen] = useState(false);
  const [documentType, setDocumentType] = useState<string>("");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const documentTypes = [
    { value: "qualifications", label: "Qualifications" },
    { value: "experience", label: "Experience" },
    { value: "passport", label: "Passport" },
    { value: "cos", label: "Cos" },
    { value: "other", label: "Other" },
  ];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setInfo(null);
    try {
      if (!employeeId) throw new Error("Missing employee id");
      if (!file) throw new Error("Choose a file");
      if (!documentType) throw new Error("Please select a document type");
      
      const documentTypeLabel = documentTypes.find(dt => dt.value === documentType)?.label || documentType;
      const finalName = name || `${documentTypeLabel} - ${file.name}`;
      
      await uploadDoc(employeeId, finalName, file);
      setInfo("Document uploaded"); 
      setOpen(false); 
      setDocumentType(""); 
      setName(""); 
      setFile(null); 
      await refresh();
    } catch (e: any) { setError(e?.message || "Failed to upload"); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Employee Documents</h1>
        <p className="text-sm text-slate-600">Manage documents for this employee.</p>
      </div>

      <Card>
        <CardHeader title={employeeId} subtitle="Employee ID" />
        <CardContent>
          <div className="mb-3">
            <Button type="button" onClick={() => setOpen(true)}>Add Document</Button>
          </div>
          {loading ? (
            <div className="text-sm text-slate-500">Loading...</div>
          ) : (docs || []).length === 0 ? (
            <div className="text-sm text-slate-500">No documents yet.</div>
          ) : (
            <div className="space-y-2">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-900">{d.name}</div>
                    <a className="truncate text-xs text-blue-600" href={d.fileUrl} target="_blank" rel="noreferrer">{d.filePath}</a>
                    <div className="text-xs text-slate-500">Uploaded</div>
                  </div>
                  <Button type="button" className="bg-rose-50 text-rose-700 hover:bg-rose-100" disabled={deleting} onClick={async () => { await deleteDoc(d.id, d.filePath); await refresh(); }}>Delete</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-3 text-lg font-semibold text-slate-900">Add Document</div>
            {error && <div className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            {info && <div className="mb-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</div>}
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Document Type <span className="text-red-500">*</span></label>
                <select 
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  required
                >
                  <option value="">Select document type</option>
                  {documentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Document Name (Optional)</label>
                <input 
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g. Bachelor's Degree, Work Experience Letter" 
                />
                <p className="mt-1 text-xs text-slate-500">Leave empty to use document type + filename</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Upload File <span className="text-red-500">*</span></label>
                <input 
                  type="file" 
                  className="w-full text-sm" 
                  onChange={(e) => setFile(e.target.files?.[0] || null)} 
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button 
                  type="button" 
                  className="bg-slate-100 text-slate-800 hover:bg-slate-200" 
                  onClick={() => { 
                    setOpen(false); 
                    setDocumentType(""); 
                    setName(""); 
                    setFile(null); 
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading}>{uploading ? "Uploading..." : "Save"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


