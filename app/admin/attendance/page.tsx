"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useDataStore } from "@/lib/datastore";

function totalHours(inIso?: string, outIso?: string) {
  if (!inIso || !outIso) return "";
  const ms = new Date(outIso).getTime() - new Date(inIso).getTime();
  if (ms <= 0) return "";
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

export default function AdminAttendancePage() {
  const store = useDataStore();
  const [, force] = useState(0);
  const [emp, setEmp] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const unsub = store.subscribe(() => force((x) => x + 1));
    return () => unsub();
  }, [store]);

  const rows = useMemo(() => {
    return store.attendance
      .filter((r) => (!emp || r.employeeId === emp) && (!date || r.date === date))
      .map((r) => ({
        ...r,
        employee: store.employees.find((e) => e.id === r.employeeId)?.name || r.employeeId,
      }));
  }, [store.attendance, emp, date, store.employees]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Attendance</h1>
        <p className="text-sm text-slate-600">View all logs, calculate total hours, edit or approve corrections.</p>
      </div>

      <Card>
        <CardHeader title="Filters" />
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={emp} onChange={(e) => setEmp(e.target.value)}>
              <option value="">All Employees</option>
              {store.employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <input type="date" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={date} onChange={(e) => setDate(e.target.value)} />
            <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm" onClick={() => { setEmp(""); setDate(""); }}>Clear</button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Attendance Logs" />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-600">
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Employee</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Date</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Check-In</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Check-Out</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Total</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Approved</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-800">{r.employee}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{r.date}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : "—"}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : "—"}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{totalHours(r.checkIn, r.checkOut) || "—"}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{r.approved ? "Yes" : "No"}</td>
                    <td className="border-b border-slate-100 px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded border border-slate-200 px-2 py-1" onClick={() => store.editAttendance(r.id, { checkIn: prompt("Check-In ISO", r.checkIn) || r.checkIn, checkOut: prompt("Check-Out ISO", r.checkOut) || r.checkOut })}>Edit</button>
                        <button className="rounded border border-slate-200 px-2 py-1" onClick={() => store.editAttendance(r.id, { approved: !r.approved })}>{r.approved ? "Unapprove" : "Approve"}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


