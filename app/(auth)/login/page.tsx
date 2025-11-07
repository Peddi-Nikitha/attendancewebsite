"use client";
import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { useLogin } from "../../../lib/firebase/hooks/useAuth";
import { Mail, Lock, Eye, EyeOff, Clock, Shield, Users } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
        // Static admin bypass - Try to create Firebase Auth session
        if (email.trim().toLowerCase() === "admin@example.com" && password === "admin123") {
          try {
            // Try to sign in with Firebase Auth first
            const authUser = await login({ email: email.trim(), password: password });
            if (authUser) {
              try {
                localStorage.setItem(
                  "attendance_auth_user",
                  JSON.stringify({ email: authUser.email, name: authUser.name, role: authUser.role })
                );
                localStorage.setItem("staticAdmin", "true");
                window.dispatchEvent(new Event("localStorageChange"));
              } catch {}
          router.replace("/admin");
          return;
            }
          } catch (authError: any) {
            // If Firebase Auth fails, show helpful error
            if (authError.message?.includes("user-not-found") || authError.message?.includes("No account found")) {
              setError(
                "Admin account not found in Firebase Authentication. " +
                "Please create an admin account in Firebase Console: " +
                "https://console.firebase.google.com/project/attendaceapp-9e768/authentication/users " +
                "OR use existing Firebase Auth credentials."
              );
            } else {
              setError(authError.message || "Login failed. Please create admin account in Firebase Console.");
            }
            return;
          }
        }

        // Try Firebase Auth login for all other users
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
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Left Side - Visual/Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 opacity-90"></div>
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
        
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 w-full">
          <div className="max-w-md space-y-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Clock className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Attendance System</h1>
            </div>
            
            <p className="text-xl text-blue-100 leading-relaxed">
              Streamline your workforce management with our modern attendance tracking solution.
            </p>
            
            <div className="grid grid-cols-2 gap-6 mt-12">
              <div className="flex items-start gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <Shield className="w-5 h-5 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Secure</h3>
                  <p className="text-sm text-blue-100">Enterprise-grade security</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <Users className="w-5 h-5 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Efficient</h3>
                  <p className="text-sm text-blue-100">Time-saving automation</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative shapes */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 p-8 sm:p-10 space-y-8">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Attendance System
              </h1>
            </div>

            {/* Desktop Header */}
            <div className="hidden lg:block space-y-2">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome back</h2>
              <p className="text-slate-600 dark:text-slate-400">
                Sign in to your account to continue
              </p>
            </div>

            <form className="space-y-6" onSubmit={onSubmit}>
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
          <input
                    id="email"
            type="email"
                    placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 ${
                      emailError ? "border-red-500 focus:ring-red-500" : "border-slate-300 dark:border-slate-600"
                    }`}
                  />
                </div>
                {emailError && (
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1" role="alert">
                    <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                    {emailError}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
          <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 ${
                      passwordError ? "border-red-500 focus:ring-red-500" : "border-slate-300 dark:border-slate-600"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1" role="alert">
                    <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                    {passwordError}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    Remember me
                  </span>
                </label>
                <a
                  href="/forgot-password"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  Forgot password?
                </a>
              </div>

              {/* Error Message */}
              {(error || authError) && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg" role="alert">
                  <p className="text-sm text-red-800 dark:text-red-300">
                    {error || authError?.message}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full py-3 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
          </Button>
        </form>

            {/* Footer */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
              <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                Secure login powered by enterprise authentication
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
