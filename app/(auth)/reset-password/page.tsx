"use client";
import React, { useCallback, useState } from "react";
import { Button } from "../../../components/ui/button";
import { useUpdatePassword } from "../../../lib/firebase/hooks/useAuth";

export default function ResetPasswordPage() {
  const { mutate: updatePwd, isLoading, error, isSuccess } = useUpdatePassword();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState("");

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    if (!password || password.length < 6) {
      setLocalError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setLocalError("Passwords do not match");
      return;
    }
    await updatePwd({ newPassword: password });
  }, [password, confirm, updatePwd]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
      <div className="w-full max-w-md bg-white dark:bg-neutral-800 p-8 rounded-xl shadow-md flex flex-col gap-6">
        <div className="text-center text-2xl font-bold text-blue-700 mb-2">Reset Password</div>
        {isSuccess ? (<div className="text-green-700 text-sm">Password updated. You can log in now.</div>) : null}
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <input type="password" placeholder="New Password" value={password} onChange={(e) => setPassword(e.target.value)} className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-white" />
          <input type="password" placeholder="Confirm Password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-white" />
          {localError || error ? (<div className="text-red-600 text-sm" role="alert">{localError || error?.message}</div>) : null}
          <Button type="submit" className="w-full mt-2" disabled={isLoading}>{isLoading ? 'Updating...' : 'Reset Password'}</Button>
        </form>
        <div className="flex flex-col items-center text-sm">
          <a href="/login" className="text-blue-600 hover:underline">Back to Login</a>
        </div>
      </div>
    </div>
  );
}
