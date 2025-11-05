"use client";
import React, { useCallback, useState } from "react";
import { Button } from "../../../components/ui/button";
import { useRouter } from "next/navigation";
import { useSignup } from "../../../lib/firebase/hooks/useAuth";

export default function ProfileSetupPage() {
  const router = useRouter();
  const { mutate: signup, isLoading, error } = useSignup();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  const [formError, setFormError] = useState("");

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!name || !email || !password) {
      setFormError("Name, email and password are required");
      return;
    }
    try {
      await signup({
        email: email.trim(),
        password,
        userData: { name, role, department },
      });
      router.replace(role === 'admin' ? '/admin' : '/employee');
    } catch (err: any) {
      setFormError(err?.message || 'Signup failed');
    }
  }, [name, email, password, role, department, signup, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
      <div className="w-full max-w-lg bg-white dark:bg-neutral-800 p-8 rounded-xl shadow-md flex flex-col gap-6">
        <div className="text-center text-2xl font-bold text-blue-700 mb-2">Complete Your Profile</div>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300 bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-white" />
          <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300 bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-white" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300 bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-white" />
          <input type="text" placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} className="px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300 bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-white" />
          <select value={role} onChange={(e) => setRole(e.target.value as any)} className="px-4 py-2 border rounded bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-white">
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
          {formError || error ? (
            <div className="text-red-600 text-sm" role="alert">{formError || error?.message}</div>
          ) : null}
          <Button type="submit" className="w-full mt-2" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save & Continue'}</Button>
        </form>
      </div>
    </div>
  );
}
