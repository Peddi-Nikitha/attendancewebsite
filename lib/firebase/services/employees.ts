import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config';

export interface Employee {
  id: string;
  userId: string;
  employeeId: string;
  name?: string;
  email?: string;
  role?: 'employee' | 'admin';
  department: string;
  managerId?: string;
  designation?: string;
  joinDate: string;
  salary?: { basic: number; allowances: number; deductions: number };
  leaveBalance?: {
    casual: number;
    sick: number;
    privilege: number;
  };
  passwordHash?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export async function createEmployee(
  data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>
) {
  const ref = doc(collection(db, 'employees'));
  const payload = {
    ...data,
    // Ensure default leave balance of 10 days each if not provided
    leaveBalance: data.leaveBalance ?? {
      casual: 10,
      sick: 10,
      privilege: 10,
    },
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  await setDoc(ref, payload);
  const snap = await getDoc(ref);
  return { id: ref.id, ...(snap.data() as any) } as Employee;
}

export async function getEmployee(employeeDocId: string) {
  const ref = doc(db, 'employees', employeeDocId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: ref.id, ...(snap.data() as any) } as Employee;
}

export async function getEmployees(filters?: {
  department?: string;
  role?: 'admin' | 'employee';
  managerId?: string;
  isActive?: boolean;
}) {
  const col = collection(db, 'employees');
  const clauses: any[] = [];
  if (filters?.department) clauses.push(where('department', '==', filters.department));
  if (typeof filters?.isActive === 'boolean') clauses.push(where('isActive', '==', filters.isActive));
  if (filters?.managerId) clauses.push(where('managerId', '==', filters.managerId));
  const q = clauses.length ? query(col, ...clauses, orderBy('createdAt', 'desc')) : query(col, orderBy('createdAt', 'desc'));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Employee[];
}

export async function updateEmployee(employeeDocId: string, updates: Partial<Employee>) {
  const ref = doc(db, 'employees', employeeDocId);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
  const snap = await getDoc(ref);
  return { id: ref.id, ...(snap.data() as any) } as Employee;
}

export async function deleteEmployee(employeeDocId: string, soft = true) {
  const ref = doc(db, 'employees', employeeDocId);
  if (soft) {
    await updateDoc(ref, { isActive: false, updatedAt: serverTimestamp() });
    const snap = await getDoc(ref);
    return { id: ref.id, ...(snap.data() as any) } as Employee;
  }
  await deleteDoc(ref);
  return true;
}

/**
 * Get employee by email
 * @param email - Employee email address
 * @returns Employee document or null if not found
 */
export async function getEmployeeByEmail(email: string): Promise<Employee | null> {
  const col = collection(db, 'employees');
  const q = query(col, where('email', '==', email.toLowerCase()), limit(1));
  const snaps = await getDocs(q);
  if (snaps.empty) return null;
  const doc = snaps.docs[0];
  return { id: doc.id, ...(doc.data() as any) } as Employee;
}

/**
 * Listen to employee by email
 * @param email - Employee email address
 * @param callback - Callback function that receives employee document or null
 * @returns Unsubscribe function
 */
export function listenEmployeeByEmail(
  email: string,
  callback: (employee: Employee | null) => void
): Unsubscribe {
  const col = collection(db, 'employees');
  const q = query(col, where('email', '==', email.toLowerCase()), limit(1));
  return onSnapshot(
    q,
    (snap) => {
      const doc = snap.docs[0];
      callback(doc ? ({ id: doc.id, ...(doc.data() as any) } as Employee) : null);
    },
    (error) => {
      console.error('Error listening to employee by email:', error);
      callback(null);
    }
  );
}





