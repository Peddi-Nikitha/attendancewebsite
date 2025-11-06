"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCreateLeaveRequest, useEmployeeLeaveRequests } from "@/lib/firebase/hooks/useLeaves";
import type { LeaveType } from "@/lib/firebase/services/leaves";
import { useEmployeeByEmail } from "@/lib/firebase/hooks/useEmployees";

export default function EmployeeLeavePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [form, setForm] = useState<{ type: LeaveType; reason: string; from: string; to: string }>({
    type: "Casual",
    reason: "",
    from: "",
    to: "",
  });
  
  // Function to update user from localStorage
  const updateUser = () => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setLoading(false);
  };
  
  // Get user from localStorage on mount
  useEffect(() => {
    updateUser();
  }, []);
  
  // Listen to storage changes (when user logs in/out in another tab or after redirect)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "attendance_auth_user") {
        updateUser();
      }
    };
    
    // Custom event for same-tab changes
    const handleCustomStorageChange = () => {
      updateUser();
    };
    
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageChange", handleCustomStorageChange);
    
    // Also check periodically in case of same-tab logout/login
    const interval = setInterval(() => {
      const user = getCurrentUser();
      if ((user?.email || null) !== (currentUser?.email || null)) {
        updateUser();
      }
    }, 2000);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageChange", handleCustomStorageChange);
      clearInterval(interval);
    };
  }, [currentUser?.email]);
  
  // Also check when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      updateUser();
    };
    
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);
  
  const userId = currentUser?.email; // Use email as unique identifier
  const { data: leaveRequests, loading: requestsLoading, error } = useEmployeeLeaveRequests(userId, 50);
  const { mutate: createLeave, loading: createLoading, error: createError, success: createSuccess, reset: resetCreate } = useCreateLeaveRequest();
  const { employee, loading: employeeLoading } = useEmployeeByEmail(userId);
  
  // Get leave balance with defaults
  const leaveBalance = employee?.leaveBalance || {
    casual: 0,
    sick: 0,
    privilege: 0,
  };

  useEffect(() => {
    // Check localStorage auth - redirect if not authenticated or not an employee
    if (!loading) {
      if (!currentUser || currentUser.role !== "employee") {
        router.replace("/login");
      }
    }
  }, [loading, currentUser, router]);

  // Reset form and show success message
  useEffect(() => {
    if (createSuccess) {
      setForm({ type: "Casual", reason: "", from: "", to: "" });
      resetCreate();
    }
  }, [createSuccess, resetCreate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      return;
    }
    
    // Validation
    if (!form.from || !form.to) {
      return;
    }
    
    // Check if from date is before to date
    if (new Date(form.from) > new Date(form.to)) {
      alert("Start date must be before or equal to end date");
      return;
    }
    
    // Check if dates are in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fromDate = new Date(form.from);
    if (fromDate < today) {
      alert("Leave dates cannot be in the past");
      return;
    }
    
    await createLeave(userId, form.type, form.from, form.to, form.reason || undefined);
  };

  const isLoading = loading || requestsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Leave</h1>
        <p className="text-sm text-slate-600">Apply Leave (Type, Reason, Date Range) and track statuses.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          {error.message?.includes("index") || error.message?.includes("create_composite") ? (
            <div className="space-y-2">
              <p className="font-medium text-amber-800">Firestore Index Required</p>
              <p className="text-amber-700">
                To display leave requests efficiently, please create a Firestore index. 
                The data will still load using a fallback method, but creating the index will improve performance.
              </p>
            </div>
          ) : (
            <div className="text-red-700">Error loading leave requests: {error.message}</div>
          )}
        </div>
      )}

      {createError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error submitting leave request: {createError.message}
        </div>
      )}

      {createSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Leave request submitted successfully!
        </div>
      )}

      {/* Leave Balance Display */}
      <Card>
        <CardHeader title="Leave Balance" />
        <CardContent>
          {employeeLoading ? (
            <div className="text-sm text-slate-500">Loading balance...</div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
                <div className="text-xs text-slate-500 mb-1">Casual Leave</div>
                <div className="text-2xl font-semibold text-slate-900">{leaveBalance.casual}</div>
                <div className="text-xs text-slate-400 mt-1">days</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
                <div className="text-xs text-slate-500 mb-1">Sick Leave</div>
                <div className="text-2xl font-semibold text-slate-900">{leaveBalance.sick}</div>
                <div className="text-xs text-slate-400 mt-1">days</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
                <div className="text-xs text-slate-500 mb-1">Privilege Leave</div>
                <div className="text-2xl font-semibold text-slate-900">{leaveBalance.privilege}</div>
                <div className="text-xs text-slate-400 mt-1">days</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Apply Leave" />
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Type</label>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as LeaveType }))}
                  disabled={createLoading}
                  required
                >
                  <option value="Casual">Casual</option>
                  <option value="Sick">Sick</option>
                  <option value="Privilege">Privilege</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Reason</label>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Optional"
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  disabled={createLoading}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">From</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={form.from}
                    onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
                    disabled={createLoading}
                    required
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">To</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={form.to}
                    onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
                    disabled={createLoading}
                    required
                    min={form.from || new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>
              <Button type="submit" disabled={createLoading || !userId}>
                {createLoading ? "Submitting..." : "Submit"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Status Tracking" />
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-sm text-slate-500">
                Loading leave requests...
              </div>
            ) : leaveRequests.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                No leave requests found.
              </div>
            ) : (
              <div className="space-y-3">
                {leaveRequests.map((l) => {
                  // Format date for display
                  const formatDate = (dateStr: string) => {
                    const date = new Date(dateStr + "T00:00:00");
                    return date.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                  };

                  // Calculate working days
                  const calculateWorkingDays = (from: string, to: string) => {
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
                  };

                  const days = calculateWorkingDays(l.from, l.to);

                  return (
                    <div
                      key={l.id}
                      className={`rounded-lg border p-4 shadow-sm transition-all hover:shadow-md ${
                        l.status === "Pending"
                          ? "border-amber-200 bg-amber-50/30"
                          : l.status === "Approved"
                          ? "border-green-200 bg-green-50/30"
                          : "border-rose-200 bg-rose-50/30"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="font-semibold text-slate-900">{l.type} Leave</div>
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
                          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <span className="text-slate-500">From:</span>{" "}
                              <span className="font-medium text-slate-900">{formatDate(l.from)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">To:</span>{" "}
                              <span className="font-medium text-slate-900">{formatDate(l.to)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Duration:</span>{" "}
                              <span className="font-medium text-slate-900">{days} working day{days !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          {l.reason && (
                            <div className="text-sm">
                              <span className="text-slate-500">Reason:</span>{" "}
                              <span className="text-slate-700">{l.reason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


