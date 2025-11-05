"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logout } from "../../lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { CalendarDays, Clock8, Leaf, MapPin } from "lucide-react";
import { useAttendanceToday, useCheckIn, useCheckOut } from "@/lib/firebase/hooks/useAttendance";

const weeklyData = [
  { name: "Mon", hours: 8 },
  { name: "Tue", hours: 7.5 },
  { name: "Wed", hours: 8 },
  { name: "Thu", hours: 6.5 },
  { name: "Fri", hours: 8 },
  { name: "Sat", hours: 0 },
  { name: "Sun", hours: 0 },
];

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Employee Dashboard</h1>
          <p className="text-sm text-slate-600">Track your attendance, leaves, and payslips easily.</p>
        </div>
        <button
          onClick={() => {
            logout();
            router.replace("/login");
          }}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm transition hover:shadow"
        >
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader title="Today’s Status" subtitle="Current day" />
          <CardContent>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                checkedIn ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
              }`}>{checkedIn ? "Present" : "Not Checked-In"}</span>
              <span className="text-xs text-slate-500">
                {data?.checkIn ? data.checkIn.timestamp.toDate().toLocaleTimeString() : (timestamp || "—")}
              </span>
            </div>
            {currentUser && (
              <div className="text-xs text-slate-500 mt-1">
                Welcome, {currentUser.name}
              </div>
            )}
            {displayTotal && (
              <div className="mt-2 text-xs text-slate-500">
                {data?.checkOut ? "Total hours" : "Working so far"}: {displayTotal}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Total Working Days" subtitle="This month" />
          <CardContent>
            <div className="text-2xl font-semibold">18</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Total Leaves Taken" subtitle="This year" />
          <CardContent>
            <div className="text-2xl font-semibold">4</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Upcoming Holidays" subtitle="Next 30 days" />
          <CardContent>
            <ul className="text-sm text-slate-700">
              <li className="flex items-center gap-2"><CalendarDays size={16} className="text-blue-600" /> Nov 05 - Diwali</li>
              <li className="flex items-center gap-2"><CalendarDays size={16} className="text-blue-600" /> Nov 25 - Founders Day</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader title="Quick Actions" />
        <CardContent>
          <div className="space-y-4">
            {/* Enhanced Check-in Widget */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Check In / Check Out</h3>
                  <p className="text-xs text-slate-500">Current time: <span suppressHydrationWarning>{nowStr || "—"}</span></p>
                </div>
                {checkedIn && runningHours && (
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Working</div>
                    <div className="text-lg font-semibold text-blue-600">{runningHours}h</div>
                  </div>
                )}
              </div>
              
              {data?.checkIn && (
                <div className="text-xs text-slate-600">
                  Checked in: {data.checkIn.timestamp.toDate().toLocaleTimeString()}
                </div>
              )}
              {data?.checkOut && (
                <div className="text-xs text-slate-600">
                  Checked out: {data.checkOut.timestamp.toDate().toLocaleTimeString()}
                  {displayTotal && <span className="ml-2">• Total: {displayTotal}h</span>}
                </div>
              )}
              
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm w-fit">
                <MapPin size={14} className={gpsOk ? "text-green-600" : "text-amber-600"} />
                GPS {gpsOk ? "Captured" : "Not Available"}
              </div>
              
              {(checkInError || checkOutError) && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                  {(checkInError || checkOutError)?.message || "An error occurred. Please try again."}
                </div>
              )}
              
              <Button
                className="w-full"
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
                <Clock8 className="mr-2" size={16} />
                {buttonText}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Weekly Hours Worked" subtitle="Last 7 days" />
        <CardContent>
          <div className="h-64 w-full" style={{ minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
                <YAxis tick={{ fill: "#475569", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
                <Tooltip cursor={{ fill: "#EEF2FF" }} />
                <Bar dataKey="hours" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Quick Access" />
        <CardContent>
          <div className="flex flex-wrap gap-3 text-sm">
            <a href="/employee/leave" className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-blue-700 transition hover:bg-blue-100"><Leaf size={16} /> Apply Leave</a>
            <a href="/employee/payslips" className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-blue-700 transition hover:bg-blue-100">💰 View Payslip</a>
            <a href="/employee/attendance-history" className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-blue-700 transition hover:bg-blue-100">📅 Attendance Report</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


