"use client";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEmployees } from "@/lib/firebase/hooks/useEmployees";
import { useAllPayslips, useGeneratePayslip, useUploadPayslip } from "@/lib/firebase/hooks/usePayslips";
import { FileText, Download, Calendar, Users, TrendingUp, Upload, Eye, X } from "lucide-react";

export default function AdminPayslipsPage() {
  const { employees, loading: employeesLoading } = useEmployees({ isActive: true });
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);

  // Get current month as default
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const { data: payslips, loading: payslipsLoading, error: payslipsError } = useAllPayslips({
    employeeId: selectedEmployee || undefined,
    month: selectedMonth || undefined,
  });

  const { mutate: generatePayslip, isLoading: generating } = useGeneratePayslip();
  const { mutate: uploadPayslip, isLoading: uploading } = useUploadPayslip();

  // Upload form state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadEmployee, setUploadEmployee] = useState("");
  const [uploadMonth, setUploadMonth] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Create employee map for quick lookup
  const employeeMap = useMemo(() => {
    const map = new Map();
    employees.forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  const handleGenerate = async () => {
    if (!selectedEmployee || !selectedMonth) {
      setGenerateError("Please select an employee and month");
      return;
    }

    setGenerateError(null);
    setGenerateSuccess(null);

    try {
      await generatePayslip(selectedEmployee, selectedMonth);
      setGenerateSuccess("Payslip generated successfully!");
      // Reset form
      setSelectedEmployee("");
      setSelectedMonth("");
    } catch (error: any) {
      setGenerateError(error.message || "Failed to generate payslip");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(null);

    if (!uploadEmployee || !uploadMonth || !uploadFile) {
      setUploadError("Please select an employee, month, and file");
      return;
    }

    try {
      await uploadPayslip(uploadEmployee, uploadMonth, uploadFile);
      setUploadSuccess("Payslip uploaded successfully!");
      setUploadOpen(false);
      setUploadEmployee("");
      setUploadMonth("");
      setUploadFile(null);
    } catch (error: any) {
      setUploadError(error.message || "Failed to upload payslip");
    }
  };

  const handlePreview = (fileUrl: string) => {
    setPreviewUrl(fileUrl);
  };

  const closePreview = () => {
    setPreviewUrl(null);
  };

  // Format month for display
  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Payslips / Payroll</h1>
        <p className="mt-2 text-slate-600">Generate payslips from attendance & leaves, download or print.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card hover>
          <CardHeader 
            title="Generate Payslip" 
            icon={<FileText className="text-blue-600" size={20} />}
          />
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Employee</label>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  disabled={employeesLoading}
                >
                  <option value="">Select Employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Month</label>
                <input
                  type="month"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  value={selectedMonth || currentMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
              <Button
                onClick={handleGenerate}
                disabled={!selectedEmployee || !selectedMonth || generating || employeesLoading}
                className="w-full"
              >
                {generating ? "Generating..." : "Generate Payslip"}
              </Button>
              {generateError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {generateError}
                </div>
              )}
              {generateSuccess && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {generateSuccess}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardHeader 
            title="Upload Payslip" 
            icon={<Upload className="text-green-600" size={20} />}
          />
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Upload a PDF payslip file for an employee.</p>
              <Button
                onClick={() => setUploadOpen(true)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Upload className="mr-2" size={16} />
                Upload Payslip
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {payslipsError && (
        <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50 px-6 py-4 shadow-sm">
          {payslipsError.message?.includes("index") || payslipsError.message?.includes("create_composite") ? (
            <div className="space-y-3">
              <p className="font-semibold text-amber-900">Firestore Index Required</p>
              <p className="text-sm text-amber-800">
                To display payslips efficiently, please create a Firestore index. 
                The data will still load using a fallback method, but creating the index will improve performance.
              </p>
              {(() => {
                const urlMatch = payslipsError.message.match(/https:\/\/[^\s\)]+/);
                const indexUrl = urlMatch ? urlMatch[0] : null;
                return indexUrl ? (
                  <a
                    href={indexUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition shadow-sm hover:shadow"
                  >
                    Create Index Now
                  </a>
                ) : null;
              })()}
            </div>
          ) : (
            <div className="text-amber-800">
              Error loading payslips: {payslipsError.message}
            </div>
          )}
        </div>
      )}

      <Card hover>
        <CardHeader 
          title="Payslips" 
          icon={<TrendingUp className="text-blue-600" size={20} />}
        />
        <CardContent>
          {payslipsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-slate-500">Loading payslips...</p>
              </div>
            </div>
          ) : payslips.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText size={48} className="mx-auto mb-4 text-slate-300" />
              <p>No payslips found. Generate a payslip to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">Employee</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">Month</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">Basic</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">Allowances</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">Deductions</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">Overtime</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">Net Pay</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">Status</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">Type</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((p) => {
                    const emp = employeeMap.get(p.employeeId);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-900">
                          {emp?.name || p.employeeEmail || p.employeeId}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                          {p.monthName || formatMonth(p.month)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                          ₹ {p.basic.toLocaleString()}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                          ₹ {p.allowances.toLocaleString()}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 text-red-600">
                          ₹ {p.deductions.toLocaleString()}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 text-green-600">
                          ₹ {p.overtime.toLocaleString()}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 font-bold text-slate-900">
                          ₹ {p.netPay.toLocaleString()}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            p.status === 'paid' ? 'bg-green-100 text-green-700' :
                            p.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                            p.status === 'generated' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            p.isUploaded ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {p.isUploaded ? 'Uploaded' : 'Generated'}
                          </span>
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          <div className="flex items-center gap-2">
                            {p.isUploaded && p.fileUrl ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePreview(p.fileUrl!)}
                                >
                                  <Eye size={14} className="mr-1" />
                                  Preview
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(p.fileUrl, '_blank')}
                                >
                                  <Download size={14} className="mr-1" />
                                  Download
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // TODO: Implement PDF generation and download
                                  alert("PDF download functionality coming soon!");
                                }}
                              >
                                <Download size={14} className="mr-1" />
                                Generate PDF
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Upload Payslip</h2>
              <button
                onClick={() => {
                  setUploadOpen(false);
                  setUploadError(null);
                  setUploadSuccess(null);
                  setUploadEmployee("");
                  setUploadMonth("");
                  setUploadFile(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            {uploadError && (
              <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {uploadError}
              </div>
            )}
            {uploadSuccess && (
              <div className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {uploadSuccess}
              </div>
            )}
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Employee <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={uploadEmployee}
                  onChange={(e) => setUploadEmployee(e.target.value)}
                  disabled={employeesLoading}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Month <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={uploadMonth || currentMonth}
                  onChange={(e) => setUploadMonth(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Payslip File (PDF) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="w-full text-sm"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  required
                />
                {uploadFile && (
                  <p className="mt-1 text-xs text-slate-500">Selected: {uploadFile.name}</p>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  className="bg-slate-100 text-slate-800 hover:bg-slate-200"
                  onClick={() => {
                    setUploadOpen(false);
                    setUploadError(null);
                    setUploadSuccess(null);
                    setUploadEmployee("");
                    setUploadMonth("");
                    setUploadFile(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!uploadEmployee || !uploadMonth || !uploadFile || uploading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="relative w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Payslip Preview</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(previewUrl, '_blank')}
                >
                  <Download size={14} className="mr-1" />
                  Download
                </Button>
                <button
                  onClick={closePreview}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-4">
              <iframe
                src={previewUrl}
                className="h-[80vh] w-full rounded-lg border border-slate-200"
                title="Payslip Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


