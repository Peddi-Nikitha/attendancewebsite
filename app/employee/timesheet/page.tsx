"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useEmployeeAttendanceRecords } from "@/lib/firebase/hooks/useAttendance";

function exportCsv(rows: { date: string; in?: string; out?: string; total: string }[]) {
  const header = ["Date", "In", "Out", "Total Hours"]; 
  const data = rows.map((r) => [r.date, r.in || "", r.out || "", r.total]);
  const csv = [header, ...data].map((r) => r.join(",")).join("\n");
  const uri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  const a = document.createElement("a");
  a.href = uri;
  a.download = "timesheet.csv";
  a.click();
}

export default function EmployeeTimesheetPage() {
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
  
  // Listen to storage changes (when user logs in/out in another tab or after redirect)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "attendance_auth_user") {
        updateUser();
      }
    };
    
    // Custom event for same-tab changes (since storage events only fire in other tabs)
    const handleCustomStorageChange = () => {
      updateUser();
    };
    
    // Listen for storage events (cross-tab)
    window.addEventListener("storage", handleStorageChange);
    
    // Listen for custom events (same-tab)
    window.addEventListener("localStorageChange", handleCustomStorageChange);
    
    // Also check periodically in case of same-tab logout/login (less frequent)
    const interval = setInterval(() => {
      const user = getCurrentUser();
      if ((user?.email || null) !== (currentUser?.email || null)) {
        updateUser();
      }
    }, 2000); // Check every 2 seconds
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageChange", handleCustomStorageChange);
      clearInterval(interval);
    };
  }, [currentUser?.email]);
  
  // Also check when window gains focus (user might have logged in/out in another tab)
  useEffect(() => {
    const handleFocus = () => {
      updateUser();
    };
    
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);
  
  const userId = currentUser?.email; // Use email as unique identifier
  const { data: attendanceRecords, loading: recordsLoading, error } = useEmployeeAttendanceRecords(userId, 30);

  useEffect(() => {
    // Check localStorage auth - redirect if not authenticated or not an employee
    if (!loading) {
      if (!currentUser || currentUser.role !== "employee") {
        router.replace("/login");
      }
    }
  }, [loading, currentUser, router]);

  const logs = useMemo(() => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return [];
    }

    return attendanceRecords.map((record) => {
      const checkInTime = record.checkIn?.timestamp 
        ? record.checkIn.timestamp.toDate().toLocaleTimeString()
        : undefined;
      const checkOutTime = record.checkOut?.timestamp 
        ? record.checkOut.timestamp.toDate().toLocaleTimeString()
        : undefined;
      
      // Format total hours
      let total = "";
      if (record.totalHours !== undefined) {
        const hours = Math.floor(record.totalHours);
        const minutes = Math.floor((record.totalHours - hours) * 60);
        total = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      } else if (record.checkIn && record.checkOut) {
        // Calculate from timestamps if totalHours is not available
        try {
          const inMs = record.checkIn.timestamp.toMillis();
          const outMs = record.checkOut.timestamp.toMillis();
          const totalMs = outMs - inMs;
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

      return {
        date: formattedDate,
        dateSort: record.date, // For sorting
        in: checkInTime,
        out: checkOutTime,
        total,
      };
    });
  }, [attendanceRecords]);

  const isLoading = loading || recordsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Timesheet</h1>
        <p className="text-sm text-slate-600">List of daily logs (In/Out/Total Hours) with export option.</p>
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
        <CardHeader 
          title="Recent Logs" 
          action={
            <button 
              onClick={() => exportCsv(logs)} 
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-blue-700"
              disabled={isLoading || logs.length === 0}
            >
              Export CSV
            </button>
          } 
        />
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Loading attendance records...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No attendance records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-600">
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">Date</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">In</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">Out</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((row, index) => (
                    <tr key={row.dateSort || index} className="hover:bg-slate-50">
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-800">{row.date}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.in || "—"}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.out || "—"}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.total || "—"}</td>
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


