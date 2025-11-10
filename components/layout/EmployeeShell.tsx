import Header from "../layout/Header";
import Sidebar from "../layout/Sidebar";
import Footer from "../layout/Footer";

export default function EmployeeShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 text-slate-900">
			<Header />
			<div className="mx-auto grid max-w-7xl grid-cols-1 gap-0 px-0 sm:px-0 md:grid-cols-[16rem_1fr] md:px-6">
				<Sidebar />
				<main className="min-h-[calc(100dvh-5rem)] min-w-0 px-4 py-8 sm:px-6 lg:px-8">
					<div className="animate-fade-in">
						{children}
					</div>
				</main>
			</div>
			<Footer />
		</div>
	);
}


