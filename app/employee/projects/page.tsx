"use client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useRequireRole } from "@/lib/firebase/hooks/useAuth";
import { useProjects } from "@/lib/firebase/hooks/useProjects";
import { useEmployeeByEmail } from "@/lib/firebase/hooks/useEmployees";
import { getCurrentUser as getLocalUser } from "@/lib/auth";
import { useEffect, useMemo, useState } from "react";

export default function EmployeeMyProjectsPage() {
  const { user, userProfile, loading } = useRequireRole("employee", "/");
  const [localUser, setLocalUser] = useState<any>(null);
  useEffect(() => { setLocalUser(getLocalUser()); }, []);
  const email = userProfile?.email || user?.email || localUser?.email || undefined;
  const { employee } = useEmployeeByEmail(email);
  const employeeDocId = employee?.id || user?.uid; // prefer employees doc id (equals uid), fallback to uid
  const shouldQuery = !!employeeDocId;
  const { projects, loading: projLoading } = useProjects(100, shouldQuery ? employeeDocId : undefined);

  const isLoading = loading || projLoading || (email !== undefined && !employeeDocId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">My Projects</h1>
        <p className="text-sm text-slate-600">Projects assigned to you.</p>
      </div>

      <Card>
        <CardHeader title="Assigned Projects" />
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-slate-500">Loading projects...</div>
          ) : (projects || []).length === 0 ? (
            <div className="text-sm text-slate-500">No projects assigned yet.</div>
          ) : (
            <div className="space-y-2">
              {projects.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-900">{p.name}</div>
                    <div className="truncate text-xs text-slate-500">{p.status} • {p.startDate || "—"} → {p.endDate || "—"}</div>
                    {p.description && (
                      <div className="mt-1 line-clamp-2 text-xs text-slate-600">{p.description}</div>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">Team: {p.employeeIds?.length || 0}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


