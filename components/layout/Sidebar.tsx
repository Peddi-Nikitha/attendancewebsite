"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Home,
	Clock8,
	CalendarDays,
	BookOpenText,
	Leaf,
	Wallet,
	UserRound,
} from "lucide-react";

const nav = [
	{ href: "/employee", label: "Dashboard", icon: Home },
	{ href: "/employee/mark-attendance", label: "Mark Attendance", icon: Clock8 },
	{ href: "/employee/attendance-history", label: "Attendance History", icon: CalendarDays },
	{ href: "/employee/timesheet", label: "Timesheet", icon: BookOpenText },
	{ href: "/employee/leave", label: "Leave", icon: Leaf },
	{ href: "/employee/payslips", label: "Payslips", icon: Wallet },
	{ href: "/employee/profile", label: "Profile", icon: UserRound },
];

export default function Sidebar() {
	const pathname = usePathname();
	return (
		<aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 border-r border-slate-200 bg-white/80 px-3 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/60 md:block">
			<nav className="space-y-1">
				{nav.map((item) => {
					const Icon = item.icon;
					const active = pathname === item.href;
					return (
						<Link
							key={item.href}
							href={item.href}
							className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-slate-50 ${
								active ? "bg-slate-100 text-slate-900" : "text-slate-700"
							}`}
						>
							<Icon size={18} className="text-blue-600" />
							<span>{item.label}</span>
						</Link>
					);
				})}
			</nav>
			<div className="mt-4 rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-3 text-xs text-slate-600">
				<div className="font-medium text-slate-800">Tips</div>
				Use Check-In to start your day and Check-Out when leaving.
			</div>
		</aside>
	);
}


