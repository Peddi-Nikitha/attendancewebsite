"use client";
// Lightweight client-side realtime datastore with pub/sub to simulate Firestore/Supabase

export type Employee = {
  id: string;
  name: string;
  email: string;
  department: string;
  role: "employee" | "admin";
  manager?: string;
};

export type AttendanceLog = {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // ISO
  checkOut?: string; // ISO
  approved?: boolean;
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  type: "Casual" | "Sick" | "Privilege";
  reason?: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  status: "Pending" | "Approved" | "Rejected";
};

export type Payslip = {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM
  basic: number;
  allowances: number;
  deductions: number;
  overtime: number;
};

type Listener = () => void;

class DataStore {
  private static instance: DataStore;
  private listeners: Set<Listener> = new Set();

  employees: Employee[] = [
    { id: "e1", name: "John Doe", email: "john@company.com", department: "Engineering", role: "employee", manager: "Priya Singh" },
    { id: "e2", name: "Aarav Patel", email: "aarav@company.com", department: "Sales", role: "employee", manager: "Maya Rao" },
  ];

  attendance: AttendanceLog[] = [];
  leaves: LeaveRequest[] = [];
  payslips: Payslip[] = [];

  static get(): DataStore {
    if (!DataStore.instance) DataStore.instance = new DataStore();
    return DataStore.instance;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    for (const l of this.listeners) l();
  }

  // Utility
  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // EMPLOYEE ACTIONS
  checkIn(employeeId: string) {
    const now = new Date().toISOString();
    const date = this.today();
    let log = this.attendance.find((l) => l.employeeId === employeeId && l.date === date);
    if (!log) {
      log = { id: crypto.randomUUID(), employeeId, date };
      this.attendance.unshift(log);
    }
    log.checkIn = now;
    log.approved = true;
    this.emit();
  }

  checkOut(employeeId: string) {
    const now = new Date().toISOString();
    const date = this.today();
    let log = this.attendance.find((l) => l.employeeId === employeeId && l.date === date);
    if (!log) {
      log = { id: crypto.randomUUID(), employeeId, date };
      this.attendance.unshift(log);
    }
    log.checkOut = now;
    this.emit();
  }

  applyLeave(employeeId: string, type: LeaveRequest["type"], from: string, to: string, reason?: string) {
    this.leaves.unshift({ id: crypto.randomUUID(), employeeId, type, reason, from, to, status: "Pending" });
    this.emit();
  }

  // ADMIN ACTIONS
  addEmployee(e: Omit<Employee, "id">) {
    this.employees.unshift({ id: crypto.randomUUID(), ...e });
    this.emit();
  }

  updateEmployee(id: string, updates: Partial<Employee>) {
    const idx = this.employees.findIndex((x) => x.id === id);
    if (idx >= 0) {
      this.employees[idx] = { ...this.employees[idx], ...updates };
      this.emit();
    }
  }

  deleteEmployee(id: string) {
    this.employees = this.employees.filter((x) => x.id !== id);
    // also clean related records (for demo)
    this.attendance = this.attendance.filter((x) => x.employeeId !== id);
    this.leaves = this.leaves.filter((x) => x.employeeId !== id);
    this.payslips = this.payslips.filter((x) => x.employeeId !== id);
    this.emit();
  }

  approveLeave(id: string, status: LeaveRequest["status"]) {
    const idx = this.leaves.findIndex((l) => l.id === id);
    if (idx >= 0) {
      this.leaves[idx].status = status;
      this.emit();
    }
  }

  editAttendance(id: string, updates: Partial<AttendanceLog>) {
    const idx = this.attendance.findIndex((l) => l.id === id);
    if (idx >= 0) {
      this.attendance[idx] = { ...this.attendance[idx], ...updates };
      this.emit();
    }
  }

  generatePayslip(employeeId: string, month: string) {
    // naive calculation based on attendance (demo)
    const days = this.attendance.filter((l) => l.employeeId === employeeId && l.date.startsWith(month));
    const presentDays = days.filter((d) => d.checkIn && d.checkOut).length;
    const basic = 50000;
    const perDay = basic / 22;
    const allowances = 5000;
    const deductions = Math.max(0, (22 - presentDays) * (perDay * 0.5));
    const overtime = 0;
    this.payslips.unshift({ id: crypto.randomUUID(), employeeId, month, basic, allowances, deductions, overtime });
    this.emit();
  }
}

export function useDataStore() {
  const store = DataStore.get();
  return store;
}


