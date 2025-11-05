import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
	return (
		<div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
			{children}
		</div>
	);
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
	return (
		<div className="mb-3 flex items-start justify-between gap-2">
			<div>
				<h3 className="text-sm font-medium text-slate-700">{title}</h3>
				{subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
			</div>
			{action}
		</div>
	);
}

export function CardContent({ children }: { children: ReactNode }) {
	return <div className="text-slate-900">{children}</div>;
}


