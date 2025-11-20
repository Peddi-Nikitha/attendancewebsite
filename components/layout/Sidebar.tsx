"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
	Menu,
	X,
} from "lucide-react";

const nav = [
	{ href: "/employee", label: "Dashboard", icon: Home },
	{ href: "/employee-mark-attendance", label: "Mark Attendance", icon: Clock8 },
	{ href: "/employee-attendance-history", label: "Attendance History", icon: CalendarDays },
	{ href: "/employee-timesheet", label: "Timesheet", icon: BookOpenText },
	{ href: "/employee-leave", label: "Leave", icon: Leaf },
	{ href: "/employee-payslips", label: "Payslips", icon: Wallet },
	{ href: "/employee-documents", label: "My Documents", icon: FileText },
	{ href: "/employee-profile", label: "Profile", icon: UserRound },
	{ href: "/employee-projects", label: "My Projects", icon: Briefcase },
];

export default function Sidebar() {
	const pathname = usePathname();
	const router = useRouter();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	// Close mobile menu when pathname changes
	useEffect(() => {
		setMobileMenuOpen(false);
	}, [pathname]);

	// Helper function to check if a route is active (handles trailing slashes)
	const isActive = (href: string) => {
		const normalizedPathname = pathname?.replace(/\/$/, '') || '';
		const normalizedHref = href.replace(/\/$/, '');
		return normalizedPathname === normalizedHref;
	};

	// Handle navigation - use router.push to ensure it works
	const handleNavigation = (href: string) => {
		setMobileMenuOpen(false);
		
		// Always navigate using router.push
		// This works for both same-page and different-page navigation
		router.push(href);
		
		// If already on the same page, scroll to top to provide visual feedback
		const normalizedPathname = pathname?.replace(/\/$/, '') || '';
		const normalizedHref = href.replace(/\/$/, '');
		if (normalizedPathname === normalizedHref) {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	};

	const NavLinks = () => (
		<nav className="space-y-1.5">
			{nav.map((item) => {
				const Icon = item.icon;
				const active = isActive(item.href);
				return (
					<button
						type="button"
						key={item.href}
						onClick={() => handleNavigation(item.href)}
						className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer text-left ${
							active 
								? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30" 
								: "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
						}`}
					>
						<Icon size={20} className={active ? "text-white" : "text-slate-500"} />
						<span>{item.label}</span>
					</button>
				);
			})}
		</nav>
	);

	return (
		<>
			{/* Mobile Menu Button */}
			<button
				onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
				className="fixed left-4 z-50 md:hidden p-2 rounded-lg bg-white border border-slate-200 shadow-md hover:shadow-lg transition-all"
				aria-label="Toggle menu"
				style={{ top: '5.5rem' }}
			>
				{mobileMenuOpen ? (
					<X size={24} className="text-slate-700" />
				) : (
					<Menu size={24} className="text-slate-700" />
				)}
			</button>

			{/* Mobile Menu Overlay */}
			{mobileMenuOpen && (
				<>
					<div 
						className="fixed inset-0 bg-black/50 z-40 md:hidden"
						onClick={() => setMobileMenuOpen(false)}
					/>
					<aside className="fixed top-20 left-0 h-[calc(100vh-5rem)] w-64 z-50 bg-white border-r border-slate-200 shadow-xl md:hidden overflow-y-auto">
						<div className="p-4">
							<NavLinks />
							<div className="mt-6 rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 text-xs text-slate-700 shadow-sm">
								<div className="flex items-start gap-2 mb-2">
									<Lightbulb size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
									<div>
										<div className="font-semibold text-slate-900 mb-1">Quick Tip</div>
										<p className="text-slate-600 leading-relaxed">Use Check-In to start your day and Check-Out when leaving.</p>
									</div>
								</div>
							</div>
						</div>
					</aside>
				</>
			)}

			{/* Desktop Sidebar */}
			<aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 border-r border-slate-200/80 bg-white/80 px-4 py-6 backdrop-blur-sm supports-[backdrop-filter]:bg-white/80 md:block shadow-sm">
				<NavLinks />
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
		</>
	);
}


