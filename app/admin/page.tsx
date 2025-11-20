"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/hooks/useAuth";
import { useEmployees } from "@/lib/firebase/hooks/useEmployees";
import { useAllAttendanceRecords } from "@/lib/firebase/hooks/useAttendance";
import { useAllLeaveRequests } from "@/lib/firebase/hooks/useLeaves";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { Users, ClipboardCheck, Leaf, Clock, TrendingUp, Plus, FileText, BarChart3 } from "lucide-react";
 

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
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
          <p className="mt-2 text-slate-600">Manage employees, attendance, payroll and more</p>
        </div>
      </div>

      {employeesError && (
        <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50 px-6 py-4 shadow-sm">
          {employeesError.message?.includes("index") || employeesError.message?.includes("create_composite") ? (
            <div className="space-y-3">
              <p className="font-semibold text-amber-900">Firestore Index Required</p>
              <p className="text-sm text-amber-800">
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
                    className="inline-block mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition shadow-sm hover:shadow"
                  >
                    Create Index Now
                  </a>
                ) : null;
              })()}
            </div>
          ) : (
            <div className="text-amber-800">
              Error loading employees: {employeesError.message}
            </div>
          )}
        </div>
      )}

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card hover>
          <CardHeader 
            title="Total Employees" 
            icon={<Users className="text-blue-600" size={20} />}
          />
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-slate-900">
                {employeesLoading ? "..." : totalEmployees}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Active workforce</p>
          </CardContent>
        </Card>
        <Card hover>
          <CardHeader 
            title="Today's Attendance" 
            icon={<ClipboardCheck className="text-green-600" size={20} />}
          />
          <CardContent>
            {attendanceLoading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Present</span>
                  <span className="font-bold text-green-600 text-lg">{present}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Absent</span>
                  <span className="font-bold text-red-600 text-lg">{absent}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Late/Ongoing</span>
                  <span className="font-bold text-amber-600 text-lg">{late}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card hover>
          <CardHeader 
            title="Active Leaves" 
            icon={<Leaf className="text-emerald-600" size={20} />}
          />
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-slate-900">
                {leavesLoading ? "..." : activeLeaves}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Currently on leave</p>
          </CardContent>
        </Card>
        <Card hover>
          <CardHeader 
            title="Pending Approvals" 
            icon={<Clock className="text-amber-600" size={20} />}
          />
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-slate-900">
                {leavesLoading ? "..." : pendingApprovals}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Awaiting review</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" hover>
          <CardHeader 
            title="Monthly Attendance Trend" 
            subtitle="Last 12 months"
            icon={<TrendingUp className="text-blue-600" size={20} />}
          />
          <CardContent>
            {attendanceLoading ? (
              <div className="h-64 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm">Loading chart data...</p>
                </div>
              </div>
            ) : (
              <div className="h-64 w-full" style={{ minWidth: 0, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: "#64748b", fontSize: 11 }} 
                      tickLine={false} 
                      axisLine={{ stroke: "#E2E8F0" }} 
                    />
                    <YAxis 
                      tick={{ fill: "#64748b", fontSize: 11 }} 
                      tickLine={false} 
                      axisLine={{ stroke: "#E2E8F0" }} 
                    />
                    <Tooltip 
                      cursor={{ stroke: "#93C5FD", strokeWidth: 1 }} 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #E2E8F0', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#2563eb" 
                      strokeWidth={3} 
                      dot={{ fill: "#2563eb", r: 4 }} 
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card hover>
          <CardHeader 
            title="Quick Actions" 
            icon={<BarChart3 className="text-blue-600" size={20} />}
          />
          <CardContent>
            <div className="space-y-3">
              <a 
                href="/admin-employees" 
                className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-center text-sm font-medium text-white shadow-md hover:shadow-lg transition-all"
              >
                <Plus size={16} />
                Add Employee
              </a>
              <a 
                href="/admin-payslips" 
                className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white shadow-md hover:shadow-lg transition-all"
              >
                <FileText size={16} />
                Generate Payslip
              </a>
              <a 
                href="/admin-reports" 
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all shadow-sm hover:shadow"
              >
                <BarChart3 size={16} />
                View Reports
              </a>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}


