"use client";
import React, { useCallback, useState } from "react";
import { Button } from "../../../components/ui/button";
import { usePasswordReset } from "../../../lib/firebase/hooks/useAuth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const { mutate: sendReset, isLoading, error, isSuccess } = usePasswordReset();

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    await sendReset({ email: email.trim() });
  }, [email, sendReset]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
      <div className="w-full max-w-md bg-white dark:bg-neutral-800 p-8 rounded-xl shadow-md flex flex-col gap-6">
        <div className="text-center text-2xl font-bold text-blue-700 mb-2">Forgot Password</div>
        {isSuccess ? (
          <div className="text-green-700 text-sm">Reset link sent. Please check your email.</div>
        ) : null}
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-white" />
          {error ? (<div className="text-red-600 text-sm" role="alert">{error.message}</div>) : null}
          <Button type="submit" className="w-full mt-2" disabled={isLoading}>{isLoading ? 'Sending...' : 'Send Reset Link'}</Button>
        </form>
        <div className="flex flex-col items-center text-sm">
          <a href="/login" className="text-blue-600 hover:underline">Back to Login</a>
        </div>
      </div>
    </div>
  );
}
