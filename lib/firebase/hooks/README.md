# Firebase Authentication React Hooks

This directory contains custom React hooks for managing Firebase Authentication state and operations.

## Hooks Overview

### Core Hooks

#### `useAuth()`
Main hook for authentication state management.

```tsx
import { useAuth } from '@/lib/firebase/hooks';

function MyComponent() {
  const { user, userProfile, loading, error } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>Please sign in</div>;

  return <div>Welcome, {userProfile?.name}!</div>;
}
```

**Returns:**
- `user: FirebaseUser | null` - Firebase Auth user object
- `userProfile: AuthUser | null` - User profile from Firestore
- `loading: boolean` - Loading state
- `error: Error | null` - Error state

---

#### `useUserProfile()`
Hook specifically for user profile data.

```tsx
import { useUserProfile } from '@/lib/firebase/hooks';

function ProfileComponent() {
  const { profile, loading, error } = useUserProfile();

  if (loading) return <div>Loading profile...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{profile?.name}</h1>
      <p>{profile?.role} - {profile?.department}</p>
    </div>
  );
}
```

---

### Mutation Hooks

All mutation hooks follow the same pattern:
- `mutate(data)` - Execute the mutation
- `isLoading` - Loading state
- `error` - Error state
- `isSuccess` - Success state
- `reset()` - Reset error and success states

#### `useLogin()`
Sign in a user.

```tsx
import { useLogin } from '@/lib/firebase/hooks';

function LoginForm() {
  const { mutate: login, isLoading, error } = useLogin();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const user = await login({ 
        email: 'user@example.com', 
        password: 'password123' 
      });
      console.log('Logged in:', user);
    } catch (err) {
      // Error is available in error state
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error.message}</div>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
```

---

#### `useSignup()`
Create a new user account.

```tsx
import { useSignup } from '@/lib/firebase/hooks';

function SignupForm() {
  const { mutate: signup, isLoading, error } = useSignup();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const user = await signup({
        email: 'newuser@example.com',
        password: 'SecurePassword123',
        userData: {
          name: 'John Doe',
          role: 'employee',
          department: 'Engineering',
          designation: 'Software Engineer'
        }
      });
      console.log('Account created:', user);
    } catch (err) {
      // Handle error
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

#### `useLogout()`
Sign out current user.

```tsx
import { useLogout } from '@/lib/firebase/hooks';

function LogoutButton() {
  const { mutate: logout, isLoading } = useLogout();

  return (
    <button onClick={() => logout()} disabled={isLoading}>
      {isLoading ? 'Signing out...' : 'Sign Out'}
    </button>
  );
}
```

---

#### `usePasswordReset()`
Send password reset email.

```tsx
import { usePasswordReset } from '@/lib/firebase/hooks';

function ForgotPasswordForm() {
  const { mutate: sendResetEmail, isLoading, error, isSuccess } = usePasswordReset();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await sendResetEmail({ email: 'user@example.com' });
  };

  if (isSuccess) {
    return <div>Check your email for password reset instructions!</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error.message}</div>}
      <input type="email" name="email" required />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send Reset Email'}
      </button>
    </form>
  );
}
```

---

#### `useUpdatePassword()`
Update user password.

```tsx
import { useUpdatePassword } from '@/lib/firebase/hooks';

function ChangePasswordForm() {
  const { mutate: updatePassword, isLoading, error, isSuccess } = useUpdatePassword();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await updatePassword({ newPassword: 'NewSecurePassword123' });
  };

  return (
    <form onSubmit={handleSubmit}>
      {isSuccess && <div>Password updated successfully!</div>}
      {error && <div className="error">{error.message}</div>}
      <input type="password" name="newPassword" required />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Updating...' : 'Update Password'}
      </button>
    </form>
  );
}
```

---

#### `useUpdateEmail()`
Update user email.

```tsx
import { useUpdateEmail } from '@/lib/firebase/hooks';

function ChangeEmailForm() {
  const { mutate: updateEmail, isLoading, error } = useUpdateEmail();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await updateEmail({ newEmail: 'newemail@example.com' });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

### Utility Hooks

#### `useIsAuthenticated()`
Check if user is authenticated.

```tsx
import { useIsAuthenticated } from '@/lib/firebase/hooks';

function ConditionalContent() {
  const isAuth = useIsAuthenticated();

  return isAuth ? <AuthenticatedContent /> : <PublicContent />;
}
```

---

#### `useRequireAuth()`
Redirect if user is not authenticated.

```tsx
import { useRequireAuth } from '@/lib/firebase/hooks';

function ProtectedPage() {
  const { user, loading } = useRequireAuth('/login');

  if (loading) return <div>Loading...</div>;
  // User is guaranteed to be authenticated here
  return <div>Protected Content</div>;
}
```

---

#### `useRequireRole()`
Redirect if user doesn't have required role.

```tsx
import { useRequireRole } from '@/lib/firebase/hooks';

function AdminDashboard() {
  const { userProfile, loading } = useRequireRole('admin', '/');

  if (loading) return <div>Loading...</div>;
  // User is guaranteed to be admin here
  return <div>Admin Dashboard</div>;
}
```

---

## TypeScript Types

### `UseAuthReturn`
Return type for `useAuth()` hook.

```typescript
interface UseAuthReturn {
  user: FirebaseUser | null;
  userProfile: AuthUser | null;
  loading: boolean;
  error: Error | null;
}
```

### `UseMutationReturn<T>`
Return type for mutation hooks.

```typescript
interface UseMutationReturn<T> {
  mutate: (data: any) => Promise<T>;
  isLoading: boolean;
  error: Error | null;
  isSuccess: boolean;
  reset: () => void;
}
```

---

## Best Practices

1. **Always handle loading states**
   ```tsx
   if (loading) return <LoadingSpinner />;
   ```

2. **Display error messages**
   ```tsx
   {error && <ErrorMessage message={error.message} />}
   ```

3. **Use proper cleanup**
   - Hooks automatically clean up listeners
   - Use `reset()` to clear mutation states when needed

4. **Protect routes with `useRequireAuth` or `useRequireRole`**
   ```tsx
   function AdminPage() {
     useRequireRole('admin', '/unauthorized');
     // Page content...
   }
   ```

---

## Examples

### Complete Login Flow

```tsx
'use client';

import { useLogin } from '@/lib/firebase/hooks';
import { useRouter } from 'next/navigation';
import { useState, FormEvent } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const { mutate: login, isLoading, error } = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const user = await login({ email, password });
      // Redirect based on role
      router.push(user.role === 'admin' ? '/admin' : '/employee');
    } catch (err) {
      // Error is handled by the hook
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Login</h1>
      {error && <div className="error">{error.message}</div>}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
```

### Protected Route Component

```tsx
'use client';

import { useRequireAuth } from '@/lib/firebase/hooks';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useRequireAuth('/login');

  if (loading) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}
```

### Role-Based Access Control

```tsx
'use client';

import { useRequireRole } from '@/lib/firebase/hooks';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useRequireRole('admin', '/unauthorized');

  if (loading) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}
```

---

## Notes

- All hooks are marked with `'use client'` directive for Next.js App Router
- Hooks automatically handle cleanup and prevent memory leaks
- Error states are provided for user-friendly error handling
- Loading states prevent race conditions and provide better UX
- All hooks are fully typed with TypeScript


