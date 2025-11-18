import AdminEmployeeDocumentsClient from "./AdminEmployeeDocumentsClient";

// For static export, generate a single fallback route
// The actual employee ID will be handled client-side via URL
export function generateStaticParams() {
  return [{ id: 'index' }];
}

export default function AdminEmployeeDocumentsPage({
  params,
}: {
  params: { id: string };
}) {
  return <AdminEmployeeDocumentsClient />;
}


