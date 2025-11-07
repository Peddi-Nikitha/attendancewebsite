"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useRequireRole } from "@/lib/firebase/hooks/useAuth";
import { useEmployeeByUserId, useEmployeeByEmail } from "@/lib/firebase/hooks/useEmployees";
import { useEmployeeDocuments } from "@/lib/firebase/hooks/useEmployeeDocuments";
import { getCurrentUser as getLocalUser } from "@/lib/auth";
import { FileText, Download, Calendar } from "lucide-react";

export default function EmployeeDocumentsPage() {
  const { user, userProfile, loading: authLoading } = useRequireRole("employee", "/");
  const [localUser, setLocalUser] = useState<any>(null);
  
  useEffect(() => {
    setLocalUser(getLocalUser());
  }, []);

  // Get employee document to find the employeeId (employees collection doc ID)
  const { employee: employeeById } = useEmployeeByUserId(user?.uid);
  const effectiveEmail = userProfile?.email || user?.email || localUser?.email || undefined;
  const { employee: employeeByEmail } = useEmployeeByEmail(effectiveEmail);
  
  // The employeeId is the employees collection document ID
  // This is what admin uses when uploading documents
  const employee = employeeById || employeeByEmail;
  const employeeDocId = employee?.id || user?.uid; // employees collection doc ID
  
  // Fetch documents for this employee
  const { docs, loading: docsLoading, error } = useEmployeeDocuments(employeeDocId);

  const isLoading = authLoading || docsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">My Documents</h1>
        <p className="text-sm text-slate-600">View and download your documents uploaded by admin.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Error loading documents: {error.message}
        </div>
      )}

      <Card>
        <CardHeader title="Documents" subtitle={employeeDocId ? `Employee ID: ${employeeDocId}` : "Loading..."} />
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-slate-500">Loading documents...</div>
          ) : (docs || []).length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-slate-400 mb-3" />
              <p className="text-sm text-slate-500">No documents available yet.</p>
              <p className="text-xs text-slate-400 mt-1">Documents uploaded by admin will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="flex-shrink-0 p-2 bg-blue-50 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-slate-900 mb-1">{doc.name}</h3>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        {doc.uploadedAt && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {doc.uploadedAt.toDate ? 
                                doc.uploadedAt.toDate().toLocaleDateString() : 
                                "Unknown date"
                              }
                            </span>
                          </div>
                        )}
                        <span className="truncate text-slate-400">{doc.filePath.split('/').pop()}</span>
                      </div>
                    </div>
                  </div>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors flex-shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

