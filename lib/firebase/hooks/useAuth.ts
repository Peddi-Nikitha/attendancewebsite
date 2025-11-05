/**
 * Custom Authentication React Hooks
 * 
 * This module provides React hooks for managing authentication state
 * and performing authentication operations in React components.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  signIn,
  signUp,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  updateEmail,
  getCurrentUser,
  getCurrentUserProfile,
  onAuthStateChanged,
  isAuthenticated,
  waitForAuth,
  AuthUser,
  SignUpData,
} from '../auth';

// ============================================
// Type Definitions
// ============================================

export interface UseAuthReturn {
  user: FirebaseUser | null;
  userProfile: AuthUser | null;
  loading: boolean;
  error: Error | null;
}

export interface UseMutationReturn<T = void> {
  mutate: (data: any) => Promise<T>;
  isLoading: boolean;
  error: Error | null;
  isSuccess: boolean;
  reset: () => void;
}

// ============================================
// Main Authentication Hook
// ============================================

/**
 * useAuth - Main hook for authentication state
 * 
 * Listens to authentication state changes and provides:
 * - Current Firebase Auth user
 * - User profile from Firestore
 * - Loading state
 * - Error state
 * 
 * @returns {UseAuthReturn} Auth state object
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, userProfile, loading, error } = useAuth();
 * 
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!user) return <div>Please sign in</div>;
 * 
 *   return <div>Welcome, {userProfile?.name}!</div>;
 * }
 * ```
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Wait for auth to initialize
        const initialUser = await waitForAuth();
        
        if (!mounted) return;

        if (initialUser) {
          setUser(initialUser);
          // Fetch user profile
          const profile = await getCurrentUserProfile();
          if (mounted) {
            setUserProfile(profile);
          }
        }

        setLoading(false);

        // Set up listener for auth state changes
        unsubscribe = onAuthStateChanged(async (authUser) => {
          if (!mounted) return;

          setUser(authUser);
          
          if (authUser) {
            try {
              const profile = await getCurrentUserProfile();
              if (mounted) {
                setUserProfile(profile);
              }
            } catch (err) {
              if (mounted) {
                setError(err instanceof Error ? err : new Error('Failed to fetch user profile'));
              }
            }
          } else {
            setUserProfile(null);
          }
        });
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize authentication'));
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return { user, userProfile, loading, error };
}

// ============================================
// User Profile Hook
// ============================================

/**
 * useUserProfile - Hook for fetching user profile from Firestore
 * 
 * Fetches and returns user profile data with loading and error states.
 * Updates automatically when auth state changes.
 * 
 * @returns {AuthUser | null} User profile or null
 * @returns {boolean} loading - Loading state
 * @returns {Error | null} error - Error state
 * 
 * @example
 * ```tsx
 * function ProfileComponent() {
 *   const { profile, loading, error } = useUserProfile();
 * 
 *   if (loading) return <div>Loading profile...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 * 
 *   return <div>{profile?.name} - {profile?.role}</div>;
 * }
 * ```
 */
export function useUserProfile() {
  const { userProfile, loading, error } = useAuth();
  return { profile: userProfile, loading, error };
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * useLogin - Hook for signing in a user
 * 
 * Provides mutation function with loading, error, and success states.
 * 
 * @returns {UseMutationReturn<AuthUser>} Mutation object
 * 
 * @example
 * ```tsx
 * function LoginForm() {
 *   const { mutate: login, isLoading, error } = useLogin();
 * 
 *   const handleSubmit = async (e: FormEvent) => {
 *     e.preventDefault();
 *     try {
 *       const user = await login({ email, password });
 *       router.push('/dashboard');
 *     } catch (err) {
 *       // Error is handled by the hook
 *     }
 *   };
 * }
 * ```
 */
export function useLogin(): UseMutationReturn<AuthUser> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutate = useCallback(async (data: { email: string; password: string }) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      const user = await signIn(data.email, data.password);
      setIsSuccess(true);
      return user;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Login failed');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setIsSuccess(false);
  }, []);

  return { mutate, isLoading, error, isSuccess, reset };
}

/**
 * useSignup - Hook for signing up a new user
 * 
 * Provides mutation function with loading, error, and success states.
 * 
 * @returns {UseMutationReturn<FirebaseUser>} Mutation object
 * 
 * @example
 * ```tsx
 * function SignupForm() {
 *   const { mutate: signup, isLoading, error } = useSignup();
 * 
 *   const handleSubmit = async (e: FormEvent) => {
 *     e.preventDefault();
 *     try {
 *       const user = await signup({ email, password, userData });
 *       router.push('/profile-setup');
 *     } catch (err) {
 *       // Error is handled by the hook
 *     }
 *   };
 * }
 * ```
 */
export function useSignup(): UseMutationReturn<FirebaseUser> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutate = useCallback(
    async (data: { email: string; password: string; userData: SignUpData }) => {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);

      try {
        const user = await signUp(data.email, data.password, data.userData);
        setIsSuccess(true);
        return user;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Signup failed');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setError(null);
    setIsSuccess(false);
  }, []);

  return { mutate, isLoading, error, isSuccess, reset };
}

