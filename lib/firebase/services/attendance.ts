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
  status: "present" | "absent" | "half-day" | "holiday" | "leave";
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
  totalHours?: number; // hours (decimal)
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
      
      // If checking in after checkout, clear the previous checkout to start a new cycle
      if (data.checkOut) {
        updateData.checkOut = deleteField(); // Clear previous checkout
        updateData.totalHours = deleteField(); // Clear previous total hours
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

    // Calculate total hours for this check-in cycle
    let totalHours: number | undefined;
    try {
      const inMs = data.checkIn.timestamp.toMillis();
      const outMs = Date.now();
      const diffHours = (outMs - inMs) / (1000 * 60 * 60);
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


