"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AttendanceDoc, GpsLocation } from "@/lib/firebase/services/attendance";
import { 
  listenTodayAttendance, 
  checkIn as svcCheckIn, 
  checkOut as svcCheckOut,
  listenEmployeeAttendanceRecords
} from "@/lib/firebase/services/attendance";

export function useAttendanceToday(employeeId?: string) {
  const [data, setData] = useState<AttendanceDoc | null>(null);
  const [loading, setLoading] = useState<boolean>(!!employeeId);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!employeeId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const unsub = listenTodayAttendance(employeeId, (doc) => {
      setData(doc);
      setLoading(false);
    });
    return () => unsub();
  }, [employeeId]);

  const checkedIn = useMemo(() => !!(data?.checkIn && !data?.checkOut), [data]);

  return { data, loading, error, checkedIn } as const;
}

export function useCheckIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState(false);

  async function mutate(employeeId: string, gps?: GpsLocation) {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await svcCheckIn(employeeId, gps);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Failed to check in"));
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

export function useCheckOut() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState(false);

  async function mutate(employeeId: string, gps?: GpsLocation) {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await svcCheckOut(employeeId, gps);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Failed to check out"));
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

export function useEmployeeAttendanceRecords(employeeId?: string, limitCount: number = 30) {
  const [data, setData] = useState<AttendanceDoc[]>([]);
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
    
    const unsub = listenEmployeeAttendanceRecords(
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


