"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useDataStore } from "@/lib/datastore";

export default function AdminPayslipsPage() {
  const store = useDataStore();
  const [, force] = useState(0);
  const [employee, setEmployee] = useState("");
  const [month, setMonth] = useState("");

  useEffect(() => {
    const unsub = store.subscribe(() => force((x) => x + 1));
    return () => unsub();
  }, [store]);

  const rows = useMemo(() => {
    return store.payslips
      .filter((p) => (!employee || p.employeeId === employee) && (!month || p.month === month))
      .map((p) => ({
        ...p,
        employee: store.employees.find((e) => e.id === p.employeeId)?.name || p.employeeId,
        net: p.basic + p.allowances + p.overtime - p.deductions,
      }));
  }, [store.payslips, employee, month, store.employees]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Payslips / Payroll</h1>
        <p className="text-sm text-slate-600">Auto-generate from attendance & leaves, download or print.</p>
      </div>

      <Card>
        <CardHeader title="Generate Payslip" />
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={employee} onChange={(e) => setEmployee(e.target.value)}>
              <option value="">Select Employee</option>
              {store.employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" placeholder="Month (YYYY-MM)" value={month} onChange={(e) => setMonth(e.target.value)} />
            <button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-blue-700" onClick={() => { if (!employee || !month) return; store.generatePayslip(employee, month); }}>Generate</button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Payslips" />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-600">
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Employee</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Month</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Basic</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Allowances</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Deductions</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Overtime</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Net Pay</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-800">{p.employee}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{p.month}</td>
                    <td className="border-b border-slate-100 px-3 py-2">₹ {p.basic.toLocaleString()}</td>
                    <td className="border-b border-slate-100 px-3 py-2">₹ {p.allowances.toLocaleString()}</td>
                    <td className="border-b border-slate-100 px-3 py-2">₹ {p.deductions.toLocaleString()}</td>
                    <td className="border-b border-slate-100 px-3 py-2">₹ {p.overtime.toLocaleString()}</td>
                    <td className="border-b border-slate-100 px-3 py-2 font-semibold">₹ {p.net.toLocaleString()}</td>
                    <td className="border-b border-slate-100 px-3 py-2">
                      <a className="rounded border border-slate-200 px-2 py-1" href="#">Download PDF</a>
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


