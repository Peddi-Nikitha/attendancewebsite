import Header from "../layout/Header";
import Sidebar from "../layout/Sidebar";
import Footer from "../layout/Footer";

export default function EmployeeShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-[100dvh] bg-slate-50 text-slate-900">
			<Header />
			<div className="mx-auto grid max-w-7xl grid-cols-1 gap-0 px-0 sm:px-0 md:grid-cols-[16rem_1fr] md:px-6">
				<Sidebar />
				<main className="min-h-[calc(100dvh-4rem)] min-w-0 bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
					{children}
				</main>
			</div>
			<Footer />
		</div>
	);
}


