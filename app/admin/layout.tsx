"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { logout } from "../../lib/auth";

const nav = [
  { href: "/admin", label: "Dashboard", icon: "🏠" },
  { href: "/admin/employees", label: "Employee Management", icon: "👥" },
  { href: "/admin/attendance", label: "Attendance", icon: "📋" },
  { href: "/admin/timesheets", label: "Timesheets", icon: "⏱️" },
  { href: "/admin/leaves", label: "Leaves", icon: "🌿" },
  { href: "/admin/payslips", label: "Payslips", icon: "💰" },
  { href: "/admin/holidays", label: "Holidays", icon: "🎉" },
  { href: "/admin/reports", label: "Reports", icon: "📊" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="flex">
        <aside className="hidden lg:flex lg:w-72 shrink-0 border-r bg-white sticky top-0 h-screen">
          <div className="flex flex-col w-full">
            <div className="h-16 px-5 flex items-center border-b">
              <a href="/admin" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-md bg-blue-600 text-white grid place-items-center font-bold">A</div>
                <span className="font-semibold">AttendancePro</span>
              </a>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {nav.map((item) => {
                const active = pathname === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors border ${
                      active
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "bg-white hover:bg-neutral-50 border-neutral-200"
                    }`}
                  >
                    <span className="text-lg" aria-hidden>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </a>
                );
              })}
            </nav>
            <div className="p-4 border-t text-xs text-neutral-500">© 2025 AttendancePro | Powered by FlutterFlow / React</div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="h-16 bg-white border-b px-4 lg:px-8 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3 lg:hidden">
              <a href="/admin" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-md bg-blue-600 text-white grid place-items-center font-bold">A</div>
                <span className="font-semibold">AttendancePro</span>
              </a>
            </div>
            <div className="flex-1" />
            <details className="relative">
              <summary className="list-none flex items-center gap-3 cursor-pointer select-none">
                <img src="/vercel.svg" alt="avatar" className="h-8 w-8 rounded-full border" />
                <span className="hidden sm:inline text-sm">Admin</span>
              </summary>
              <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg overflow-hidden">
                <a href="/admin/profile" className="block px-3 py-2 hover:bg-neutral-50 text-sm">Profile</a>
                <button
                  className="block w-full text-left px-3 py-2 hover:bg-neutral-50 text-sm"
                  onClick={() => {
                    logout();
                    window.location.href = "/login";
                  }}
                >
                  Logout
                </button>
              </div>
            </details>
          </header>

          <main className="px-4 lg:px-8 py-6">
            {children}
          </main>

          <footer className="px-4 lg:px-8 py-4 text-xs text-neutral-500 bg-white border-t lg:hidden">
            © 2025 AttendancePro | Powered by FlutterFlow / React
          </footer>
        </div>
      </div>
    </div>
  );
}




