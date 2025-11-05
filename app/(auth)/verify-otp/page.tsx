import React from "react";
import { Button } from "../../../components/ui/button";

export default function VerifyOtpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
      <div className="w-full max-w-md bg-white dark:bg-neutral-800 p-8 rounded-xl shadow-md flex flex-col gap-6">
        <div className="text-center text-2xl font-bold text-blue-700 mb-2">Email/OTP Verification</div>
        <form className="flex flex-col gap-4">
          <input type="text" placeholder="Enter OTP" className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-white" />
          <Button type="submit" className="w-full mt-2">Verify</Button>
        </form>
        <div className="flex flex-col items-center text-sm">
          <a href="/login" className="text-blue-600 hover:underline">Back to Login</a>
        </div>
      </div>
    </div>
  );
}
