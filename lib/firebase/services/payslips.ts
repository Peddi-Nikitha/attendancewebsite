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
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '../config';
import { getEmployee } from './employees';

export interface Payslip {
  id: string;
  employeeId: string; // Employee document ID
  employeeEmail?: string; // For easier querying
  month: string; // YYYY-MM format
  year: number;
  monthName: string; // e.g., "January 2025"
  
  // Salary components
  basic: number;
  allowances: number;
  deductions: number;
  overtime: number;
  bonus?: number;
  
  // Calculated values
  grossSalary: number;
  netPay: number;
  
  // Attendance details
  workingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  overtimeHours: number;
  
  // Status
  status: 'draft' | 'generated' | 'approved' | 'paid';
  
  // Metadata
  generatedAt: Timestamp;
  generatedBy?: string; // Admin user ID
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // File upload fields (for uploaded payslips)
  fileUrl?: string; // Download URL for uploaded PDF
  filePath?: string; // Storage path for uploaded PDF
  uploadedAt?: Timestamp; // When the file was uploaded
  isUploaded?: boolean; // Flag to indicate if this is an uploaded payslip
}

/**
 * Calculate payslip based on employee salary and attendance
 */
async function calculatePayslip(
  employeeId: string,
  month: string // YYYY-MM
): Promise<Omit<Payslip, 'id' | 'createdAt' | 'updatedAt' | 'generatedAt'>> {
  // Get employee data
  const employee = await getEmployee(employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }

  if (!employee.salary) {
    throw new Error('Employee salary information not configured');
  }

  const basic = employee.salary.basic || 0;
  const allowances = employee.salary.allowances || 0;
  const defaultDeductions = employee.salary.deductions || 0;

  // Parse month
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);

  // Get attendance records for the month
  const attendanceCol = collection(db, 'attendance');
  const monthStart = `${year}-${monthStr}-01`;
  const monthEnd = `${year}-${monthStr}-31`;
  
  // Use employee email as employeeId (as stored in attendance records)
  const employeeIdForQuery = employee.email?.toLowerCase() || employee.userId;
  
  const attendanceQuery = query(
    attendanceCol,
    where('employeeId', '==', employeeIdForQuery),
    where('date', '>=', monthStart),
    where('date', '<=', monthEnd),
    orderBy('date', 'asc')
  );

  let attendanceRecords: any[] = [];
  try {
    const attendanceSnaps = await getDocs(attendanceQuery);
    attendanceRecords = attendanceSnaps.docs.map(d => d.data());
  } catch (error) {
    console.warn('Error fetching attendance (may need index):', error);
    // Fallback: try without date range
    try {
      const fallbackQuery = query(
        attendanceCol,
        where('employeeId', '==', employeeIdForQuery)
      );
      const fallbackSnaps = await getDocs(fallbackQuery);
      attendanceRecords = fallbackSnaps.docs
        .map(d => d.data())
        .filter((r: any) => r.date && r.date.startsWith(month));
    } catch (fallbackError) {
      console.error('Fallback attendance query also failed:', fallbackError);
    }
  }

  // Calculate working days (excluding weekends - simplified)
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  let workingDays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthNum - 1, day);
    const dayOfWeek = date.getDay();
    // Count weekdays (Monday=1 to Friday=5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDays++;
    }
  }

  // Count attendance
  let presentDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let overtimeHours = 0;

  attendanceRecords.forEach((record: any) => {
    if (record.status === 'leave') {
      leaveDays++;
    } else if (record.checkIn && record.checkOut) {
      presentDays++;
      // Calculate overtime (hours > 8)
      const hours = record.totalHours || 0;
      if (hours > 8) {
        overtimeHours += hours - 8;
      }
    } else if (record.status === 'absent') {
      absentDays++;
    }
  });

  // Calculate salary components
  const perDaySalary = basic / workingDays;
  const absentDeduction = absentDays * perDaySalary;
  const deductions = defaultDeductions + absentDeduction;
  
  // Overtime calculation (1.5x hourly rate)
  const hourlyRate = basic / (workingDays * 8);
  const overtimePay = overtimeHours * hourlyRate * 1.5;

  const grossSalary = basic + allowances + overtimePay;
  const netPay = grossSalary - deductions;

  // Month name
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = `${monthNames[monthNum - 1]} ${year}`;

  return {
    employeeId,
    employeeEmail: employee.email?.toLowerCase(),
    month,
    year,
    monthName,
    basic,
    allowances,
    deductions,
    overtime: overtimePay,
    bonus: 0,
    grossSalary,
    netPay,
    workingDays,
    presentDays,
    absentDays,
    leaveDays,
    overtimeHours,
    status: 'generated',
    notes: '',
  };
}

