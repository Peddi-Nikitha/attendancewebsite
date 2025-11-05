"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useDataStore } from "@/lib/datastore";

export default function AdminLeavesPage() {
  const store = useDataStore();
  const [, force] = useState(0);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const unsub = store.subscribe(() => force((x) => x + 1));
    return () => unsub();
  }, [store]);

  const rows = useMemo(() => {
    return store.leaves
      .filter((r) => (!status || r.status === status))
      .map((r) => ({
        ...r,
        employee: store.employees.find((e) => e.id === r.employeeId)?.name || r.employeeId,
      }));
  }, [store.leaves, status, store.employees]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Leaves</h1>
        <p className="text-sm text-slate-600">Approve/Reject leave requests and view balances.
        </p>
      </div>

      <Card>
        <CardHeader title="Filters" />
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm" onClick={() => setStatus("")}>Clear</button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Leave Requests" />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-600">
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Employee</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Type</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">From</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">To</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Status</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-800">{r.employee}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{r.type}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{r.from}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{r.to}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{r.status}</td>
                    <td className="border-b border-slate-100 px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded border border-slate-200 px-2 py-1" onClick={() => store.approveLeave(r.id, "Approved")}>Approve</button>
                        <button className="rounded border border-slate-200 px-2 py-1" onClick={() => store.approveLeave(r.id, "Rejected")}>Reject</button>
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


