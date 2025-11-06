"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/hooks/useAuth";
import { useEmployees } from "@/lib/firebase/hooks/useEmployees";
import { useAllAttendanceRecords } from "@/lib/firebase/hooks/useAttendance";
import { useAllLeaveRequests } from "@/lib/firebase/hooks/useLeaves";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
 

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  // Get all employees (not just active) for total count
  const { employees, loading: employeesLoading, error: employeesError } = useEmployees();
  const { data: attendanceRecords, loading: attendanceLoading } = useAllAttendanceRecords(1000);
  const { data: allLeaves, loading: leavesLoading } = useAllLeaveRequests(200);

  useEffect(() => {
    const isStaticAdmin = (() => {
      try { return localStorage.getItem("staticAdmin") === "true"; } catch { return false; }
    })();

    if (!isStaticAdmin) {
      if (!loading) {
        if (!userProfile || userProfile.role !== "admin") {
          router.replace("/login");
        }
      }
    }
  }, [router, loading, userProfile]);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // Calculate metrics from Firebase data
  // Show all employees for total count, not just active ones
  const totalEmployees = employees.length;
  
  // Debug: Log employees to console if needed
  useEffect(() => {
    if (!employeesLoading && employees.length === 0) {
      console.log('No employees found. Check:', {
        employeesLoading,
        employeesCount: employees.length,
        error: employeesError,
        filters: { isActive: true }
      });
    }
  }, [employees, employeesLoading, employeesError]);
  const todayLogs = useMemo(() => {
    return attendanceRecords.filter((l) => l.date === today);
  }, [attendanceRecords, today]);
  
  const present = useMemo(() => {
    return todayLogs.filter((l) => l.checkIn && l.checkOut).length;
  }, [todayLogs]);
  
  const late = useMemo(() => {
    return todayLogs.filter((l) => l.checkIn && !l.checkOut).length;
  }, [todayLogs]);
  
  const absent = Math.max(0, totalEmployees - (present + late));
  
  const activeLeaves = useMemo(() => {
    return allLeaves.filter((l) => l.status === "Approved").length;
  }, [allLeaves]);
  
  const pendingApprovals = useMemo(() => {
    return allLeaves.filter((l) => l.status === "Pending").length;
  }, [allLeaves]);

  const monthlyData = useMemo(() => {
    // build last 12 months counts of present days across all employees
    const arr: { name: string; value: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const count = attendanceRecords.filter((l) => l.date.startsWith(key) && l.checkIn && l.checkOut).length;
      arr.push({ name: d.toLocaleString(undefined, { month: "short" }), value: count });
    }
    return arr;
  }, [attendanceRecords]);
 

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-neutral-500">Manage employees, attendance, payroll and more</p>
        </div>
      </div>

      {employeesError && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          {employeesError.message?.includes("index") || employeesError.message?.includes("create_composite") ? (
            <div className="space-y-2">
              <p className="font-medium text-amber-800">Firestore Index Required</p>
              <p className="text-amber-700">
                To display employees efficiently, please create a Firestore index. 
                The data will still load using a fallback method, but creating the index will improve performance.
              </p>
              {(() => {
                const urlMatch = employeesError.message.match(/https:\/\/[^\s\)]+/);
                const indexUrl = urlMatch ? urlMatch[0] : null;
                return indexUrl ? (
                  <a
                    href={indexUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
                  >
                    Create Index Now
                  </a>
                ) : null;
              })()}
            </div>
          ) : (
            <div className="text-amber-700">
              Error loading employees: {employeesError.message}
            </div>
          )}
        </div>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader title="Total Employees" />
          <CardContent>
            <div className="text-3xl font-semibold">
              {employeesLoading ? "..." : totalEmployees}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Today's Attendance" />
          <CardContent>
            {attendanceLoading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : (
              <>
                <div className="text-sm">Present: <span className="font-semibold text-green-600">{present}</span></div>
                <div className="text-sm">Absent: <span className="font-semibold text-rose-600">{absent}</span></div>
                <div className="text-sm">Late/Ongoing: <span className="font-semibold text-amber-600">{late}</span></div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Active Leaves" />
          <CardContent>
            <div className="text-3xl font-semibold">
              {leavesLoading ? "..." : activeLeaves}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Pending Approvals" />
          <CardContent>
            <div className="text-3xl font-semibold">
              {leavesLoading ? "..." : pendingApprovals}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Monthly Attendance Trend" />
          <CardContent>
            {attendanceLoading ? (
              <div className="h-56 flex items-center justify-center text-slate-500">
                Loading chart data...
              </div>
            ) : (
              <div className="h-56 w-full" style={{ minWidth: 0, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
                    <YAxis tick={{ fill: "#475569", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
                    <Tooltip cursor={{ stroke: "#93C5FD" }} />
                    <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Quick Actions" />
          <CardContent>
            <div className="space-y-4">
              {/* Other Quick Actions */}
              <div className="grid gap-3">
                <a href="/admin/employees" className="rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white">Add Employee</a>
                <a href="/admin/payslips" className="rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white">Generate Payslip</a>
                <a href="/admin/reports" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-center text-sm">View Reports</a>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}


