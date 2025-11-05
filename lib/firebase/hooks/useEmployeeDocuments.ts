"use client";
import { useCallback, useEffect, useState } from "react";
import type { EmployeeDocument } from "../services/employeeDocuments";
import { listEmployeeDocuments, uploadEmployeeDocument, deleteEmployeeDocument } from "../services/employeeDocuments";

export function useEmployeeDocuments(employeeId?: string) {
  const [docs, setDocs] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(!!employeeId);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!employeeId) { setDocs([]); setLoading(false); return; }
    setLoading(true); setError(null);
    listEmployeeDocuments(employeeId).then((d) => {
      if (!mounted) return; setDocs(d); setLoading(false);
    }).catch((e) => { if (!mounted) return; setError(e instanceof Error ? e : new Error("Failed to load documents")); setLoading(false); });
    return () => { mounted = false; };
  }, [employeeId]);

  return { docs, loading, error, refresh: async () => {
    if (!employeeId) return; const d = await listEmployeeDocuments(employeeId); setDocs(d);
  }} as const;
}

export function useUploadEmployeeDocument() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutate = useCallback(async (employeeId: string, name: string, file: File) => {
    setIsLoading(true); setError(null); setIsSuccess(false);
    try {
      const res = await uploadEmployeeDocument(employeeId, name, file);
      setIsSuccess(true);
      return res;
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Failed to upload document");
      setError(err); throw err;
    } finally { setIsLoading(false); }
  }, []);

  const reset = useCallback(() => { setError(null); setIsSuccess(false); }, []);
  return { mutate, isLoading, error, isSuccess, reset } as const;
}

export function useDeleteEmployeeDocument() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutate = useCallback(async (docId: string, filePath?: string) => {
    setIsLoading(true); setError(null); setIsSuccess(false);
    try {
      await deleteEmployeeDocument(docId, filePath);
      setIsSuccess(true);
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Failed to delete document");
      setError(err); throw err;
    } finally { setIsLoading(false); }
  }, []);

  const reset = useCallback(() => { setError(null); setIsSuccess(false); }, []);
  return { mutate, isLoading, error, isSuccess, reset } as const;
}


