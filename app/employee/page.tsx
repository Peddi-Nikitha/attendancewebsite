"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, logout } from "../../lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { CalendarDays, Clock8, Leaf, MapPin, Wallet } from "lucide-react";
import { useAttendanceToday, useCheckIn, useCheckOut, useEmployeeAttendanceRecords } from "@/lib/firebase/hooks/useAttendance";

const weekdayNamesMonStart = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Get user from localStorage
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setLoading(false);
  }, []);
  
  const userId = currentUser?.email; // Use email as unique identifier
  const { data, checkedIn, loading: attendanceLoading } = useAttendanceToday(userId);
  const { data: recentRecords } = useEmployeeAttendanceRecords(userId, 14);
  const { mutate: doCheckIn, loading: checkInLoading, error: checkInError } = useCheckIn();
  const { mutate: doCheckOut, loading: checkOutLoading, error: checkOutError } = useCheckOut();
  const [timestamp, setTimestamp] = useState<string>("");
  const [runningHours, setRunningHours] = useState<string>("");
  const [nowStr, setNowStr] = useState<string>("");
  const [gpsOk, setGpsOk] = useState<boolean>(false);
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | undefined>(undefined);

  useEffect(() => {
    // Check localStorage auth - redirect if not authenticated or not an employee
    if (!loading) {
      if (!currentUser || currentUser.role !== "employee") {
        router.replace("/login");
      }
    }
  }, [loading, currentUser, router]);

  // GPS capture
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsOk(false);
      return;
    }
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

  // Update timestamp based on last action from Firestore
  useEffect(() => {
    if (data?.checkOut) {
      setTimestamp(data.checkOut.timestamp.toDate().toLocaleString());
    } else if (data?.checkIn) {
      setTimestamp(data.checkIn.timestamp.toDate().toLocaleString());
    } else {
      setTimestamp("");
    }
  }, [data?.checkIn, data?.checkOut]);

  // Live timer - updates every second when checked in
  useEffect(() => {
    if (!checkedIn || !data?.checkIn?.timestamp) {
      setRunningHours("");
      return;
    }
    const calc = () => {
      try {
        const inMs = data.checkIn!.timestamp.toMillis();
        const nowMs = Date.now();
        const hours = (nowMs - inMs) / (1000 * 60 * 60);
        setRunningHours(hours.toFixed(2));
      } catch {
        setRunningHours("");
      }
    };
    calc(); // Calculate immediately
    const id = setInterval(calc, 1000); // Update every second
    return () => clearInterval(id);
  }, [checkedIn, data?.checkIn?.timestamp]);

  const displayTotal = (() => {
    if (data?.checkOut && data?.checkIn) {
      if (typeof data.totalHours === "number") return data.totalHours.toFixed(2);
      try {
        const inMs = data.checkIn.timestamp.toMillis();
        const outMs = data.checkOut.timestamp.toMillis();
        const hours = (outMs - inMs) / (1000 * 60 * 60);
        return Math.max(0, Number(hours.toFixed(2))).toFixed(2);
      } catch {
        return "";
      }
    }
    if (checkedIn && runningHours) return runningHours;
    return "";
  })();

  // Build dynamic weekly hours for current week (Mon -> Sun)
  const weeklyData = useMemo(() => {
    const today = new Date();
    const day = today.getDay(); // 0=Sun..6=Sat
    const mondayOffset = (day + 6) % 7; // days since Monday
    const monday = new Date(today);
    monday.setHours(0,0,0,0);
    monday.setDate(today.getDate() - mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    // Pre-fill structure for Mon..Sun
    const days: Array<{ key: string; name: string; hours: number }> = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({ key, name: weekdayNamesMonStart[i], hours: 0 });
    }

    const indexByKey = new Map(days.map((d, i) => [d.key, i] as const));

    if (recentRecords) {
      for (const r of recentRecords) {
        const i = indexByKey.get(r.date);
        if (i === undefined) continue; // only this week
        let hours = r.totalHours;
        if ((hours === undefined || hours === null) && r.checkIn?.timestamp && r.checkOut?.timestamp) {
          try {
            const inMs = r.checkIn.timestamp.toMillis();
            const outMs = r.checkOut.timestamp.toMillis();
            const diff = (outMs - inMs) / (1000 * 60 * 60);
            hours = Math.max(0, Number(diff.toFixed(2)));
          } catch {}
        }
        if (typeof hours === "number") {
          days[i].hours = hours;
        }
      }
    }

    return days.map(({ name, hours }) => ({ name, hours }));
  }, [recentRecords]);

  async function handleCheck() {
    console.log("handleCheck called");
    
    // Use userId from localStorage
    const idToUse = userId;
    
    console.log("ID to use:", idToUse);
    console.log("checkedIn:", checkedIn);
    console.log("data:", data);
    
    if (!idToUse) {
      console.error("No user ID available");
      return;
    }
    
    try {
      console.log("Attempting check-in/out...");
      if (!checkedIn) {
        console.log("Calling doCheckIn with:", idToUse, gpsCoords);
        await doCheckIn(idToUse, gpsCoords);
      } else {
        console.log("Calling doCheckOut with:", idToUse, gpsCoords);
        await doCheckOut(idToUse, gpsCoords);
      }
      console.log("Check-in/out completed successfully");
    } catch (error) {
      console.error("Check-in/out error:", error);
      // Error will be displayed via checkInError or checkOutError
    }
  }
  
  // Button text - updates in real-time based on Firestore listener
  const buttonText = checkInLoading || checkOutLoading 
    ? "Processing..." 
    : checkedIn 
      ? "Check-Out" 
      : "Check-In";

  // Debug disabled conditions - allow button if userId exists and user is authenticated
  const isDisabled = loading || !userId || !currentUser || attendanceLoading || checkInLoading || checkOutLoading;
  console.log("Button disabled conditions:", {
    loading,
    userId,
    currentUser: currentUser?.email,
    attendanceLoading,
    checkInLoading,
    checkOutLoading,
    isDisabled
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Employee Dashboard</h1>
          <p className="mt-2 text-slate-600">Track your attendance, leaves, and payslips easily.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card hover>
          <CardHeader 
            title="Today's Status" 
            subtitle="Current day"
            icon={<Clock8 className={checkedIn ? "text-green-600" : "text-amber-600"} size={20} />}
          />
          <CardContent>
            <div className="space-y-3">
              <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${
                checkedIn ? "bg-green-100 text-green-700 border border-green-200" : "bg-amber-100 text-amber-700 border border-amber-200"
              }`}>
                {checkedIn ? "✓ Present" : "○ Not Checked-In"}
              </span>
              {data?.checkIn && (
                <div className="text-xs text-slate-600">
                  Checked in: <span className="font-medium">{data.checkIn.timestamp.toDate().toLocaleTimeString()}</span>
                </div>
              )}
              {currentUser && (
                <div className="text-xs text-slate-500 pt-1 border-t border-slate-100">
                  Welcome, <span className="font-medium text-slate-700">{currentUser.name}</span>
                </div>
              )}
              {displayTotal && (
                <div className="text-sm font-semibold text-slate-900 pt-2 border-t border-slate-100">
                  {data?.checkOut ? "Total hours" : "Working so far"}: <span className="text-blue-600">{displayTotal}h</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card hover>
          <CardHeader 
            title="Total Working Days" 
            subtitle="This month"
            icon={<CalendarDays className="text-blue-600" size={20} />}
          />
          <CardContent>
            <div className="text-4xl font-bold text-slate-900">18</div>
            <p className="mt-2 text-xs text-slate-500">Days worked</p>
          </CardContent>
        </Card>
        <Card hover>
          <CardHeader 
            title="Total Leaves Taken" 
            subtitle="This year"
            icon={<Leaf className="text-emerald-600" size={20} />}
          />
          <CardContent>
            <div className="text-4xl font-bold text-slate-900">4</div>
            <p className="mt-2 text-xs text-slate-500">Leave days used</p>
          </CardContent>
        </Card>
        <Card hover>
          <CardHeader 
            title="Upcoming Holidays" 
            subtitle="Next 30 days"
            icon={<CalendarDays className="text-purple-600" size={20} />}
          />
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-slate-700">
                <CalendarDays size={14} className="text-purple-500" /> 
                <span>Nov 05 - Diwali</span>
              </li>
              <li className="flex items-center gap-2 text-slate-700">
                <CalendarDays size={14} className="text-purple-500" /> 
                <span>Nov 25 - Founders Day</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card hover>
        <CardHeader 
          title="Check In / Check Out" 
          subtitle="Mark your attendance"
          icon={<Clock8 className="text-blue-600" size={20} />}
        />
        <CardContent>
          <div className="space-y-4">
            {/* Enhanced Check-in Widget */}
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Current Time</h3>
                  <p className="text-2xl font-bold text-blue-600 mt-1" suppressHydrationWarning>{nowStr || "—"}</p>
                </div>
                {checkedIn && runningHours && (
                  <div className="text-right bg-white/80 rounded-lg px-4 py-3 border border-blue-200">
                    <div className="text-xs text-slate-500 font-medium">Working Time</div>
                    <div className="text-2xl font-bold text-blue-600">{runningHours}h</div>
                  </div>
                )}
              </div>
              
              {data?.checkIn && (
                <div className="flex items-center gap-2 text-sm text-slate-700 bg-white/80 rounded-lg px-3 py-2 border border-slate-200">
                  <Clock8 size={14} className="text-green-600" />
                  <span>Checked in: <span className="font-semibold">{data.checkIn.timestamp.toDate().toLocaleTimeString()}</span></span>
                </div>
              )}
              {data?.checkOut && (
                <div className="flex items-center gap-2 text-sm text-slate-700 bg-white/80 rounded-lg px-3 py-2 border border-slate-200">
                  <Clock8 size={14} className="text-blue-600" />
                  <span>Checked out: <span className="font-semibold">{data.checkOut.timestamp.toDate().toLocaleTimeString()}</span></span>
                  {displayTotal && <span className="ml-auto font-semibold text-blue-600">Total: {displayTotal}h</span>}
                </div>
              )}
              
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm">
                <MapPin size={16} className={gpsOk ? "text-green-600" : "text-amber-600"} />
                <span>GPS {gpsOk ? "Captured" : "Not Available"}</span>
              </div>
              
              {(checkInError || checkOutError) && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  {(checkInError || checkOutError)?.message || "An error occurred. Please try again."}
                </div>
              )}
              
              <Button
                className="w-full"
                size="lg"
                onClick={(e) => {
                  e.preventDefault();
                  console.log("Button clicked, disabled:", isDisabled);
                  if (!isDisabled) {
                    handleCheck();
                  }
                }}
                disabled={isDisabled}
                type="button"
              >
                <Clock8 className="mr-2" size={18} />
                {buttonText}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card hover>
          <CardHeader 
            title="Weekly Hours Worked" 
            subtitle="Last 7 days"
            icon={<CalendarDays className="text-blue-600" size={20} />}
          />
          <CardContent>
            <div className="h-64 w-full" style={{ minWidth: 0, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
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
                    cursor={{ fill: "#EEF2FF" }}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #E2E8F0', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="hours" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardHeader 
            title="Quick Access" 
            icon={<Leaf className="text-blue-600" size={20} />}
          />
          <CardContent>
            <div className="space-y-3">
              <Link 
                href="/employee-leave" 
                className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-4 py-3 text-blue-700 font-medium transition-all hover:from-blue-100 hover:to-indigo-100 hover:shadow-sm"
              >
                <Leaf size={18} /> 
                <span>Apply Leave</span>
              </Link>
              <Link 
                href="/employee-payslips" 
                className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-4 py-3 text-blue-700 font-medium transition-all hover:from-blue-100 hover:to-indigo-100 hover:shadow-sm"
              >
                <Wallet size={18} /> 
                <span>View Payslip</span>
              </Link>
              <Link 
                href="/employee-attendance-history" 
                className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-4 py-3 text-blue-700 font-medium transition-all hover:from-blue-100 hover:to-indigo-100 hover:shadow-sm"
              >
                <CalendarDays size={18} /> 
                <span>Attendance Report</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


