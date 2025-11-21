import { db } from "@/lib/firebase/config";
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";

export type GpsLocation = { latitude: number; longitude: number };

export type AttendanceDoc = {
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: "present" | "absent" | "half-day" | "holiday" | "leave" | "weekend";
  checkIn?: {
    timestamp: Timestamp;
    location?: GpsLocation;
    method: "manual" | "gps" | "qr" | "system";
  };
  checkOut?: {
    timestamp: Timestamp;
    location?: GpsLocation;
    method: "manual" | "gps" | "qr" | "system";
  };
  lunchBreak?: {
    start: Timestamp;
    end?: Timestamp;
    duration?: number; // hours (decimal) - calculated when end is set
  };
  totalHours?: number; // hours (decimal) - excludes lunch break time
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

function toYmdLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function attendanceDocRef(employeeId: string, d: Date = new Date()) {
  const date = toYmdLocal(d);
  const id = `${employeeId}_${date}`;
  return doc(collection(db, "attendance"), id);
}

export async function getTodayAttendance(employeeId: string) {
  const ref = attendanceDocRef(employeeId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as AttendanceDoc) : null;
}

export function listenTodayAttendance(
  employeeId: string,
  callback: (doc: AttendanceDoc | null) => void
): Unsubscribe {
  const ref = attendanceDocRef(employeeId);
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? (snap.data() as AttendanceDoc) : null);
  });
}

