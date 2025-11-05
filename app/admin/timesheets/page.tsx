"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useDataStore } from "@/lib/datastore";

function exportCsv(rows: { employee: string; date: string; total: string }[]) {
  const csv = ["Employee,Date,Total Hours", ...rows.map((r) => `${r.employee},${r.date},${r.total}`)].join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = "timesheets.csv";
  a.click();
}

export default function AdminTimesheetsPage() {
  const store = useDataStore();
  const [, force] = useState(0);
  const [month, setMonth] = useState("");

  useEffect(() => {
    const unsub = store.subscribe(() => force((x) => x + 1));
    return () => unsub();
  }, [store]);

  const rows = useMemo(() => {
    const calc = (inIso?: string, outIso?: string) => {
      if (!inIso || !outIso) return 0;
      const ms = new Date(outIso).getTime() - new Date(inIso).getTime();
      return ms > 0 ? ms : 0;
    };
    const grouped = new Map<string, number>();
    store.attendance.forEach((l) => {
      if (month && !l.date.startsWith(month)) return;
      const key = `${l.employeeId}|${l.date}`;
      grouped.set(key, (grouped.get(key) || 0) + calc(l.checkIn, l.checkOut));
    });
    const rows = Array.from(grouped.entries()).map(([key, ms]) => {
      const [employeeId, date] = key.split("|");
      const employee = store.employees.find((e) => e.id === employeeId)?.name || employeeId;
      const total = `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
      return { employee, date, total };
    });
    return rows;
  }, [store.attendance, store.employees, month]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Timesheets</h1>
        <p className="text-sm text-slate-600">Aggregated from attendance logs. Approve or export.
        </p>
      </div>

      <Card>
        <CardHeader title="Filters" />
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" placeholder="Month (YYYY-MM)" value={month} onChange={(e) => setMonth(e.target.value)} />
            <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm" onClick={() => setMonth("")}>Clear</button>
            <button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-blue-700" onClick={() => exportCsv(rows)}>Export CSV</button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Daily Totals" />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-600">
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Employee</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Date</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-800">{r.employee}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{r.date}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{r.total}</td>
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


