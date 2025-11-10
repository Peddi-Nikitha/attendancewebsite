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
	Briefcase,
	FileText,
	Lightbulb,
} from "lucide-react";

const nav = [
	{ href: "/employee", label: "Dashboard", icon: Home },
	{ href: "/employee/mark-attendance", label: "Mark Attendance", icon: Clock8 },
	{ href: "/employee/attendance-history", label: "Attendance History", icon: CalendarDays },
	{ href: "/employee/timesheet", label: "Timesheet", icon: BookOpenText },
	{ href: "/employee/leave", label: "Leave", icon: Leaf },
	{ href: "/employee/payslips", label: "Payslips", icon: Wallet },
	{ href: "/employee/documents", label: "My Documents", icon: FileText },
	{ href: "/employee/profile", label: "Profile", icon: UserRound },
	{ href: "/employee/projects", label: "My Projects", icon: Briefcase },
];

export default function Sidebar() {
	const pathname = usePathname();
	return (
		<aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 border-r border-slate-200/80 bg-white/80 px-4 py-6 backdrop-blur-sm supports-[backdrop-filter]:bg-white/80 md:block shadow-sm">
			<nav className="space-y-1.5">
				{nav.map((item) => {
					const Icon = item.icon;
					const active = pathname === item.href;
					return (
						<Link
							key={item.href}
							href={item.href}
							className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
								active 
									? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30" 
									: "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
							}`}
						>
							<Icon size={20} className={active ? "text-white" : "text-slate-500"} />
							<span>{item.label}</span>
						</Link>
					);
				})}
			</nav>
			<div className="mt-6 rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 text-xs text-slate-700 shadow-sm">
				<div className="flex items-start gap-2 mb-2">
					<Lightbulb size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
					<div>
						<div className="font-semibold text-slate-900 mb-1">Quick Tip</div>
						<p className="text-slate-600 leading-relaxed">Use Check-In to start your day and Check-Out when leaving.</p>
					</div>
				</div>
			</div>
		</aside>
	);
}


