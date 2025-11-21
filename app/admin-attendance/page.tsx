"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/hooks/useAuth";
import { useEmployees } from "@/lib/firebase/hooks/useEmployees";
import { useAllAttendanceRecords } from "@/lib/firebase/hooks/useAttendance";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { AttendanceDoc } from "@/lib/firebase/services/attendance";

export default function AdminAttendancePage() {
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const { employees, loading: employeesLoading } = useEmployees();
  const { data: attendanceRecords, loading: attendanceLoading, error } = useAllAttendanceRecords(10000);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [date, setDate] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // Generate years from current year back to 2000
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    const startYear = 2000;
    for (let year = currentYear; year >= startYear; year--) {
      years.push(year.toString());
    }
    return years;
  }, []);

  useEffect(() => {
    const isStaticAdmin = (() => {
      try { return localStorage.getItem("staticAdmin") === "true"; } catch { return false; }
    })();

    if (!isStaticAdmin) {
      if (!authLoading) {
        if (!userProfile || userProfile.role !== "admin") {
          router.replace("/login");
        }
      }
    }
  }, [router, authLoading, userProfile]);

  // Create employee lookup map
  const employeeMap = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((emp) => {
      const displayName = emp.name || (emp.firstName + " " + (emp.lastName || "")).trim() || emp.email || emp.employeeId;
      // Map by email (employeeId in attendance is email)
      if (emp.email) {
        map.set(emp.email, displayName);
      }
      // Also map by employeeId if different
      if (emp.employeeId && emp.employeeId !== emp.email) {
        map.set(emp.employeeId, displayName);
      }
    });
    return map;
  }, [employees]);

  const rows = useMemo(() => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return [];
    }

    // Apply all filters
    let filtered = attendanceRecords;
    
    // Filter by employee
    if (selectedEmployee) {
      filtered = filtered.filter((r) => r.employeeId === selectedEmployee);
    }
    
    // Filter by date
    if (date) {
      // Convert date input (YYYY-MM-DD) to match record date format
      filtered = filtered.filter((r) => r.date === date);
    }
    
    // Filter by year
    if (yearFilter) {
      filtered = filtered.filter((r) => r.date.startsWith(yearFilter));
    }
    
    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    return filtered.map((record: AttendanceDoc) => {
      const checkInTime = record.checkIn?.timestamp 
        ? record.checkIn.timestamp.toDate().toLocaleTimeString()
        : undefined;
      const checkOutTime = record.checkOut?.timestamp 
        ? record.checkOut.timestamp.toDate().toLocaleTimeString()
        : undefined;
      
      // Format lunch break
      let lunchBreak = "";
      if (record.lunchBreak?.start) {
        const lunchStart = record.lunchBreak.start.toDate().toLocaleTimeString();
        if (record.lunchBreak.end) {
          const lunchEnd = record.lunchBreak.end.toDate().toLocaleTimeString();
          const duration = record.lunchBreak.duration;
          if (duration !== undefined) {
            const hours = Math.floor(duration);
            const minutes = Math.floor((duration - hours) * 60);
            const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            lunchBreak = `${lunchStart} - ${lunchEnd} (${durationStr})`;
          } else {
            lunchBreak = `${lunchStart} - ${lunchEnd}`;
          }
        } else {
          lunchBreak = `${lunchStart} (Active)`;
        }
      }

      // Format total hours (already excludes lunch break in backend)
      let total = "";
      if (record.totalHours !== undefined) {
        const hours = Math.floor(record.totalHours);
        const minutes = Math.floor((record.totalHours - hours) * 60);
        total = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      } else if (record.checkIn && record.checkOut) {
        // Calculate from timestamps if totalHours is not available, excluding lunch break
        try {
          const inMs = record.checkIn.timestamp.toMillis();
          const outMs = record.checkOut.timestamp.toMillis();
          let totalMs = outMs - inMs;
          
          // Subtract lunch break time if it exists
          if (record.lunchBreak?.start && record.lunchBreak?.end) {
            const lunchStartMs = record.lunchBreak.start.toMillis();
            const lunchEndMs = record.lunchBreak.end.toMillis();
            totalMs -= (lunchEndMs - lunchStartMs);
          } else if (record.lunchBreak?.start && !record.lunchBreak?.end) {
            // If lunch break is still active, subtract time from start to checkout
            const lunchStartMs = record.lunchBreak.start.toMillis();
            totalMs -= (outMs - lunchStartMs);
          }
          
          const hours = Math.floor(totalMs / 3600000);
          const minutes = Math.floor((totalMs % 3600000) / 60000);
          total = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        } catch {
          total = "";
        }
      }

      // Format date (YYYY-MM-DD to a more readable format)
      const dateObj = new Date(record.date + "T00:00:00");
      const formattedDate = dateObj.toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "short", 
        day: "numeric" 
      });

      // Get employee name
      const employeeName = employeeMap.get(record.employeeId) || record.employeeId;

      return {
        id: `${record.employeeId}_${record.date}`,
        employee: employeeName,
        date: formattedDate,
        dateSort: record.date,
        in: checkInTime,
        out: checkOutTime,
        lunchBreak: lunchBreak || undefined,
        total,
        status: record.status,
      };
    }).sort((a, b) => {
      // Sort by date descending, then by employee name
      if (a.dateSort !== b.dateSort) {
        return b.dateSort.localeCompare(a.dateSort);
      }
      return a.employee.localeCompare(b.employee);
    });
  }, [attendanceRecords, selectedEmployee, date, yearFilter, statusFilter, employeeMap]);

  const isLoading = authLoading || employeesLoading || attendanceLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Attendance</h1>
        <p className="text-sm text-slate-600">View all logs, calculate total hours, edit or approve corrections.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          {error.message?.includes("index") || error.message?.includes("create_composite") ? (
            <div className="space-y-2">
              <p className="font-medium text-amber-800">
                Firestore Index Required
              </p>
              <p className="text-amber-700">
                To display attendance records efficiently, please create a Firestore index. 
                The data will still load using a fallback method, but creating the index will improve performance.
              </p>
              {(() => {
                const urlMatch = error.message.match(/https:\/\/[^\s\)]+/);
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
                ) : (
                  <p className="text-xs text-amber-600 mt-2">
                    Check the browser console for the index creation link.
                  </p>
                );
              })()}
            </div>
          ) : (
            <div className="text-red-700">
              Error loading attendance records: {error.message}
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader title="Filters" />
        <CardContent>
          <div className="space-y-4">
            {/* First row: Year, Date, Status */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select 
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" 
                value={yearFilter} 
                onChange={(e) => setYearFilter(e.target.value)}
              >
                <option value="">All Years</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              
              <input 
                type="date"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
              />
              
              <select 
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="leave">Leave</option>
                <option value="weekend">Weekend</option>
                <option value="holiday">Holiday</option>
                <option value="half-day">Half Day</option>
              </select>
              
              <select 
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" 
                value={selectedEmployee} 
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <option value="">All Employees</option>
                {employees.map((emp) => {
                  const displayName = emp.name || (emp.firstName + " " + (emp.lastName || "")).trim() || emp.email || emp.employeeId;
                  const employeeId = emp.email || emp.employeeId;
                  return (
                    <option key={emp.id} value={employeeId}>
                      {displayName}
                    </option>
                  );
                })}
              </select>
            </div>
            
            {/* Second row: Clear button */}
            <div className="flex justify-end">
              <button 
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50 transition-colors" 
                onClick={() => {
                  setSelectedEmployee("");
                  setDate("");
                  setYearFilter("");
                  setStatusFilter("");
                }}
              >
                Clear All Filters
              </button>
            </div>
            
            {/* Active filters indicator */}
            {(selectedEmployee || date || yearFilter || statusFilter) && (
              <div className="flex flex-wrap gap-2 items-center text-xs">
                <span className="text-slate-600 font-medium">Active filters:</span>
                {yearFilter && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2 py-1">
                    Year: {yearFilter}
                    <button onClick={() => setYearFilter("")} className="hover:text-blue-900">×</button>
                  </span>
                )}
                {date && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2 py-1">
                    Date: {date}
                    <button onClick={() => setDate("")} className="hover:text-blue-900">×</button>
                  </span>
                )}
                {selectedEmployee && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2 py-1">
                    Employee: {employeeMap.get(selectedEmployee) || selectedEmployee}
                    <button onClick={() => setSelectedEmployee("")} className="hover:text-blue-900">×</button>
                  </span>
                )}
                {statusFilter && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2 py-1">
                    Status: {statusFilter}
                    <button onClick={() => setStatusFilter("")} className="hover:text-blue-900">×</button>
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Attendance Logs" />
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Loading attendance records...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No attendance records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-600">
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">Employee</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">Date</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">Check-In</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">Check-Out</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">Lunch Break</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">Total</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-800 font-medium">{r.employee}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{r.date}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{r.in || "—"}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{r.out || "—"}</td>
                      <td className="border-b border-slate-100 px-3 py-2 text-xs">{r.lunchBreak || "—"}</td>
                      <td className="border-b border-slate-100 px-3 py-2 font-medium">{r.total || "—"}</td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.status === "present" ? "bg-green-100 text-green-700" :
                          r.status === "leave" ? "bg-blue-100 text-blue-700" :
                          r.status === "weekend" ? "bg-purple-100 text-purple-700" :
                          r.status === "holiday" ? "bg-yellow-100 text-yellow-700" :
                          r.status === "half-day" ? "bg-orange-100 text-orange-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {r.status || "absent"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
