"use client";
import { useEffect, useState } from "react";
import type { LeaveType, LeaveRequestDoc } from "@/lib/firebase/services/leaves";
import { 
  createLeaveRequest,
  listenEmployeeLeaveRequests
} from "@/lib/firebase/services/leaves";

/**
 * Hook to create a new leave request
 * @returns Mutation function and loading/error states
 */
export function useCreateLeaveRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState(false);

  async function mutate(
    employeeId: string,
    type: LeaveType,
    from: string,
    to: string,
    reason?: string
  ) {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await createLeaveRequest(employeeId, type, from, to, reason);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Failed to create leave request"));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setLoading(false);
    setError(null);
    setSuccess(false);
  }

  return { mutate, loading, error, success, reset } as const;
}

/**
 * Hook to fetch and listen to employee leave requests
 * @param employeeId - Employee email
 * @param limitCount - Maximum number of records (default: 50)
 * @returns Leave requests data, loading state, and error
 */
export function useEmployeeLeaveRequests(employeeId?: string, limitCount: number = 50) {
  const [data, setData] = useState<LeaveRequestDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(!!employeeId);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!employeeId) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    
    const unsub = listenEmployeeLeaveRequests(
      employeeId,
      (docs) => {
        setData(docs);
        setLoading(false);
        // Don't clear index errors - user should see them even if data loads
      },
      (err) => {
        // Error callback - set error but data may still load via fallback
        setError(err);
        // Only stop loading if it's not an index error (fallback will handle it)
        if (!err.message?.includes("index")) {
          setLoading(false);
        }
      },
      limitCount
    );
    
    return () => unsub();
  }, [employeeId, limitCount]);

  return { data, loading, error } as const;
}

