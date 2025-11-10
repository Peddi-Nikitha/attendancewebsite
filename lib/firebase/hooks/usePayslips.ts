"use client";
import { useCallback, useEffect, useState } from 'react';
import { onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config';
import type { Payslip } from '../services/payslips';
import {
  generatePayslip,
  getPayslip,
  getPayslipsByEmployee,
  getAllPayslips,
  updatePayslip,
  deletePayslip,
  uploadPayslipFile,
  listenPayslipsByEmployee,
  listenAllPayslips,
} from '../services/payslips';

/**
 * Hook to get all payslips (admin view)
 */
export function useAllPayslips(filters?: {
  employeeId?: string;
  month?: string;
  year?: number;
  status?: Payslip['status'];
}) {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    let fallbackUnsub: (() => void) | null = null;
    let isUsingFallback = false;

    const unsub = listenAllPayslips(
      (data) => {
        setPayslips(data);
        setLoading(false);
      },
      filters,
      (err) => {
        // Check if it's an index error
        if (err?.code === 'failed-precondition' && err?.message?.includes('index')) {
          console.warn('Index not found for payslips query, using fallback (no server-side sorting):', err);
          
          // Fallback: query without orderBy, then sort in memory
          if (!isUsingFallback) {
            isUsingFallback = true;
            const col = collection(db, 'payslips');
            const clauses: any[] = [];
            
            if (filters?.employeeId) {
              clauses.push(where('employeeId', '==', filters.employeeId));
            }
            if (filters?.month) {
              clauses.push(where('month', '==', filters.month));
            }
            if (filters?.year) {
              clauses.push(where('year', '==', filters.year));
            }
            if (filters?.status) {
              clauses.push(where('status', '==', filters.status));
            }

            const qFallback = clauses.length ? query(col, ...clauses, limit(100)) : query(col, limit(100));
            
            fallbackUnsub = onSnapshot(
              qFallback,
              (snap) => {
                const docs = snap.docs.map((d) => ({
                  id: d.id,
                  ...(d.data() as any),
                })) as Payslip[];
                // Sort by month descending in memory
                docs.sort((a, b) => {
                  // Compare month strings (YYYY-MM format)
                  return b.month.localeCompare(a.month);
                });
                setPayslips(docs);
                setLoading(false);
              },
              (fallbackErr) => {
                console.error('Error in fallback payslips query:', fallbackErr);
                const error = fallbackErr instanceof Error ? fallbackErr : new Error('Failed to load payslips');
                setError(error);
                setLoading(false);
              }
            );
          }
          
          // Still set the error so user knows about index issue
          setError(err);
        } else {
          // Other errors
          console.error('Error loading payslips:', err);
          setError(err instanceof Error ? err : new Error('Failed to load payslips'));
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
  }, [filters?.employeeId, filters?.month, filters?.year, filters?.status]);

  return { data: payslips, loading, error };
}

/**
 * Hook to get payslips for a specific employee
 */
export function useEmployeePayslips(employeeId?: string) {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(!!employeeId);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!employeeId) {
      setPayslips([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    let fallbackUnsub: (() => void) | null = null;
    let isUsingFallback = false;

    const unsub = listenPayslipsByEmployee(
      employeeId,
      (data) => {
        setPayslips(data);
        setLoading(false);
      },
      (err) => {
        // Check if it's an index error
        if (err?.code === 'failed-precondition' && err?.message?.includes('index')) {
          console.warn('Index not found for employee payslips query, using fallback (no server-side sorting):', err);
          
          // Fallback: query without orderBy, then sort in memory
          if (!isUsingFallback) {
            isUsingFallback = true;
            const col = collection(db, 'payslips');
            const qFallback = query(
              col,
              where('employeeId', '==', employeeId),
              limit(50)
            );
            
            fallbackUnsub = onSnapshot(
              qFallback,
              (snap) => {
                const docs = snap.docs.map((d) => ({
                  id: d.id,
                  ...(d.data() as any),
                })) as Payslip[];
                // Sort by month descending in memory
                docs.sort((a, b) => {
                  // Compare month strings (YYYY-MM format)
                  return b.month.localeCompare(a.month);
                });
                setPayslips(docs);
                setLoading(false);
              },
              (fallbackErr) => {
                console.error('Error in fallback employee payslips query:', fallbackErr);
                const error = fallbackErr instanceof Error ? fallbackErr : new Error('Failed to load payslips');
                setError(error);
                setLoading(false);
              }
            );
          }
          
          // Still set the error so user knows about index issue
          setError(err);
        } else {
          // Other errors
          console.error('Error loading employee payslips:', err);
          setError(err instanceof Error ? err : new Error('Failed to load payslips'));
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
  }, [employeeId]);

  return { data: payslips, loading, error };
}

/**
 * Hook to generate a payslip
 */
export function useGeneratePayslip() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutate = useCallback(async (
    employeeId: string,
    month: string,
    generatedBy?: string
  ) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);
    
    try {
      const result = await generatePayslip(employeeId, month, generatedBy);
      setIsSuccess(true);
      return result;
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error('Failed to generate payslip');
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setIsSuccess(false);
  }, []);

  return { mutate, isLoading, error, isSuccess, reset };
}

/**
 * Hook to update a payslip
 */
export function useUpdatePayslip() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutate = useCallback(async (
    payslipId: string,
    updates: Partial<Payslip>
  ) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);
    
    try {
      const result = await updatePayslip(payslipId, updates);
      setIsSuccess(true);
      return result;
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error('Failed to update payslip');
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setIsSuccess(false);
  }, []);

  return { mutate, isLoading, error, isSuccess, reset };
}

/**
 * Hook to delete a payslip
 */
export function useDeletePayslip() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutate = useCallback(async (payslipId: string) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);
    
    try {
      await deletePayslip(payslipId);
      setIsSuccess(true);
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error('Failed to delete payslip');
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setIsSuccess(false);
  }, []);

  return { mutate, isLoading, error, isSuccess, reset };
}

/**
 * Hook to upload a payslip file
 */
export function useUploadPayslip() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutate = useCallback(async (
    employeeId: string,
    month: string,
    file: File,
    uploadedBy?: string
  ) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);
    
    try {
      const result = await uploadPayslipFile(employeeId, month, file, uploadedBy);
      setIsSuccess(true);
      return result;
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error('Failed to upload payslip');
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setIsSuccess(false);
  }, []);

  return { mutate, isLoading, error, isSuccess, reset };
}

