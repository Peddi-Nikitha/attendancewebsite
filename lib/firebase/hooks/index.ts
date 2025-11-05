/**
 * Authentication Hooks - Barrel Export
 * 
 * Re-export all authentication hooks for easier imports
 */

export {
  useAuth,
  useUserProfile,
  useLogin,
  useSignup,
  useLogout,
  usePasswordReset,
  useUpdatePassword,
  useUpdateEmail,
  useIsAuthenticated,
  useRequireAuth,
  useRequireRole,
  type UseAuthReturn,
  type UseMutationReturn,
} from './useAuth';


