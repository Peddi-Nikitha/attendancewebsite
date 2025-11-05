export type UserRole = "admin" | "employee";

export type AuthUser = {
  email: string;
  name: string;
  role: UserRole;
};

const STATIC_USERS: Record<string, { password: string; name: string; role: UserRole }> = {
  "admin@example.com": { password: "Admin@123", name: "Admin User", role: "admin" },
  "employee@example.com": { password: "Employee@123", name: "Employee User", role: "employee" },
};

const STORAGE_KEY = "attendance_auth_user";

export function loginWithStaticCredentials(email: string, password: string): AuthUser | null {
  const record = STATIC_USERS[email.toLowerCase()];
  if (!record) return null;
  if (record.password !== password) return null;
  const user: AuthUser = { email: email.toLowerCase(), name: record.name, role: record.role };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event("localStorageChange"));
  }
  return user;
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event("localStorageChange"));
  }
}




