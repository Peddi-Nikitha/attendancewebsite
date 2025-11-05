"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRequireRole } from "@/lib/firebase/hooks/useAuth";
import { useProjects, useCreateProject, useDeleteProject } from "@/lib/firebase/hooks/useProjects";
import { useEmployees } from "@/lib/firebase/hooks/useEmployees";

type ProjectForm = {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: "planned" | "active" | "on-hold" | "completed" | "cancelled";
  employeeIds: string[];
};

export default function AdminProjectsPage() {
  useRequireRole("admin", "/");
  const { projects, loading } = useProjects(100);
  // Fetch all employees (no filters) to ensure list isn't empty due to missing flags
  const { employees } = useEmployees();
  const { mutate: createProject, isLoading: creating } = useCreateProject();
  const { mutate: deleteProject, isLoading: deleting } = useDeleteProject();

  const [query, setQuery] = useState("");
  const [form, setForm] = useState<ProjectForm>({ name: "", description: "", startDate: "", endDate: "", status: "planned", employeeIds: [] });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const filteredEmployees = useMemo(() => {
    if (!query) return employees || [];
    const q = query.toLowerCase();
    return (employees || []).filter((e) =>
      (e.name || "").toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q) ||
      (e.department || "").toLowerCase().includes(q)
    );
  }, [employees, query]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      if (!form.name.trim()) throw new Error("Project name is required");
      await createProject({
        name: form.name.trim(),
        description: form.description?.trim() || "",
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        status: form.status,
        employeeIds: form.employeeIds,
        createdAt: undefined as any,
        updatedAt: undefined as any,
        id: "" as any,
      } as any);
      setMsg("Project created");
      setForm({ name: "", description: "", startDate: "", endDate: "", status: "planned", employeeIds: [] });
    } catch (e: any) {
      setErr(e?.message || "Failed to create project");
    }
  }

  function toggleEmployee(id: string) {
    setForm((f) => {
      const set = new Set(f.employeeIds);
      if (set.has(id)) set.delete(id); else set.add(id);
      return { ...f, employeeIds: Array.from(set) };
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
        <p className="text-sm text-slate-600">Create projects and assign multiple employees.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader title="Create Project" />
          <CardContent>
            <form onSubmit={onCreate} className="space-y-3">
              {msg && <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</div>}
              {err && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Project Name</label>
                <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
                <textarea className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Start Date</label>
                  <input type="date" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">End Date</label>
                  <input type="date" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
                  <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}>
                    <option value="planned">Planned</option>
                    <option value="active">Active</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600">Assign Employees</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAssignOpen((o) => !o)}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm shadow-sm"
                  >
                    <span className="truncate">
                      {form.employeeIds.length === 0 ? "Select employees" : `${form.employeeIds.length} selected`}
                    </span>
                    <span className="text-slate-400">▾</span>
                  </button>
                  {assignOpen && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-72 flex flex-col">
                      <div className="border-b p-2">
                        <input
                          autoFocus
                          placeholder="Search employees..."
                          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </div>
                      <div className="flex-1 overflow-auto p-1">
                        {(filteredEmployees || []).map((e) => (
                          <label key={e.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={form.employeeIds.includes(e.id)}
                              onChange={() => toggleEmployee(e.id)}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-slate-700">{e.name || e.email || e.employeeId}</div>
                              <div className="truncate text-xs text-slate-500">{e.email || e.employeeId}</div>
                            </div>
                            <span className="ml-2 text-xs text-slate-500">{e.department}</span>
                          </label>
                        ))}
                        {(filteredEmployees || []).length === 0 && (
                          <div className="p-2 text-xs text-slate-500">No employees</div>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-2 border-t p-2 bg-white">
                        <Button type="button" className="bg-slate-100 text-slate-800 hover:bg-slate-200" onClick={() => setAssignOpen(false)}>Done</Button>
                      </div>
                    </div>
                  )}
                </div>
                {form.employeeIds.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.employeeIds.map((id) => {
                      const emp = (employees || []).find((x) => x.id === id);
                      const primary = emp?.name || emp?.email || id;
                      const secondary = emp?.email && emp?.name ? ` (${emp.email})` : "";
                      return (
                        <span key={id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
                          {primary}{secondary}
                          <button type="button" onClick={() => toggleEmployee(id)} className="text-slate-500">×</button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button type="submit" disabled={creating}>{creating ? "Creating..." : "Create Project"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Projects List" />
          <CardContent>
            {loading ? (
              <div className="text-sm text-slate-500">Loading projects...</div>
            ) : (
              <div className="space-y-2">
                {(projects || []).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
                    <div>
                      <div className="font-medium text-slate-900">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.status} • {p.startDate || "—"} → {p.endDate || "—"}</div>
                      <div className="text-xs text-slate-500">Members: {p.employeeIds?.length || 0}</div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <Button type="button" className="bg-rose-50 text-rose-700 hover:bg-rose-100" disabled={deleting} onClick={() => deleteProject(p.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
                {(projects || []).length === 0 && (
                  <div className="text-sm text-slate-500">No projects yet.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


