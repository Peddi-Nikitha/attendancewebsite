"use client";
import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { useLogin } from "../../../lib/firebase/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const { mutate: login, isLoading, error: authError } = useLogin();

  const validate = useCallback(() => {
    let valid = true;
    setEmailError("");
    setPasswordError("");
    setError("");

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setEmailError("Please enter a valid email address");
      valid = false;
    }
    if (!password || password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      valid = false;
    }
    return valid;
  }, [email, password]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
      try {
        // Static admin bypass
        if (email.trim().toLowerCase() === "admin@example.com" && password === "admin123") {
          try { localStorage.setItem("staticAdmin", "true"); } catch {}
          router.replace("/admin");
          return;
        }

        const authUser = await login({ email: email.trim(), password });
        if (!authUser) return;
        try {
          localStorage.setItem(
            "attendance_auth_user",
            JSON.stringify({ email: authUser.email, name: authUser.name, role: authUser.role })
          );
          // Dispatch custom event to notify other components
          window.dispatchEvent(new Event("localStorageChange"));
        } catch {}
        const destination = authUser.role === "admin" ? "/admin" : "/employee";
        router.replace(destination);
      } catch (err: any) {
        setError(err?.message || "Login failed");
      }
    },
    [email, password, login, router, validate]
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
      <div className="w-full max-w-md bg-white dark:bg-neutral-800 p-8 rounded-xl shadow-md flex flex-col gap-6">
        <div className="text-center text-3xl font-bold text-blue-700">Attendance System</div>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-white"
          />
          {emailError ? (
            <div className="text-red-600 text-sm" role="alert">{emailError}</div>
          ) : null}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-white"
          />
          {passwordError ? (
            <div className="text-red-600 text-sm" role="alert">{passwordError}</div>
          ) : null}
          {error || authError ? (
            <div className="text-red-600 text-sm" role="alert">{error || authError?.message}</div>
          ) : null}
          <Button type="submit" className="w-full mt-2" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Login"}
          </Button>
        </form>
        <div className="flex flex-col gap-1 items-center text-sm">
          <a href="/forgot-password" className="text-blue-600 hover:underline">Forgot Password?</a>
        </div>
        
      </div>
    </div>
  );
}
