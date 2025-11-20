"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useDataStore } from "@/lib/datastore";

export default function AdminReportsPage() {
  const store = useDataStore();
  const [, force] = useState(0);
  const [employee, setEmployee] = useState("");
  const [month, setMonth] = useState("");
  const [department, setDepartment] = useState("");

  useEffect(() => {
    const unsub = store.subscribe(() => force((x) => x + 1));
    return () => unsub();
  }, [store]);

  const attendanceSummary = useMemo(() => {
    const filterEmployeeIds = store.employees
      .filter((e) => (!department || e.department === department) && (!employee || e.id === employee))
      .map((e) => e.id);
    const daily = store.attendance.filter((l) => (!month || l.date.startsWith(month)) && (!employee || filterEmployeeIds.includes(l.employeeId)));
    const present = daily.filter((d) => d.checkIn && d.checkOut).length;
    const late = daily.filter((d) => d.checkIn && !d.checkOut).length;
    const total = daily.length;
    return { total, present, late, absent: Math.max(0, total - (present + late)) };
  }, [store.attendance, store.employees, employee, month, department]);

  const leaveUtilization = useMemo(() => {
    const rows = store.leaves.filter((l) => (!employee || l.employeeId === employee) && (!month || l.from.startsWith(month)));
    return {
      pending: rows.filter((r) => r.status === "Pending").length,
      approved: rows.filter((r) => r.status === "Approved").length,
      rejected: rows.filter((r) => r.status === "Rejected").length,
    };
  }, [store.leaves, employee, month]);

  const payrollOverview = useMemo(() => {
    const rows = store.payslips.filter((p) => (!employee || p.employeeId === employee) && (!month || p.month === month));
    const total = rows.reduce((acc, p) => acc + (p.basic + p.allowances + p.overtime - p.deductions), 0);
    return { count: rows.length, total };
  }, [store.payslips, employee, month]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-600">Attendance Summary • Leave Utilization • Payroll Overview</p>
      </div>

      <Card>
        <CardHeader title="Filters" />
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={employee} onChange={(e) => setEmployee(e.target.value)}>
              <option value="">All Employees</option>
              {store.employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" placeholder="Month (YYYY-MM)" value={month} onChange={(e) => setMonth(e.target.value)} />
            <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} />
            <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm" onClick={() => { setEmployee(""); setMonth(""); setDepartment(""); }}>Clear</button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader title="Attendance Summary" />
          <CardContent>
            <div className="text-sm">Present: <span className="font-semibold text-green-600">{attendanceSummary.present}</span></div>
            <div className="text-sm">Absent: <span className="font-semibold text-rose-600">{attendanceSummary.absent}</span></div>
            <div className="text-sm">Late/Ongoing: <span className="font-semibold text-amber-600">{attendanceSummary.late}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Leave Utilization" />
          <CardContent>
            <div className="text-sm">Approved: <span className="font-semibold text-green-600">{leaveUtilization.approved}</span></div>
            <div className="text-sm">Pending: <span className="font-semibold text-amber-600">{leaveUtilization.pending}</span></div>
            <div className="text-sm">Rejected: <span className="font-semibold text-rose-600">{leaveUtilization.rejected}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Payroll Overview" />
          <CardContent>
            <div className="text-sm">Payslips: <span className="font-semibold">{payrollOverview.count}</span></div>
            <div className="text-sm">Total Payout: <span className="font-semibold">₹ {payrollOverview.total.toLocaleString()}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


