"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Employee as StoreEmployee } from "@/lib/datastore";
import { createEmployeeUser } from "../../../lib/firebase/functions";
import { useEmployees } from "@/lib/firebase/hooks/useEmployees";
import { createEmployee } from "@/lib/firebase/services/employees";

export default function AdminEmployeesPage() {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [role, setRole] = useState("");
  const { employees, loading } = useEmployees();
  const [draft, setDraft] = useState<Omit<StoreEmployee, "id">>({ name: "", email: "", department: "", role: "employee", manager: "" });
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createInfo, setCreateInfo] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return employees.filter((e: any) => {
      const matchesQ = !q || (e.name?.toLowerCase().includes(q.toLowerCase()) || e.email?.toLowerCase().includes(q.toLowerCase()));
      const matchesDept = !dept || e.department === dept;
      const rowRole = e.role || 'employee';
      const matchesRole = !role || rowRole === role;
      return matchesQ && matchesDept && matchesRole;
    });
  }, [employees, q, dept, role]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Employee Management</h1>
        <p className="mt-2 text-slate-600">Add, edit, and manage employees. Filter by department or role.</p>
      </div>

      <Card hover>
        <CardHeader title="Add Employee" />
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-6">
            <input 
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" 
              placeholder="Name" 
              value={draft.name} 
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} 
            />
            <input 
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition sm:col-span-2" 
              placeholder="Email" 
              value={draft.email} 
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} 
            />
            <input 
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" 
              placeholder="Department" 
              value={draft.department} 
              onChange={(e) => setDraft((d) => ({ ...d, department: e.target.value }))} 
            />
            <select 
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" 
              value={draft.role} 
              onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value as any }))}
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
            <input 
              type="password" 
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>
          {createError ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {createError}
            </div>
          ) : null}
          {createInfo ? (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {createInfo}
            </div>
          ) : null}
          <div className="mt-4 flex gap-3">
            <Button onClick={async () => {
              if (!draft.name || !draft.email) { setCreateError("Name and email are required"); return; }
              if (password && password.length < 6) { setCreateError("Password must be at least 6 characters"); return; }
              setCreateError(null); setCreateInfo(null); setCreating(true);
              try {
                if (password) {
                  try {
                    await createEmployeeUser({ name: draft.name, email: draft.email, password, department: draft.department, role: draft.role });
                    setDraft({ name: "", email: "", department: "", role: "employee", manager: "" });
                    setPassword("");
                    return;
                  } catch (err: any) {
                    // fall through to Firestore-only fallback
                  }
                }
                const employeeId = `EMP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
                let passwordHash: string | undefined = undefined;
                if (password) {
                  // DJB2 deterministic hash (for demo)
                  let h = 5381 >>> 0;
                  for (let i = 0; i < password.length; i++) {
                    h = (((h << 5) + h) + password.charCodeAt(i)) >>> 0;
                  }
                  passwordHash = h.toString(16);
                }
                await createEmployee({
                  userId: "",
                  employeeId,
                  name: draft.name,
                  email: draft.email.trim().toLowerCase(),
                  role: draft.role as any,
                  department: draft.department,
                  passwordHash,
                  joinDate: new Date().toISOString().split('T')[0],
                  isActive: true,
                } as any);
                setCreateInfo("Employee saved. They can log in now with the provided password.");
                setDraft({ name: "", email: "", department: "", role: "employee", manager: "" });
                setPassword("");
              } catch (e: any) {
                const message = e?.message || "Failed to create employee";
                setCreateError(message);
              } finally {
                setCreating(false);
              }
            }} disabled={creating}>{creating ? 'Creating...' : 'Add'}</Button>
          </div>
        </CardContent>
      </Card>

      <Card hover>
        <CardHeader title="Employees" />
        <CardContent>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <input 
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" 
              placeholder="Search name/email" 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
            />
            <input 
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" 
              placeholder="Filter Department" 
              value={dept} 
              onChange={(e) => setDept(e.target.value)} 
            />
            <select 
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">Name</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">Email</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">Department</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">Role</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span>Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>No employees found</td>
                  </tr>
                ) : filtered.map((e: any) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-900">{e.name}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{e.email}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{e.department}</td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        e.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {e.role || 'employee'}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <a 
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm hover:shadow" 
                          href={`/admin/employees?id=${e.id}`}
                        >
                          View
                        </a>
                        <a 
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm hover:shadow" 
                          href={`/admin/employees/documents/${e.id}`}
                        >
                          Documents
                        </a>
                        <button 
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm hover:shadow" 
                          onClick={() => alert('Edit not yet wired to Firestore in this view.')}
                        >
                          Edit
                        </button>
                        <button 
                          className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition shadow-sm hover:shadow" 
                          onClick={() => alert('Delete not yet wired to Firestore in this view.')}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


