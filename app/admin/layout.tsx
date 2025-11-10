"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { logout } from "../../lib/auth";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Clock,
  Leaf,
  Wallet,
  Calendar,
  BarChart3,
  Briefcase,
  Settings,
  LogOut,
  User,
  ChevronDown,
} from "lucide-react";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/employees", label: "Employee Management", icon: Users },
  { href: "/admin/attendance", label: "Attendance", icon: ClipboardList },
  { href: "/admin/timesheets", label: "Timesheets", icon: Clock },
  { href: "/admin/leaves", label: "Leaves", icon: Leaf },
  { href: "/admin/payslips", label: "Payslips", icon: Wallet },
  { href: "/admin/holidays", label: "Holidays", icon: Calendar },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/projects", label: "Projects", icon: Briefcase },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 text-slate-900">
      <div className="flex">
        <aside className="hidden lg:flex lg:w-72 shrink-0 border-r border-slate-200/80 bg-white/80 backdrop-blur-sm sticky top-0 h-screen shadow-sm">
          <div className="flex flex-col w-full">
            <div className="h-20 px-6 flex items-center border-b border-slate-200/80 bg-gradient-to-r from-blue-600 to-indigo-600">
              <a href="/admin" className="flex items-center gap-3 group">
                <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm text-white grid place-items-center font-bold text-lg shadow-lg group-hover:bg-white/30 transition-colors">
                  A
                </div>
                <span className="font-bold text-white text-lg tracking-tight">AttendancePro</span>
              </a>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
              {nav.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                      active
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon size={20} className={active ? "text-white" : "text-slate-500"} />
                    <span className="truncate font-medium text-sm">{item.label}</span>
                  </a>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200/80 text-xs text-slate-500 bg-slate-50/50">
              © 2025 AttendancePro
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="h-20 bg-white/80 backdrop-blur-sm border-b border-slate-200/80 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-50 shadow-sm">
            <div className="flex items-center gap-3 lg:hidden">
              <a href="/admin" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center font-bold shadow-md">
                  A
                </div>
                <span className="font-semibold text-slate-900">AttendancePro</span>
              </a>
            </div>
            <div className="flex-1" />
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors group"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold shadow-md">
                  A
                </div>
                <span className="hidden sm:inline text-sm font-medium text-slate-700">Admin</span>
                <ChevronDown size={16} className={`text-slate-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in">
                    <a
                      href="/admin/profile"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-sm text-slate-700 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User size={16} className="text-slate-500" />
                      Profile
                    </a>
                    <button
                      className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-red-50 text-sm text-red-600 transition-colors"
                      onClick={() => {
                        logout();
                        window.location.href = "/login";
                      }}
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </header>

          <main className="px-4 lg:px-8 py-8">
            <div className="animate-fade-in">
              {children}
            </div>
          </main>

          <footer className="px-4 lg:px-8 py-4 text-xs text-slate-500 bg-white/80 backdrop-blur-sm border-t border-slate-200/80 lg:hidden">
            © 2025 AttendancePro
          </footer>
        </div>
      </div>
    </div>
  );
}




