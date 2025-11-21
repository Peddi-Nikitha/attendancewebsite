"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/hooks/useAuth";
import { useEmployees } from "@/lib/firebase/hooks/useEmployees";
import { useAllAttendanceRecords } from "@/lib/firebase/hooks/useAttendance";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { AttendanceDoc } from "@/lib/firebase/services/attendance";

function exportCsv(rows: { employee: string; date: string; in?: string; out?: string; lunchBreak?: string; total: string }[]) {
  const header = ["Employee", "Date", "In", "Out", "Lunch Break", "Total Hours"]; 
  const data = rows.map((r) => [r.employee, r.date, r.in || "", r.out || "", r.lunchBreak || "", r.total]);
  const csv = [header, ...data].map((r) => r.join(",")).join("\n");
  const uri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  const a = document.createElement("a");
  a.href = uri;
  a.download = "timesheets.csv";
  a.click();
}

export default function AdminTimesheetsPage() {
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const { employees, loading: employeesLoading } = useEmployees();
  const { data: attendanceRecords, loading: attendanceLoading, error } = useAllAttendanceRecords(10000);
  const [month, setMonth] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  
  // Generate years from current year back to 2000 (covers all practical business years)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    // Go back to year 2000 (covers 25+ years of history)
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

  // Create employee lookup map and reverse map (name/email to employeeId)
  const employeeMap = useMemo(() => {
    const map = new Map<string, string>();
    const reverseMap = new Map<string, string>(); // name -> email/employeeId
    employees.forEach((emp) => {
      const displayName = emp.name || (emp.firstName + " " + (emp.lastName || "")).trim() || emp.email || emp.employeeId;
      // Map by email (employeeId in attendance is email)
      if (emp.email) {
        map.set(emp.email, displayName);
        reverseMap.set(displayName, emp.email);
      }
      // Also map by employeeId if different
      if (emp.employeeId && emp.employeeId !== emp.email) {
        map.set(emp.employeeId, displayName);
        reverseMap.set(displayName, emp.employeeId);
      }
    });
    return { map, reverseMap };
  }, [employees]);

  const rows = useMemo(() => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return [];
    }

    // Apply all filters
    let filtered = attendanceRecords;
    
    // Filter by year if specified
    if (yearFilter) {
      filtered = filtered.filter((r) => r.date.startsWith(yearFilter));
    }
    
    // Filter by month if specified
    if (month) {
      filtered = filtered.filter((r) => r.date.startsWith(month));
    }
    
    // Filter by employee
    if (selectedEmployee) {
      filtered = filtered.filter((r) => r.employeeId === selectedEmployee);
    }
    
    // Filter by date range
    if (startDate) {
      filtered = filtered.filter((r) => r.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((r) => r.date <= endDate);
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
      
      // Format lunch break (same as employee page)
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
      const employeeName = employeeMap.map.get(record.employeeId) || record.employeeId;

      return {
        employee: employeeName,
        date: formattedDate,
        dateSort: record.date, // For sorting
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
  }, [attendanceRecords, yearFilter, month, selectedEmployee, startDate, endDate, statusFilter, employeeMap]);

  const isLoading = authLoading || employeesLoading || attendanceLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Timesheets</h1>
        <p className="text-sm text-slate-600">View all employee timesheets with lunch break details. Approve or export.</p>
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
                // Extract URL from error message - Firebase provides it in the message
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
            {/* First row: Year, Start Date, End Date, Status */}
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
                placeholder="Start Date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
              />
              
              <input 
                type="date"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" 
                placeholder="End Date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
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
            </div>
            
            {/* Second row: Employee, Month, Action buttons */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              
              <input 
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" 
                placeholder="Month (YYYY-MM)" 
                value={month} 
                onChange={(e) => setMonth(e.target.value)} 
              />
              
              <button 
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50 transition-colors" 
                onClick={() => {
                  setMonth("");
                  setSelectedEmployee("");
                  setStartDate("");
                  setEndDate("");
                  setStatusFilter("");
                  setYearFilter("");
                }}
              >
                Clear All Filters
              </button>
              
              <button 
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 transition-colors" 
                onClick={() => exportCsv(rows)}
                disabled={isLoading || rows.length === 0}
              >
                Export CSV
              </button>
            </div>
            
            <div className="grid gap-3 sm:grid-cols-3">
              <input 
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" 
                placeholder="Month (YYYY-MM)" 
                value={month} 
                onChange={(e) => setMonth(e.target.value)} 
              />
              <button 
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50 transition-colors" 
                onClick={() => {
                  setMonth("");
                  setSelectedEmployee("");
                  setStartDate("");
                  setEndDate("");
                  setStatusFilter("");
                  setYearFilter("");
                }}
              >
                Clear All Filters
              </button>
              <button 
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 transition-colors" 
                onClick={() => exportCsv(rows)}
                disabled={isLoading || rows.length === 0}
              >
                Export CSV
              </button>
            </div>
            
            {/* Active filters indicator */}
            {(yearFilter || month || selectedEmployee || startDate || endDate || statusFilter) && (
              <div className="flex flex-wrap gap-2 items-center text-xs">
                <span className="text-slate-600 font-medium">Active filters:</span>
                {yearFilter && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2 py-1">
                    Year: {yearFilter}
                    <button onClick={() => setYearFilter("")} className="hover:text-blue-900">×</button>
                  </span>
                )}
                {month && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2 py-1">
                    Month: {month}
                    <button onClick={() => setMonth("")} className="hover:text-blue-900">×</button>
                  </span>
                )}
                {selectedEmployee && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2 py-1">
                    Employee: {employeeMap.map.get(selectedEmployee) || selectedEmployee}
                    <button onClick={() => setSelectedEmployee("")} className="hover:text-blue-900">×</button>
                  </span>
                )}
                {startDate && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2 py-1">
                    From: {startDate}
                    <button onClick={() => setStartDate("")} className="hover:text-blue-900">×</button>
                  </span>
                )}
                {endDate && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2 py-1">
                    To: {endDate}
                    <button onClick={() => setEndDate("")} className="hover:text-blue-900">×</button>
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
        <CardHeader title="Employee Timesheets" />
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
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">In</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">Out</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">Lunch Break</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">Total</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${row.employee}-${row.dateSort}-${index}`} className="hover:bg-slate-50">
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-800 font-medium">{row.employee}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.date}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.in || "—"}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.out || "—"}</td>
                      <td className="border-b border-slate-100 px-3 py-2 text-xs">{row.lunchBreak || "—"}</td>
                      <td className="border-b border-slate-100 px-3 py-2 font-medium">{row.total || "—"}</td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.status === "present" ? "bg-green-100 text-green-700" :
                          row.status === "leave" ? "bg-blue-100 text-blue-700" :
                          row.status === "weekend" ? "bg-purple-100 text-purple-700" :
                          row.status === "holiday" ? "bg-yellow-100 text-yellow-700" :
                          row.status === "half-day" ? "bg-orange-100 text-orange-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {row.status || "absent"}
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