/**
 * useLogout - Hook for signing out a user
 * 
 * @returns {UseMutationReturn<void>} Mutation object
 * 
 * @example
 * ```tsx
 * function LogoutButton() {
 *   const { mutate: logout, isLoading } = useLogout();
 * 
 *   return (
 *     <button onClick={() => logout()} disabled={isLoading}>
 *       {isLoading ? 'Signing out...' : 'Sign Out'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useLogout(): UseMutationReturn<void> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      await signOut();
      setIsSuccess(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Logout failed');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setIsSuccess(false);
  }, []);

  return { mutate, isLoading, error, isSuccess, reset };
}

/**
 * usePasswordReset - Hook for sending password reset email
 * 
 * @returns {UseMutationReturn<void>} Mutation object
 * 
 * @example
 * ```tsx
 * function ForgotPasswordForm() {
 *   const { mutate: sendResetEmail, isLoading, error, isSuccess } = usePasswordReset();
 * 
 *   const handleSubmit = async (e: FormEvent) => {
 *     e.preventDefault();
 *     await sendResetEmail({ email });
 *   };
 * 
 *   if (isSuccess) return <div>Check your email!</div>;
 * 
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
export function usePasswordReset(): UseMutationReturn<void> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutate = useCallback(async (data: { email: string }) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      await sendPasswordResetEmail(data.email);
      setIsSuccess(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send reset email');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setIsSuccess(false);
  }, []);

  return { mutate, isLoading, error, isSuccess, reset };
}

/**
 * useUpdatePassword - Hook for updating user password
 * 
 * @returns {UseMutationReturn<void>} Mutation object
 * 
 * @example
 * ```tsx
 * function ChangePasswordForm() {
 *   const { mutate: updatePassword, isLoading, error } = useUpdatePassword();
 * 
 *   const handleSubmit = async (e: FormEvent) => {
 *     e.preventDefault();
 *     await updatePassword({ newPassword });
 *   };
 * 
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
export function useUpdatePassword(): UseMutationReturn<void> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutate = useCallback(async (data: { newPassword: string }) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      await updatePassword(data.newPassword);
      setIsSuccess(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update password');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setIsSuccess(false);
  }, []);

  return { mutate, isLoading, error, isSuccess, reset };
}

/**
 * useUpdateEmail - Hook for updating user email
 * 
 * @returns {UseMutationReturn<void>} Mutation object
 */
export function useUpdateEmail(): UseMutationReturn<void> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutate = useCallback(async (data: { newEmail: string }) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      await updateEmail(data.newEmail);
      setIsSuccess(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update email');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setIsSuccess(false);
  }, []);

  return { mutate, isLoading, error, isSuccess, reset };
}

/**
 * useIsAuthenticated - Hook to check if user is authenticated
 * 
 * @returns {boolean} Whether user is authenticated
 * 
 * @example
 * ```tsx
 * function ProtectedRoute({ children }) {
 *   const isAuth = useIsAuthenticated();
 * 
 *   if (!isAuth) return <Navigate to="/login" />;
 *   return children;
 * }
 * ```
 */
export function useIsAuthenticated(): boolean {
  const { user } = useAuth();
  return user !== null;
}

/**
 * useRequireAuth - Hook that redirects if user is not authenticated
 * 
 * @param redirectTo - Path to redirect to if not authenticated
 * @returns {UseAuthReturn} Auth state
 * 
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { user, loading } = useRequireAuth('/login');
 * 
 *   if (loading) return <Loading />;
 *   // User is guaranteed to be authenticated here
 *   return <div>Dashboard</div>;
 * }
 * ```
 */
export function useRequireAuth(redirectTo: string = '/login'): UseAuthReturn {
  const auth = useAuth();
  
  useEffect(() => {
    if (!auth.loading && !auth.user) {
      // Client-side redirect - component should handle navigation
      if (typeof window !== 'undefined') {
        window.location.href = redirectTo;
      }
    }
  }, [auth.loading, auth.user, redirectTo]);

  return auth;
}

/**
 * useRequireRole - Hook that redirects if user doesn't have required role
 * 
 * @param requiredRole - Required role ('admin' | 'employee')
 * @param redirectTo - Path to redirect to if role doesn't match
 * @returns {UseAuthReturn} Auth state
 * 
 * @example
 * ```tsx
 * function AdminDashboard() {
 *   const { userProfile, loading } = useRequireRole('admin', '/');
 * 
 *   if (loading) return <Loading />;
 *   // User is guaranteed to be admin here
 *   return <div>Admin Dashboard</div>;
 * }
 * ```
 */
export function useRequireRole(
  requiredRole: 'admin' | 'employee',
  redirectTo: string = '/'
): UseAuthReturn {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.loading && auth.userProfile) {
      if (auth.userProfile.role !== requiredRole) {
        // Client-side redirect - component should handle navigation
        if (typeof window !== 'undefined') {
          window.location.href = redirectTo;
        }
      }
    }
  }, [auth.loading, auth.userProfile, requiredRole, redirectTo]);

  return auth;
}

