"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useEmployeeByEmail } from "@/lib/firebase/hooks/useEmployees";
import { useEmployeeAttendanceRecords } from "@/lib/firebase/hooks/useAttendance";
import { useEmployeeLeaveRequests } from "@/lib/firebase/hooks/useLeaves";

type Marker = "P" | "A" | "L";

function buildMonth(year: number, month: number, attendanceDates: Set<string>, leaveDates: Set<string>) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = [] as Array<{ date: Date; marker?: Marker }>;
  
  for (let d = 1; d <= last.getDate(); d++) {
    const date = new Date(year, month, d);
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const weekday = date.getDay();
    
    // Skip weekends
    if (weekday === 0 || weekday === 6) {
      days.push({ date });
      continue;
    }
    
    // Check if it's a leave day
    if (leaveDates.has(dateStr)) {
      days.push({ date, marker: "L" });
    }
    // Check if it's an attendance day
    else if (attendanceDates.has(dateStr)) {
      days.push({ date, marker: "P" });
    }
    // Otherwise absent
    else {
      days.push({ date, marker: "A" });
    }
  }
  return { first, last, days };
}

export default function EmployeeAttendanceHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
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
  
  // Listen to storage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "attendance_auth_user") {
        updateUser();
      }
    };
    
    const handleCustomStorageChange = () => {
      updateUser();
    };
    
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageChange", handleCustomStorageChange);
    
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
  const { employee, loading: employeeLoading } = useEmployeeByEmail(userId);
  const { data: attendanceRecords, loading: attendanceLoading } = useEmployeeAttendanceRecords(userId, 100);
  const { data: leaveRequests, loading: leavesLoading } = useEmployeeLeaveRequests(userId, 100);

  useEffect(() => {
    // Check localStorage auth - redirect if not authenticated or not an employee
    if (!loading) {
      if (!currentUser || currentUser.role !== "employee") {
        router.replace("/login");
      }
    }
  }, [loading, currentUser, router]);

  // Get leave balance with defaults
  const leaveBalance = employee?.leaveBalance || {
    casual: 0,
    sick: 0,
    privilege: 0,
  };

  // Process attendance data
  const attendanceDates = useMemo(() => {
    const dates = new Set<string>();
    attendanceRecords?.forEach((record) => {
      if (record.checkIn && record.checkOut) {
        dates.add(record.date);
      }
    });
    return dates;
  }, [attendanceRecords]);

  // Helpers for date formatting
  function toYmdLocal(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // Build set of leave dates within current month from approved requests
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const leaveDates = useMemo(() => {
    const dates = new Set<string>();
    if (!leaveRequests) return dates;
    for (const l of leaveRequests) {
      if (l.status !== "Approved") continue;
      const from = new Date(l.from + "T00:00:00");
      const to = new Date(l.to + "T00:00:00");
      // iterate each day in range
      const start = from < monthStart ? monthStart : from;
      const end = to > monthEnd ? monthEnd : to;
      const cursor = new Date(start);
      while (cursor <= end) {
        // only weekdays
        const weekday = cursor.getDay();
        if (weekday !== 0 && weekday !== 6) {
          dates.add(toYmdLocal(cursor));
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return dates;
  }, [leaveRequests, monthStart, monthEnd]);

  const { days, first } = buildMonth(today.getFullYear(), today.getMonth(), attendanceDates, leaveDates);
  const monthName = first.toLocaleString(undefined, { month: "long", year: "numeric" });

  const present = days.filter((d) => d.marker === "P").length;
  const absent = days.filter((d) => d.marker === "A").length;
  const leave = days.filter((d) => d.marker === "L").length;

  const startWeekday = first.getDay();
  const isLoading = loading || employeeLoading || attendanceLoading || leavesLoading;

  // Monthly leave counts by type (in working days)
  const leaveCounts = useMemo(() => {
    const counts = { casual: 0, sick: 0, privilege: 0 } as Record<"casual"|"sick"|"privilege", number>;
    if (!leaveRequests) return counts;
    for (const l of leaveRequests) {
      if (l.status !== "Approved") continue;
      const typeKey = String(l.type).toLowerCase() as "casual"|"sick"|"privilege";
      const from = new Date(l.from + "T00:00:00");
      const to = new Date(l.to + "T00:00:00");
      const start = from < monthStart ? monthStart : from;
      const end = to > monthEnd ? monthEnd : to;
      const cursor = new Date(start);
      while (cursor <= end) {
        const weekday = cursor.getDay();
        if (weekday !== 0 && weekday !== 6) {
          counts[typeKey] = (counts[typeKey] || 0) + 1;
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return counts;
  }, [leaveRequests, monthStart, monthEnd]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Attendance History</h1>
        <p className="text-sm text-slate-600">Calendar view with color-coded markers and monthly summary.</p>
      </div>

      {/* Leave Balance Display */}
      <Card>
        <CardHeader title="Leave Balance" />
        <CardContent>
          {isLoading ? (
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

      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader title={monthName} subtitle="Present (green) • Absent (red) • Leave (amber)" />
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-sm text-slate-500">Loading attendance data...</div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-slate-500">{d}</div>
                ))}
                {Array.from({ length: startWeekday }).map((_, i) => (
                  <div key={`pad-${i}`} />
                ))}
                {days.map(({ date, marker }) => (
                  <div key={date.toISOString()} className="rounded-lg border border-slate-200 bg-white p-2 text-center shadow-sm">
                    <div className="text-xs text-slate-500">{date.getDate()}</div>
                    {marker && (
                      <span
                        className={`mt-1 inline-block h-2 w-2 rounded-full ${
                          marker === "P" ? "bg-green-500" : marker === "A" ? "bg-rose-500" : "bg-amber-500"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Monthly Summary" />
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : (
              <ul className="space-y-2 text-sm">
                <li className="flex items-center justify-between"><span className="text-slate-600">Present</span><span className="font-semibold text-slate-900">{present}</span></li>
                <li className="flex items-center justify-between"><span className="text-slate-600">Absent</span><span className="font-semibold text-slate-900">{absent}</span></li>
                <li className="flex items-center justify-between"><span className="text-slate-600">Leave</span><span className="font-semibold text-slate-900">{leave}</span></li>
                <li className="pt-2 border-t border-slate-200 flex items-center justify-between"><span className="text-slate-600">Casual Leave (this month)</span><span className="font-semibold text-slate-900">{leaveCounts.casual}</span></li>
                <li className="flex items-center justify-between"><span className="text-slate-600">Sick Leave (this month)</span><span className="font-semibold text-slate-900">{leaveCounts.sick}</span></li>
                <li className="flex items-center justify-between"><span className="text-slate-600">Privilege Leave (this month)</span><span className="font-semibold text-slate-900">{leaveCounts.privilege}</span></li>
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


