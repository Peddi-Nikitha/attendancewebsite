"use client";
import { useCallback, useEffect, useState } from 'react';
import { onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config';
import type { Employee } from '../services/employees';
import { createEmployee, updateEmployee, deleteEmployee } from '../services/employees';

export function useEmployees(filters?: {
  department?: string;
  managerId?: string;
  isActive?: boolean;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const col = collection(db, 'employees');
    const clauses: any[] = [];
    if (filters?.department) clauses.push(where('department', '==', filters.department));
    if (typeof filters?.isActive === 'boolean') clauses.push(where('isActive', '==', filters.isActive));
    if (filters?.managerId) clauses.push(where('managerId', '==', filters.managerId));
    
    // Try with orderBy first
    const qWithOrder = clauses.length 
      ? query(col, ...clauses, orderBy('createdAt', 'desc')) 
      : query(col, orderBy('createdAt', 'desc'));

    let fallbackUnsub: (() => void) | null = null;
    let isUsingFallback = false;

    const unsub = onSnapshot(
      qWithOrder,
      (snap) => {
        setEmployees(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Employee[]);
        setLoading(false);
      },
      (err: any) => {
        // Check if it's an index error
        if (err?.code === 'failed-precondition' && err?.message?.includes('index')) {
          console.warn('Index not found, using fallback query (no server-side sorting):', err);
          
          // Fallback: query without orderBy, then sort in memory
          if (!isUsingFallback) {
            isUsingFallback = true;
            const qFallback = clauses.length ? query(col, ...clauses) : query(col);
            
            fallbackUnsub = onSnapshot(
              qFallback,
              (snap2) => {
                const docs = snap2.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Employee[];
                // Sort by createdAt descending in memory
                docs.sort((a, b) => {
                  const aTime = a.createdAt?.toMillis?.() ?? 0;
                  const bTime = b.createdAt?.toMillis?.() ?? 0;
                  return bTime - aTime;
                });
                setEmployees(docs);
                setLoading(false);
              },
              (fallbackErr) => {
                console.error('Error in fallback query:', fallbackErr);
                const error = fallbackErr instanceof Error ? fallbackErr : new Error('Failed to load employees');
                setError(error);
                setLoading(false);
              }
            );
          }
          
          // Still set the error so user knows about index issue
          setError(err);
        } else {
          // Other errors
          console.error('Error loading employees:', err);
          setError(err instanceof Error ? err : new Error('Failed to load employees'));
          setLoading(false);
        }
      }
    );

    return () => {
      unsub();
      if (fallbackUnsub) {
        fallbackUnsub();
      }
    };
  }, [filters?.department, filters?.isActive, filters?.managerId]);

  return { employees, loading, error };
}

export function useCreateEmployee() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutate = useCallback(async (payload: Parameters<typeof createEmployee>[0]) => {
    setIsLoading(true); setError(null); setIsSuccess(false);
    try {
      const res = await createEmployee(payload);
      setIsSuccess(true);
      return res;
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error('Failed to create employee');
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => { setError(null); setIsSuccess(false); }, []);
  return { mutate, isLoading, error, isSuccess, reset };
}

export function useUpdateEmployee() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const mutate = useCallback(async (id: string, updates: Parameters<typeof updateEmployee>[1]) => {
    setIsLoading(true); setError(null); setIsSuccess(false);
    try {
      const res = await updateEmployee(id, updates);
      setIsSuccess(true);
      return res;
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error('Failed to update employee');
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  const reset = useCallback(() => { setError(null); setIsSuccess(false); }, []);
  return { mutate, isLoading, error, isSuccess, reset };
}

export function useDeleteEmployee() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const mutate = useCallback(async (id: string, soft = true) => {
    setIsLoading(true); setError(null); setIsSuccess(false);
    try {
      const res = await deleteEmployee(id, soft);
      setIsSuccess(true);
      return res;
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error('Failed to delete employee');
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  const reset = useCallback(() => { setError(null); setIsSuccess(false); }, []);
  return { mutate, isLoading, error, isSuccess, reset };
}

export function useEmployeeByUserId(userId?: string) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) { setEmployee(null); setLoading(false); return; }
    setLoading(true); setError(null);
    const col = collection(db, 'employees');
    const q = query(col, where('userId', '==', userId), limit(1));
    const unsub = onSnapshot(q, (snap) => {
      const doc = snap.docs[0];
      setEmployee(doc ? ({ id: doc.id, ...(doc.data() as any) } as Employee) : null);
      setLoading(false);
    }, (err) => { setError(err); setLoading(false); });
    return () => unsub();
  }, [userId]);

  return { employee, loading, error } as const;
}

export function useEmployeeByEmail(email?: string) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState<boolean>(!!email);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!email) { setEmployee(null); setLoading(false); return; }
    setLoading(true); setError(null);
    const col = collection(db, 'employees');
    const q = query(col, where('email', '==', email.toLowerCase()), limit(1));
    const unsub = onSnapshot(q, async (snap) => {
      const docSnap = snap.docs[0];
      if (!docSnap) {
        setEmployee(null);
        setLoading(false);
        return;
      }
      const e = ({ id: docSnap.id, ...(docSnap.data() as any) } as Employee);
      // If leaveBalance missing, set defaults once
      if (!e.leaveBalance) {
        try {
          await updateEmployee(e.id, { leaveBalance: { casual: 10, sick: 10, privilege: 10 } });
        } catch {}
        // Optimistically reflect defaults in UI immediately
        e.leaveBalance = { casual: 10, sick: 10, privilege: 10 };
      }
      setEmployee(e);
      setLoading(false);
    }, (err) => { setError(err); setLoading(false); });
    return () => unsub();
  }, [email]);

  return { employee, loading, error } as const;
}






