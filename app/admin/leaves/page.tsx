"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRequireRole } from "@/lib/firebase/hooks/useAuth";
import { listenAllLeaveRequests, updateLeaveStatus, LeaveRequestDoc, LeaveType } from "@/lib/firebase/services/leaves";
import { adjustLeaveBalanceByEmail } from "@/lib/firebase/services/employees";

function workingDaysInclusive(from: string, to: string): number {
  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const wd = cur.getDay();
    if (wd !== 0 && wd !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(0, count);
}

export default function AdminLeavesPage() {
  useRequireRole("admin", "/");
  const [leaves, setLeaves] = useState<(LeaveRequestDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    setLoading(true); setErr(null);
    const unsub = listenAllLeaveRequests(
      (docs) => { setLeaves(docs); setLoading(false); },
      (e) => { setErr(e.message || "Failed to load leaves"); setLoading(false); },
      200,
      (statusFilter || undefined) as any
    );
    return () => unsub();
  }, [statusFilter]);

  async function approve(leaf: LeaveRequestDoc & { id: string }) {
    try {
      await updateLeaveStatus(leaf.id!, "Approved");
      const days = workingDaysInclusive(leaf.from, leaf.to);
      const key = (leaf.type || "Casual").toLowerCase() as "casual" | "sick" | "privilege";
      await adjustLeaveBalanceByEmail(leaf.employeeId, key, -days);
    } catch (e: any) {
      setErr(e?.message || "Failed to approve");
    }
  }

  async function reject(leaf: LeaveRequestDoc & { id: string }) {
    try { await updateLeaveStatus(leaf.id!, "Rejected"); } catch (e: any) { setErr(e?.message || "Failed to reject"); }
  }

  const filtered = useMemo(() => {
    if (!statusFilter) return leaves;
    return leaves.filter((l) => l.status === statusFilter);
  }, [leaves, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Leave Requests</h1>
        <p className="text-sm text-slate-600">Approve or reject and auto-deduct leave balance.</p>
      </div>

      <Card>
        <CardHeader title="All Leaves" />
        <CardContent>
          <div className="mb-3 flex items-center gap-2">
            <label className="text-xs text-slate-600">Filter:</label>
            <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          {err && <div className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          {loading ? (
            <div className="text-sm text-slate-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-slate-500">No leave requests.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-600">
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">Employee</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">Type</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">From</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">To</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">Days</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">Status</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => {
                    const days = workingDaysInclusive(l.from, l.to);
                    return (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="border-b border-slate-100 px-3 py-2">{l.employeeId}</td>
                        <td className="border-b border-slate-100 px-3 py-2">{l.type}</td>
                        <td className="border-b border-slate-100 px-3 py-2">{l.from}</td>
                        <td className="border-b border-slate-100 px-3 py-2">{l.to}</td>
                        <td className="border-b border-slate-100 px-3 py-2">{days}</td>
                        <td className="border-b border-slate-100 px-3 py-2">{l.status}</td>
                        <td className="border-b border-slate-100 px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" disabled={l.status !== 'Pending'} onClick={() => approve(l)}>Approve</Button>
                            <Button type="button" className="bg-rose-50 text-rose-700 hover:bg-rose-100" disabled={l.status !== 'Pending'} onClick={() => reject(l)}>Reject</Button>
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
    </div>
  );
}

//
