"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/hooks/useAuth";
import { useDataStore } from "@/lib/datastore";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { useAttendanceToday, useCheckIn, useCheckOut } from "@/lib/firebase/hooks/useAttendance";
import { Clock8, MapPin } from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const store = useDataStore();
  const [, force] = useState(0);
  const { user, userProfile, loading } = useAuth();
  
  // Check-in functionality for admin
  const adminId = user?.uid;
  const { data: attendanceData, checkedIn, loading: attendanceLoading } = useAttendanceToday(adminId);
  const { mutate: doCheckIn, loading: checkInLoading, error: checkInError } = useCheckIn();
  const { mutate: doCheckOut, loading: checkOutLoading, error: checkOutError } = useCheckOut();
  const [runningHours, setRunningHours] = useState<string>("");
  const [nowStr, setNowStr] = useState<string>("");
  const [gpsOk, setGpsOk] = useState<boolean>(false);
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | undefined>(undefined);

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
    const unsub = store.subscribe(() => force((x) => x + 1));
    return () => unsub();
  }, [router, loading, userProfile, store]);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const totalEmployees = store.employees.length;
  const todayLogs = store.attendance.filter((l) => l.date === today);
  const present = todayLogs.filter((l) => l.checkIn && l.checkOut).length;
  const late = todayLogs.filter((l) => l.checkIn && !l.checkOut).length; // simplistic: currently checked-in -> "late/ongoing"
  const absent = Math.max(0, totalEmployees - (present + late));
  const activeLeaves = store.leaves.filter((l) => l.status === "Approved").length;
  const pendingApprovals = store.leaves.filter((l) => l.status === "Pending").length;

  const monthlyData = useMemo(() => {
    // build last 12 months counts of present days across all employees
    const arr: { name: string; value: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const count = store.attendance.filter((l) => l.date.startsWith(key) && l.checkIn && l.checkOut).length;
      arr.push({ name: d.toLocaleString(undefined, { month: "short" }), value: count });
    }
    return arr;
  }, [store.attendance]);

  // GPS capture
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsOk(true);
        setGpsCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => {
        setGpsOk(false);
        setGpsCoords(undefined);
      },
      { enableHighAccuracy: true, timeout: 3000 }
    );
  }, []);

  // Client-only clock to avoid hydration mismatch
  useEffect(() => {
    const tick = () => setNowStr(new Date().toLocaleTimeString());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Timer calculation for elapsed time
  useEffect(() => {
    if (!checkedIn || !attendanceData?.checkIn?.timestamp) {
      setRunningHours("");
      return;
    }
    const calc = () => {
      try {
        const inMs = attendanceData.checkIn!.timestamp.toMillis();
        const nowMs = Date.now();
        const hours = (nowMs - inMs) / (1000 * 60 * 60);
        setRunningHours(hours.toFixed(2));
      } catch {
        setRunningHours("");
      }
    };
    calc();
    const id = setInterval(calc, 1000); // Update every second for live timer
    return () => clearInterval(id);
  }, [checkedIn, attendanceData?.checkIn?.timestamp]);

  const handleCheckInOut = async () => {
    if (!adminId) return;
    if (!checkedIn) {
      await doCheckIn(adminId, gpsCoords);
    } else {
      await doCheckOut(adminId, gpsCoords);
    }
  };

  const displayTotal = (() => {
    if (attendanceData?.checkOut && attendanceData?.checkIn) {
      if (typeof attendanceData.totalHours === "number") return attendanceData.totalHours.toFixed(2);
      try {
        const inMs = attendanceData.checkIn.timestamp.toMillis();
        const outMs = attendanceData.checkOut.timestamp.toMillis();
        const hours = (outMs - inMs) / (1000 * 60 * 60);
        return Math.max(0, Number(hours.toFixed(2))).toFixed(2);
      } catch {
        return "";
      }
    }
    if (checkedIn && runningHours) return runningHours;
    return "";
  })();

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-neutral-500">Manage employees, attendance, payroll and more</p>
        </div>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader title="Total Employees" />
          <CardContent><div className="text-3xl font-semibold">{totalEmployees}</div></CardContent>
        </Card>
        <Card>
          <CardHeader title="Today's Attendance" />
          <CardContent>
            <div className="text-sm">Present: <span className="font-semibold text-green-600">{present}</span></div>
            <div className="text-sm">Absent: <span className="font-semibold text-rose-600">{absent}</span></div>
            <div className="text-sm">Late/Ongoing: <span className="font-semibold text-amber-600">{late}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Active Leaves" />
          <CardContent><div className="text-3xl font-semibold">{activeLeaves}</div></CardContent>
        </Card>
        <Card>
          <CardHeader title="Pending Approvals" />
          <CardContent><div className="text-3xl font-semibold">{pendingApprovals}</div></CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Monthly Attendance Trend" />
          <CardContent>
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
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Quick Actions" />
          <CardContent>
            <div className="space-y-4">
              {/* Check-in Widget */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Check In</h3>
                    <p className="text-xs text-slate-500">Current time: <span suppressHydrationWarning>{nowStr || "—"}</span></p>
                  </div>
                  {checkedIn && runningHours && (
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Working</div>
                      <div className="text-lg font-semibold text-blue-600">{runningHours}h</div>
                    </div>
                  )}
                </div>
                
                {attendanceData?.checkIn && (
                  <div className="text-xs text-slate-600">
                    Checked in: {attendanceData.checkIn.timestamp.toDate().toLocaleTimeString()}
                  </div>
                )}
                {attendanceData?.checkOut && (
                  <div className="text-xs text-slate-600">
                    Checked out: {attendanceData.checkOut.timestamp.toDate().toLocaleTimeString()}
                    {displayTotal && <span className="ml-2">• Total: {displayTotal}h</span>}
                  </div>
                )}
                
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm w-fit">
                  <MapPin size={14} className={gpsOk ? "text-green-600" : "text-amber-600"} />
                  GPS {gpsOk ? "Captured" : "Not Available"}
                </div>
                
                {(checkInError || checkOutError) && (
                  <div className="text-xs text-red-600">
                    {(checkInError || checkOutError)?.message}
                  </div>
                )}
                
                {attendanceData?.checkOut ? (
                  <Button className="w-full" disabled>
                    <Clock8 className="mr-2" size={16} />
                    Completed
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={handleCheckInOut}
                    disabled={!adminId || attendanceLoading || checkInLoading || checkOutLoading}
                  >
                    <Clock8 className="mr-2" size={16} />
                    {checkInLoading || checkOutLoading ? "Processing..." : checkedIn ? "Check-Out" : "Check-In"}
                  </Button>
                )}
              </div>
              
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