/**
 * Generate a payslip for an employee for a specific month
 */
export async function generatePayslip(
  employeeId: string,
  month: string,
  generatedBy?: string
): Promise<Payslip> {
  // Check if payslip already exists
  const existing = await getPayslipByEmployeeAndMonth(employeeId, month);
  if (existing) {
    throw new Error('Payslip for this month already exists');
  }

  // Calculate payslip
  const calculated = await calculatePayslip(employeeId, month);

  // Create payslip document
  const ref = doc(collection(db, 'payslips'));
  const now = serverTimestamp() as Timestamp;
  const payload: Payslip = {
    id: ref.id,
    ...calculated,
    generatedBy,
    generatedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(ref, payload);
  const snap = await getDoc(ref);
  return { id: ref.id, ...(snap.data() as any) } as Payslip;
}

/**
 * Get a payslip by ID
 */
export async function getPayslip(payslipId: string): Promise<Payslip | null> {
  const ref = doc(db, 'payslips', payslipId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as Payslip;
}

/**
 * Get payslip by employee and month
 */
export async function getPayslipByEmployeeAndMonth(
  employeeId: string,
  month: string
): Promise<Payslip | null> {
  const col = collection(db, 'payslips');
  const q = query(
    col,
    where('employeeId', '==', employeeId),
    where('month', '==', month),
    limit(1)
  );
  const snaps = await getDocs(q);
  if (snaps.empty) return null;
  const doc = snaps.docs[0];
  return { id: doc.id, ...(doc.data() as any) } as Payslip;
}

/**
 * Get all payslips for an employee
 */
export async function getPayslipsByEmployee(
  employeeId: string,
  limitCount: number = 50
): Promise<Payslip[]> {
  const col = collection(db, 'payslips');
  const q = query(
    col,
    where('employeeId', '==', employeeId),
    orderBy('month', 'desc'),
    limit(limitCount)
  );
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Payslip[];
}

/**
 * Get all payslips (admin view)
 */
export async function getAllPayslips(
  filters?: {
    employeeId?: string;
    month?: string;
    year?: number;
    status?: Payslip['status'];
  },
  limitCount: number = 100
): Promise<Payslip[]> {
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

  const q = clauses.length
    ? query(col, ...clauses, orderBy('month', 'desc'), limit(limitCount))
    : query(col, orderBy('month', 'desc'), limit(limitCount));

  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Payslip[];
}

/**
 * Update a payslip
 */
export async function updatePayslip(
  payslipId: string,
  updates: Partial<Payslip>
): Promise<Payslip> {
  const ref = doc(db, 'payslips', payslipId);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  return { id: snap.id, ...(snap.data() as any) } as Payslip;
}

/**
 * Delete a payslip
 */
export async function deletePayslip(payslipId: string): Promise<void> {
  const ref = doc(db, 'payslips', payslipId);
  const payslip = await getPayslip(payslipId);
  await deleteDoc(ref);
  // Also delete the file from storage if it exists
  if (payslip?.filePath) {
    try {
      await deleteObject(storageRef(storage, payslip.filePath));
    } catch (error) {
      console.warn('Failed to delete payslip file from storage:', error);
    }
  }
}

/**
 * Upload a payslip PDF file for an employee
 */
export async function uploadPayslipFile(
  employeeId: string,
  month: string,
  file: File,
  uploadedBy?: string
): Promise<Payslip> {
  // Verify user is authenticated with Firebase Auth
  let currentUser = auth.currentUser;
  
  if (!currentUser) {
    await new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        currentUser = user;
        resolve(user);
      });
      setTimeout(() => {
        unsubscribe();
        resolve(null);
      }, 2000);
    });
  }
  
  if (!currentUser) {
    const { getCurrentUser } = await import("../../auth");
    const localUser = getCurrentUser();
    
    if (localUser) {
      throw new Error(
        "Firebase Authentication required for file uploads. " +
        `You are logged in as ${localUser.email} via localStorage, but Firebase Auth is not active. ` +
        "Please log out and log in again using Firebase Authentication."
      );
    }
    
    throw new Error(
      "User must be authenticated with Firebase Auth to upload payslips. " +
      "Please sign in using Firebase Authentication and try again."
    );
  }

  // Get employee data
  const employee = await getEmployee(employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }

  // Parse month
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);
  
  // Month name
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = `${monthNames[monthNum - 1]} ${year}`;

  // Check if payslip already exists
  const existing = await getPayslipByEmployeeAndMonth(employeeId, month);
  if (existing) {
    throw new Error('Payslip for this month already exists');
  }

  // Upload file to storage
  const ts = Date.now();
  const path = `payslips/${employeeId}/${month}_${ts}_${file.name}`;
  const sref = storageRef(storage, path);
  
  try {
    await uploadBytes(sref, file);
  } catch (error: any) {
    if (error.code === 'storage/unauthorized') {
      throw new Error(`Storage permission denied. User: ${currentUser.uid}, Path: ${path}. Please check Firebase Storage rules.`);
    }
    throw error;
  }

  const fileUrl = await getDownloadURL(sref);

  // Create payslip document
  const ref = doc(collection(db, 'payslips'));
  const now = serverTimestamp() as Timestamp;
  const payload: Payslip = {
    id: ref.id,
    employeeId,
    employeeEmail: employee.email?.toLowerCase(),
    month,
    year,
    monthName,
    basic: 0,
    allowances: 0,
    deductions: 0,
    overtime: 0,
    grossSalary: 0,
    netPay: 0,
    workingDays: 0,
    presentDays: 0,
    absentDays: 0,
    leaveDays: 0,
    overtimeHours: 0,
    status: 'generated',
    fileUrl,
    filePath: path,
    uploadedAt: now,
    isUploaded: true,
    generatedBy: uploadedBy,
    generatedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(ref, payload);
  const snap = await getDoc(ref);
  return { id: ref.id, ...(snap.data() as any) } as Payslip;
}

/**
 * Listen to payslips for an employee
 */
export function listenPayslipsByEmployee(
  employeeId: string,
  callback: (payslips: Payslip[]) => void,
  onError?: (error: any) => void
): Unsubscribe {
  const col = collection(db, 'payslips');
  const q = query(
    col,
    where('employeeId', '==', employeeId),
    orderBy('month', 'desc'),
    limit(50)
  );
  return onSnapshot(
    q,
    (snap) => {
      const payslips = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Payslip[];
      callback(payslips);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.error('Error listening to payslips:', error);
        callback([]);
      }
    }
  );
}

/**
 * Listen to all payslips (admin)
 */
export function listenAllPayslips(
  callback: (payslips: Payslip[]) => void,
  filters?: {
    employeeId?: string;
    month?: string;
    year?: number;
    status?: Payslip['status'];
  },
  onError?: (error: any) => void
): Unsubscribe {
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

  const q = clauses.length
    ? query(col, ...clauses, orderBy('month', 'desc'), limit(100))
    : query(col, orderBy('month', 'desc'), limit(100));

  return onSnapshot(
    q,
    (snap) => {
      const payslips = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Payslip[];
      callback(payslips);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.error('Error listening to payslips:', error);
        callback([]);
      }
    }
  );
}

