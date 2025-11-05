"use client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const months = [
  { month: "October 2025", file: "/payslips/2025-10.pdf" },
  { month: "September 2025", file: "/payslips/2025-09.pdf" },
  { month: "August 2025", file: "/payslips/2025-08.pdf" },
];

export default function EmployeePayslipsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Payslips</h1>
        <p className="text-sm text-slate-600">Monthly payslip list with download (PDF) option.</p>
      </div>

      <Card>
        <CardHeader title="Available Payslips" />
        <CardContent>
          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {months.map((m) => (
              <div key={m.month} className="flex items-center justify-between px-4 py-3">
                <div className="text-sm font-medium text-slate-800">{m.month}</div>
                <a href={m.file} download className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-blue-700">Download PDF</a>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


