"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ChevronDown, LogOut, KeyRound, UserRound } from "lucide-react";

export default function Header() {
	const [open, setOpen] = useState(false);

	return (
		<header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
			<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
				<Link href="/" className="flex items-center gap-2">
					<Image src="/next.svg" alt="AttendancePro" width={28} height={28} />
					<span className="font-semibold text-slate-800">AttendancePro</span>
				</Link>
				<div className="relative">
					<button
						className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:shadow transition"
						onClick={() => setOpen((v) => !v)}
					>
						<div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500" />
						<span className="hidden sm:block">Employee</span>
						<ChevronDown size={16} />
					</button>
					{open && (
						<div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
							<Link href="/employee/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
								<UserRound size={16} /> Profile
							</Link>
							<Link href="/(auth)/reset-password" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
								<KeyRound size={16} /> Change Password
							</Link>
							<button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:bg-slate-50">
								<LogOut size={16} /> Logout
							</button>
						</div>
					)}
				</div>
			</div>
		</header>
	);
}


