import { ReactNode } from "react";

export function Card({ children, className = "", hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
	return (
		<div className={`rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 ${hover ? 'hover:shadow-md hover:border-slate-300' : ''} ${className}`}>
			{children}
		</div>
	);
}

export function CardHeader({ title, subtitle, action, icon }: { title: string; subtitle?: string; action?: ReactNode; icon?: ReactNode }) {
	return (
		<div className="mb-4 flex items-start justify-between gap-3">
			<div className="flex items-start gap-3 flex-1">
				{icon && <div className="mt-0.5 text-blue-600">{icon}</div>}
				<div className="flex-1">
					<h3 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h3>
					{subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
				</div>
			</div>
			{action && <div className="flex-shrink-0">{action}</div>}
		</div>
	);
}

export function CardContent({ children, className = "" }: { children: ReactNode; className?: string }) {
	return <div className={`text-slate-900 ${className}`}>{children}</div>;
}


