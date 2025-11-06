"use client";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRequireRole } from "@/lib/firebase/hooks/useAuth";
import { useAllLeaveRequests } from "@/lib/firebase/hooks/useLeaves";
import { useEmployees } from "@/lib/firebase/hooks/useEmployees";
import { updateLeaveStatus, LeaveRequestDoc } from "@/lib/firebase/services/leaves";
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
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  
  const { data: leaves, loading, error } = useAllLeaveRequests(
    200,
    (statusFilter || undefined) as "Pending" | "Approved" | "Rejected" | undefined
  );
  const { employees } = useEmployees({ isActive: true });

  // Create employee email to name map
  const employeeMap = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((emp) => {
      if (emp.email) {
        map.set(emp.email.toLowerCase(), emp.name || emp.email);
      }
    });
    return map;
  }, [employees]);

  // Get employee name from email
  const getEmployeeName = (email: string) => {
    return employeeMap.get(email.toLowerCase()) || email;
  };

  const handleApprove = async (leaf: LeaveRequestDoc & { id: string }) => {
    if (!leaf.id) return;
    setProcessingId(leaf.id);
    setErr(null);
    try {
      // Update status first
      await updateLeaveStatus(leaf.id, "Approved");
      // Calculate working days and deduct leave balance
      const days = workingDaysInclusive(leaf.from, leaf.to);
      const key = (leaf.type || "Casual").toLowerCase() as "casual" | "sick" | "privilege";
      await adjustLeaveBalanceByEmail(leaf.employeeId, key, -days);
    } catch (e: any) {
      setErr(e?.message || "Failed to approve leave");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (leaf: LeaveRequestDoc & { id: string }) => {
    if (!leaf.id) return;
    setProcessingId(leaf.id);
    setErr(null);
    try {
      await updateLeaveStatus(leaf.id, "Rejected");
    } catch (e: any) {
      setErr(e?.message || "Failed to reject leave");
    } finally {
      setProcessingId(null);
    }
  };

  const sortedLeaves = useMemo(() => {
    // Sort by status (Pending first), then by date (newest first)
    return [...leaves].sort((a, b) => {
      if (a.status === "Pending" && b.status !== "Pending") return -1;
      if (a.status !== "Pending" && b.status === "Pending") return 1;
      // Compare dates (newest first)
      if (a.from > b.from) return -1;
      if (a.from < b.from) return 1;
      return 0;
    });
  }, [leaves]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Leave Requests</h1>
        <p className="text-sm text-slate-600">Review, approve or reject leave requests. Approved leaves automatically deduct from employee balance.</p>
      </div>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Error loading leave requests: {error.message}
        </div>
      )}

      <Card>
        <CardHeader title="All Leave Requests" />
        <CardContent>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-600">Filter by Status:</label>
              <select 
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200" 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div className="text-sm text-slate-500">
              {sortedLeaves.length} request{sortedLeaves.length !== 1 ? 's' : ''}
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">Loading leave requests...</div>
          ) : sortedLeaves.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No leave requests found.</div>
          ) : (
            <div className="space-y-3">
              {sortedLeaves.map((l) => {
                const days = workingDaysInclusive(l.from, l.to);
                const employeeName = getEmployeeName(l.employeeId);
                const isProcessing = processingId === l.id;
                const isPending = l.status === "Pending";

                return (
                  <div
                    key={l.id}
                    className={`rounded-lg border ${
                      l.status === "Pending"
                        ? "border-amber-200 bg-amber-50/30"
                        : l.status === "Approved"
                        ? "border-green-200 bg-green-50/30"
                        : "border-slate-200 bg-white"
                    } p-4 shadow-sm transition-all hover:shadow-md`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="font-semibold text-slate-900">{employeeName}</div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              l.status === "Approved"
                                ? "bg-green-100 text-green-700"
                                : l.status === "Rejected"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {l.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <span className="text-slate-500">Type:</span>{" "}
                            <span className="font-medium text-slate-900">{l.type}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">From:</span>{" "}
                            <span className="font-medium text-slate-900">{formatDate(l.from)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">To:</span>{" "}
                            <span className="font-medium text-slate-900">{formatDate(l.to)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Days:</span>{" "}
                            <span className="font-medium text-slate-900">{days} working day{days !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        {l.reason && (
                          <div className="text-sm">
                            <span className="text-slate-500">Reason:</span>{" "}
                            <span className="text-slate-700">{l.reason}</span>
                          </div>
                        )}
                        <div className="text-xs text-slate-400">
                          Employee: {l.employeeId}
                        </div>
                      </div>
                      {isPending && (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button
                            type="button"
                            onClick={() => handleApprove(l)}
                            disabled={isProcessing}
                            className="bg-green-600 text-white hover:bg-green-700"
                          >
                            {isProcessing ? "Processing..." : "Approve"}
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleReject(l)}
                            disabled={isProcessing}
                            className="bg-rose-600 text-white hover:bg-rose-700"
                          >
                            {isProcessing ? "Processing..." : "Reject"}
                          </Button>
                        </div>
                      )}
                      {!isPending && (
                        <div className="text-xs text-slate-400">
                          {l.status === "Approved" ? "✓ Leave balance deducted" : "Request processed"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

//
