import EmployeeShell from "@/components/layout/EmployeeShell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <EmployeeShell>{children}</EmployeeShell>;
}

