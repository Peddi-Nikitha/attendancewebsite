"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { ChevronDown, LogOut, KeyRound, UserRound } from "lucide-react";
import { logout } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function Header() {
	const [open, setOpen] = useState(false);
	const router = useRouter();

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (open && !(event.target as Element).closest('.user-menu-container')) {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [open]);

	return (
		<header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-sm supports-[backdrop-filter]:bg-white/80 shadow-sm">
			<div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
				<Link href="/employee" className="flex items-center gap-3 group">
					<div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center font-bold text-lg shadow-md group-hover:shadow-lg transition-shadow">
						A
					</div>
					<span className="font-bold text-slate-900 text-lg tracking-tight">AttendancePro</span>
				</Link>
				<div className="relative user-menu-container">
					<button
						className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all"
						onClick={() => setOpen((v) => !v)}
					>
						<div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold shadow-sm" />
						<span className="hidden sm:block">Employee</span>
						<ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
					</button>
					{open && (
						<>
							<div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
							<div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl z-50 animate-fade-in">
								<Link 
									href="/employee-profile" 
									className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
									onClick={() => setOpen(false)}
								>
									<UserRound size={16} className="text-slate-500" /> Profile
								</Link>
								<Link 
									href="/(auth)/reset-password" 
									className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
									onClick={() => setOpen(false)}
								>
									<KeyRound size={16} className="text-slate-500" /> Change Password
								</Link>
								<button 
									className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
									onClick={() => {
										logout();
										window.location.href = "/login";
									}}
								>
									<LogOut size={16} /> Logout
								</button>
							</div>
						</>
					)}
				</div>
			</div>
		</header>
	);
}


