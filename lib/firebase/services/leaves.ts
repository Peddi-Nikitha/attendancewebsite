import { db } from "@/lib/firebase/config";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  addDoc,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  FieldValue,
} from "firebase/firestore";

export type LeaveType = "Casual" | "Sick" | "Privilege";
export type LeaveStatus = "Pending" | "Approved" | "Rejected";

export type LeaveRequestDoc = {
  id?: string;
  employeeId: string; // Employee email
  type: LeaveType;
  reason?: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  status: LeaveStatus;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
};

const COLLECTION_NAME = "leaveRequests";

/**
 * Create a new leave request
 * @param employeeId - Employee email
 * @param type - Type of leave
 * @param from - Start date (YYYY-MM-DD)
 * @param to - End date (YYYY-MM-DD)
 * @param reason - Optional reason
 * @returns The created leave request document ID
 */
export async function createLeaveRequest(
  employeeId: string,
  type: LeaveType,
  from: string,
  to: string,
  reason?: string
): Promise<string> {
  const leaveRef = collection(db, COLLECTION_NAME);
  
  const leaveData: Omit<LeaveRequestDoc, "id"> = {
    employeeId,
    type,
    from,
    to,
    reason: reason || undefined,
    status: "Pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(leaveRef, leaveData);
  return docRef.id;
}

/**
 * Get leave requests for an employee
 * @param employeeId - Employee email
 * @param limitCount - Maximum number of records (default: 50)
 * @returns Array of leave request documents
 */
export async function getEmployeeLeaveRequests(
  employeeId: string,
  limitCount: number = 50
): Promise<LeaveRequestDoc[]> {
  const leaveRef = collection(db, COLLECTION_NAME);
  const q = query(
    leaveRef,
    where("employeeId", "==", employeeId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as LeaveRequestDoc));
}

/**
 * Listen to leave requests for an employee
 * @param employeeId - Employee email
 * @param callback - Callback function that receives array of leave documents
 * @param errorCallback - Optional callback for errors
 * @param limitCount - Maximum number of records (default: 50)
 * @returns Unsubscribe function
 */
export function listenEmployeeLeaveRequests(
  employeeId: string,
  callback: (docs: LeaveRequestDoc[]) => void,
  errorCallback?: (error: Error) => void,
  limitCount: number = 50
): Unsubscribe {
  const leaveRef = collection(db, COLLECTION_NAME);
  
  // Try with index first (with orderBy)
  const qWithOrder = query(
    leaveRef,
    where("employeeId", "==", employeeId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  
  let fallbackUnsubscribe: Unsubscribe | null = null;
  let isUsingFallback = false;
  
  const unsubscribe = onSnapshot(
    qWithOrder,
    (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as LeaveRequestDoc));
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
            leaveRef,
            where("employeeId", "==", employeeId)
          );
          
          fallbackUnsubscribe = onSnapshot(
            qFallback,
            (snapshot) => {
              const docs = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              } as LeaveRequestDoc));
              
              // Sort by createdAt descending in memory
              docs.sort((a, b) => {
                const aTime = a.createdAt?.toMillis() || 0;
                const bTime = b.createdAt?.toMillis() || 0;
                return bTime - aTime;
              });
              
              // Limit in memory
              callback(docs.slice(0, limitCount));
            },
            (fallbackError) => {
              console.error("Error in fallback query:", fallbackError);
              const err = fallbackError instanceof Error 
                ? fallbackError 
                : new Error("Failed to load leave requests");
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
        console.error("Error listening to leave requests:", error);
        const err = error instanceof Error ? error : new Error("Failed to load leave requests");
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