export async function checkIn(employeeId: string, gps?: GpsLocation) {
  const ref = attendanceDocRef(employeeId);
  await runTransaction(db, async (tx) => {
    const curr = await tx.get(ref);
    const now = new Date();
    const date = toYmdLocal(now);

    const checkInData: any = {
      timestamp: serverTimestamp(),
      method: gps ? "gps" : "manual",
    };
    if (gps) {
      checkInData.location = gps;
    }

    if (!curr.exists()) {
      // First check-in of the day
      tx.set(ref, {
        employeeId,
        date,
        status: "present",
        checkIn: checkInData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as Partial<AttendanceDoc>);
    } else {
      const data = curr.data() as AttendanceDoc;
      // If already checked in and not checked out, don't allow another check-in
      if (data.checkIn && !data.checkOut) {
        throw new Error("Already checked in. Please check out first.");
      }
      
      // Allow check-in if checked out (start new cycle) or if no check-in exists
      const updateData: any = {
        status: "present",
        checkIn: checkInData,
        updatedAt: serverTimestamp(),
      };
      
      // If checking in after checkout, clear the previous checkout and lunch break to start a new cycle
      if (data.checkOut) {
        updateData.checkOut = deleteField(); // Clear previous checkout
        updateData.totalHours = deleteField(); // Clear previous total hours
        updateData.lunchBreak = deleteField(); // Clear previous lunch break
      }
      
      tx.set(ref, updateData, { merge: true });
    }
  });
}

export async function checkOut(employeeId: string, gps?: GpsLocation) {
  const ref = attendanceDocRef(employeeId);
  await runTransaction(db, async (tx) => {
    const curr = await tx.get(ref);
    if (!curr.exists()) {
      throw new Error("No check-in found for today");
    }
    const data = curr.data() as AttendanceDoc;
    if (!data.checkIn) {
      throw new Error("No check-in found for today");
    }
    // Allow check-out if checked in (multiple check-outs are allowed as long as checked in again)

    // Calculate total hours for this check-in cycle, excluding lunch break time
    let totalHours: number | undefined;
    try {
      const inMs = data.checkIn.timestamp.toMillis();
      const outMs = Date.now();
      let diffHours = (outMs - inMs) / (1000 * 60 * 60);
      
      // Subtract lunch break duration if it exists and has ended
      if (data.lunchBreak?.start && data.lunchBreak?.end) {
        const lunchStartMs = data.lunchBreak.start.toMillis();
        const lunchEndMs = data.lunchBreak.end.toMillis();
        const lunchHours = (lunchEndMs - lunchStartMs) / (1000 * 60 * 60);
        diffHours -= lunchHours;
      } else if (data.lunchBreak?.start && !data.lunchBreak?.end) {
        // If lunch break is still active, subtract time from start to now
        const lunchStartMs = data.lunchBreak.start.toMillis();
        const lunchHours = (outMs - lunchStartMs) / (1000 * 60 * 60);
        diffHours -= lunchHours;
      }
      
      totalHours = Math.max(0, Number(diffHours.toFixed(2)));
    } catch {
      totalHours = undefined;
    }

    const checkOutData: any = {
      timestamp: serverTimestamp(),
      method: gps ? "gps" : "manual",
    };
    if (gps) {
      checkOutData.location = gps;
    }
    
    const updateData: any = {
      checkOut: checkOutData,
      updatedAt: serverTimestamp(),
    };
    if (totalHours !== undefined) {
      updateData.totalHours = totalHours;
    }
    
    tx.set(ref, updateData, { merge: true });
  });
}

/**
 * Start lunch break for an employee
 * @param employeeId - Employee ID (email)
 */
export async function startLunchBreak(employeeId: string) {
  const ref = attendanceDocRef(employeeId);
  await runTransaction(db, async (tx) => {
    const curr = await tx.get(ref);
    if (!curr.exists()) {
      throw new Error("No check-in found for today");
    }
    const data = curr.data() as AttendanceDoc;
    if (!data.checkIn) {
      throw new Error("No check-in found for today");
    }
    if (data.checkOut) {
      throw new Error("Cannot start lunch break after check-out");
    }
    if (data.lunchBreak?.start && !data.lunchBreak?.end) {
      throw new Error("Lunch break already started. Please end it first.");
    }
    
    const updateData: any = {
      lunchBreak: {
        start: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    };
    
    tx.set(ref, updateData, { merge: true });
  });
}

/**
 * End lunch break for an employee
 * @param employeeId - Employee ID (email)
 */
export async function endLunchBreak(employeeId: string) {
  const ref = attendanceDocRef(employeeId);
  await runTransaction(db, async (tx) => {
    const curr = await tx.get(ref);
    if (!curr.exists()) {
      throw new Error("No check-in found for today");
    }
    const data = curr.data() as AttendanceDoc;
    if (!data.lunchBreak?.start) {
      throw new Error("No lunch break started");
    }
    if (data.lunchBreak?.end) {
      throw new Error("Lunch break already ended");
    }
    
    // Calculate lunch break duration
    let duration: number | undefined;
    try {
      const startMs = data.lunchBreak.start.toMillis();
      const endMs = Date.now();
      duration = Math.max(0, Number(((endMs - startMs) / (1000 * 60 * 60)).toFixed(2)));
    } catch {
      duration = undefined;
    }
    
    const updateData: any = {
      lunchBreak: {
        start: data.lunchBreak.start,
        end: serverTimestamp(),
        ...(duration !== undefined && { duration }),
      },
      updatedAt: serverTimestamp(),
    };
    
    tx.set(ref, updateData, { merge: true });
  });
}

/**
 * Fetch attendance records for an employee within a date range
 * @param employeeId - Employee ID (email)
 * @param limitCount - Maximum number of records to fetch (default: 30)
 * @returns Array of attendance documents
 */
export async function getEmployeeAttendanceRecords(
  employeeId: string,
  limitCount: number = 30
): Promise<AttendanceDoc[]> {
  const attendanceRef = collection(db, "attendance");
  const q = query(
    attendanceRef,
    where("employeeId", "==", employeeId),
    orderBy("date", "desc"),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as AttendanceDoc);
}

/**
 * Listen to attendance records for an employee
 * @param employeeId - Employee ID (email)
 * @param callback - Callback function that receives array of attendance documents
 * @param errorCallback - Optional callback for errors
 * @param limitCount - Maximum number of records to fetch (default: 30)
 * @returns Unsubscribe function
 */
export function listenEmployeeAttendanceRecords(
  employeeId: string,
  callback: (docs: AttendanceDoc[]) => void,
  errorCallback?: (error: Error) => void,
  limitCount: number = 30
): Unsubscribe {
  const attendanceRef = collection(db, "attendance");
  
  // Try with index first (with orderBy)
  const qWithOrder = query(
    attendanceRef,
    where("employeeId", "==", employeeId),
    orderBy("date", "desc"),
    limit(limitCount)
  );
  
  let fallbackUnsubscribe: Unsubscribe | null = null;
  let isUsingFallback = false;
  
  const unsubscribe = onSnapshot(
    qWithOrder,
    (snapshot) => {
      const docs = snapshot.docs.map((doc) => doc.data() as AttendanceDoc);
      callback(docs);
    },
    (error: any) => {
      // Check if it's an index error
      if (error?.code === "failed-precondition" && error?.message?.includes("index")) {
        console.warn("Index not found, using fallback query (no server-side sorting):", error);
        
        // Fallback: query without orderBy, then sort in memory
        if (!isUsingFallback) {
          isUsingFallback = true;
          const qFallback = query(
            attendanceRef,
            where("employeeId", "==", employeeId)
          );
          
          fallbackUnsubscribe = onSnapshot(
            qFallback,
            (snapshot) => {
              const docs = snapshot.docs.map((doc) => doc.data() as AttendanceDoc);
              // Sort by date descending in memory
              docs.sort((a, b) => {
                if (a.date > b.date) return -1;
                if (a.date < b.date) return 1;
                return 0;
              });
              // Limit in memory
              callback(docs.slice(0, limitCount));
            },
            (fallbackError) => {
              console.error("Error in fallback query:", fallbackError);
              const err = fallbackError instanceof Error 
                ? fallbackError 
                : new Error("Failed to load attendance records");
              if (errorCallback) {
                errorCallback(err);
              } else {
                callback([]);
              }
            }
          );
        }
        
        // Pass the original error with index link
        if (errorCallback) {
          errorCallback(error);
        }
      } else {
        // Other errors
        console.error("Error listening to attendance records:", error);
        const err = error instanceof Error ? error : new Error("Failed to load attendance records");
        if (errorCallback) {
          errorCallback(err);
        } else {
          callback([]);
        }
      }
    }
  );
  
  return () => {
    unsubscribe();
    if (fallbackUnsubscribe) {
      fallbackUnsubscribe();
    }
  };
}

/**
 * Listen to all attendance records (for admin dashboard)
 * @param callback - Callback function that receives array of attendance documents
 * @param errorCallback - Optional callback for errors
 * @param limitCount - Maximum number of records to fetch (default: 1000)
 * @returns Unsubscribe function
 */
export function listenAllAttendanceRecords(
  callback: (docs: AttendanceDoc[]) => void,
  errorCallback?: (error: Error) => void,
  limitCount: number = 1000
): Unsubscribe {
  const attendanceRef = collection(db, "attendance");
  
  // Try with index first (with orderBy)
  const qWithOrder = query(
    attendanceRef,
    orderBy("date", "desc"),
    limit(limitCount)
  );
  
  let fallbackUnsubscribe: Unsubscribe | null = null;
  let isUsingFallback = false;
  
  const unsubscribe = onSnapshot(
    qWithOrder,
    (snapshot) => {
      const docs = snapshot.docs.map((doc) => doc.data() as AttendanceDoc);
      callback(docs);
    },
    (error: any) => {
      // Check if it's an index error
      if (error?.code === "failed-precondition" && error?.message?.includes("index")) {
        console.warn("Index not found, using fallback query (no server-side sorting):", error);
        
        // Fallback: query without orderBy, then sort in memory
        if (!isUsingFallback) {
          isUsingFallback = true;
          const qFallback = query(attendanceRef);
          
          fallbackUnsubscribe = onSnapshot(
            qFallback,
            (snapshot) => {
              const docs = snapshot.docs.map((doc) => doc.data() as AttendanceDoc);
              // Sort by date descending in memory
              docs.sort((a, b) => {
                if (a.date > b.date) return -1;
                if (a.date < b.date) return 1;
                return 0;
              });
              // Limit in memory
              callback(docs.slice(0, limitCount));
            },
            (fallbackError) => {
              console.error("Error in fallback query:", fallbackError);
              const err = fallbackError instanceof Error 
                ? fallbackError 
                : new Error("Failed to load attendance records");
              if (errorCallback) {
                errorCallback(err);
              } else {
                callback([]);
              }
            }
          );
        }
        
        // Pass the original error with index link
        if (errorCallback) {
          errorCallback(error);
        }
      } else {
        // Other errors
        console.error("Error listening to attendance records:", error);
        const err = error instanceof Error ? error : new Error("Failed to load attendance records");
        if (errorCallback) {
          errorCallback(err);
        } else {
          callback([]);
        }
      }
    }
  );
  
  return () => {
    unsubscribe();
    if (fallbackUnsubscribe) {
      fallbackUnsubscribe();
    }
  };
}

/**
 * Bulk import attendance records from CSV data
 * @param records - Array of attendance records to import
 * @returns Object with success count, error count, and errors array
 */
export async function bulkImportAttendance(records: Array<{
  employeeId: string; // Employee email or employeeId
  date: string; // YYYY-MM-DD
  checkIn?: string; // HH:MM or HH:MM:SS
  checkOut?: string; // HH:MM or HH:MM:SS
  lunchBreakStart?: string; // HH:MM or HH:MM:SS
  lunchBreakEnd?: string; // HH:MM or HH:MM:SS
  lunchBreakDuration?: number; // hours (decimal)
  totalHours?: number; // hours (decimal)
  status?: "present" | "absent" | "half-day" | "holiday" | "leave" | "weekend";
}>): Promise<{
  success: number;
  errors: number;
  errorDetails: Array<{ row: number; employeeId: string; date: string; error: string }>;
}> {
  const results = {
    success: 0,
    errors: 0,
    errorDetails: [] as Array<{ row: number; employeeId: string; date: string; error: string }>,
  };

  // Helper function to parse time string to Date
  const parseTime = (dateStr: string, timeStr: string): Date => {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    const date = new Date(dateStr + 'T00:00:00');
    date.setHours(hours || 0, minutes || 0, seconds || 0);
    return date;
  };

  // Helper function to check if date is weekend
  const isWeekend = (dateStr: string): boolean => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  };

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowNum = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

    try {
      // Validate required fields
      if (!record.employeeId || !record.date) {
        results.errors++;
        results.errorDetails.push({
          row: rowNum,
          employeeId: record.employeeId || 'N/A',
          date: record.date || 'N/A',
          error: 'Missing required fields: employeeId and date are required',
        });
        continue;
      }

      // Determine status
      let status: "present" | "absent" | "half-day" | "holiday" | "leave" | "weekend" = "present";
      
      if (record.status) {
        status = record.status;
      } else if (isWeekend(record.date)) {
        status = "weekend";
      } else if (!record.checkIn && !record.checkOut) {
        status = "absent";
      } else if (record.checkIn && !record.checkOut) {
        status = "half-day";
      }

      // Create attendance document reference
      const dateObj = new Date(record.date + 'T00:00:00');
      const ref = attendanceDocRef(record.employeeId, dateObj);

      // Prepare attendance data
      const attendanceData: Partial<AttendanceDoc> = {
        employeeId: record.employeeId,
        date: record.date,
        status,
        updatedAt: serverTimestamp(),
      };

      // Add check-in if provided
      if (record.checkIn) {
        const checkInDate = parseTime(record.date, record.checkIn);
        attendanceData.checkIn = {
          timestamp: Timestamp.fromDate(checkInDate),
          method: "system" as const,
        };
        attendanceData.createdAt = serverTimestamp();
      } else if (!attendanceData.createdAt) {
        attendanceData.createdAt = serverTimestamp();
      }

      // Add check-out if provided
      if (record.checkOut) {
        const checkOutDate = parseTime(record.date, record.checkOut);
        attendanceData.checkOut = {
          timestamp: Timestamp.fromDate(checkOutDate),
          method: "system" as const,
        };
      }

      // Add lunch break if provided
      if (record.lunchBreakStart || record.lunchBreakEnd || record.lunchBreakDuration !== undefined) {
        const lunchBreak: any = {};
        
        if (record.lunchBreakStart) {
          const lunchStartDate = parseTime(record.date, record.lunchBreakStart);
          lunchBreak.start = Timestamp.fromDate(lunchStartDate);
        }
        
        if (record.lunchBreakEnd) {
          const lunchEndDate = parseTime(record.date, record.lunchBreakEnd);
          lunchBreak.end = Timestamp.fromDate(lunchEndDate);
          
          // Calculate duration if not provided
          if (record.lunchBreakDuration === undefined && lunchBreak.start) {
            const startMs = lunchBreak.start.toMillis();
            const endMs = lunchEndDate.getTime();
            lunchBreak.duration = Math.max(0, Number(((endMs - startMs) / (1000 * 60 * 60)).toFixed(2)));
          }
        }
        
        if (record.lunchBreakDuration !== undefined) {
          lunchBreak.duration = record.lunchBreakDuration;
        }
        
        attendanceData.lunchBreak = lunchBreak;
      }

      // Calculate or set total hours
      if (record.totalHours !== undefined) {
        attendanceData.totalHours = record.totalHours;
      } else if (attendanceData.checkIn && attendanceData.checkOut) {
        try {
          const inMs = attendanceData.checkIn.timestamp.toMillis();
          const outMs = attendanceData.checkOut.timestamp.toMillis();
          let diffHours = (outMs - inMs) / (1000 * 60 * 60);
          
          // Subtract lunch break if exists
          if (attendanceData.lunchBreak?.start && attendanceData.lunchBreak?.end) {
            const lunchStartMs = attendanceData.lunchBreak.start.toMillis();
            const lunchEndMs = attendanceData.lunchBreak.end.toMillis();
            const lunchHours = (lunchEndMs - lunchStartMs) / (1000 * 60 * 60);
            diffHours -= lunchHours;
          }
          
          attendanceData.totalHours = Math.max(0, Number(diffHours.toFixed(2)));
        } catch {
          // If calculation fails, leave totalHours undefined
        }
      }

      // Save to Firestore
      await setDoc(ref, attendanceData, { merge: true });
      results.success++;
    } catch (error: any) {
      results.errors++;
      results.errorDetails.push({
        row: rowNum,
        employeeId: record.employeeId,
        date: record.date,
        error: error.message || 'Unknown error occurred',
      });
    }
  }

  return results;
}

