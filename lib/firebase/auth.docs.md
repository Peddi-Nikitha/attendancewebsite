# Firebase Authentication Service Documentation

## Overview

The `auth.ts` module provides a complete authentication service for Firebase Authentication with Firestore profile management.

## Functions

### Core Authentication Functions

#### `signUp(email, password, userData)`
Creates a new user account with email and password.

**Parameters:**
- `email: string` - User's email address
- `password: string` - User's password
- `userData: SignUpData` - User profile data

**Returns:** `Promise<FirebaseUser>` - Firebase Auth user object

**What it does:**
1. Creates Firebase Auth user
2. Creates user profile document in Firestore `users` collection
3. Creates employee document in `employees` collection if role is 'employee'
4. Updates Firebase Auth display name
5. Returns the user object

**Example:**
```typescript
import { signUp } from '@/lib/firebase/auth';

try {
  const user = await signUp(
    'employee@company.com',
    'SecurePassword123',
    {
      name: 'John Doe',
      role: 'employee',
      department: 'Engineering',
      designation: 'Software Engineer',
      employeeId: 'EMP001',
      hireDate: '2024-01-15'
    }
  );
  console.log('User created:', user);
} catch (error) {
  console.error('Sign up failed:', error.message);
}
```

---

#### `signIn(email, password)`
Signs in an existing user.

**Parameters:**
- `email: string` - User's email address
- `password: string` - User's password

**Returns:** `Promise<AuthUser>` - User profile data with Firebase Auth info

**What it does:**
1. Authenticates with Firebase Auth
2. Fetches user profile from Firestore
3. Updates last login timestamp
4. Returns combined user data

**Example:**
```typescript
import { signIn } from '@/lib/firebase/auth';

try {
  const user = await signIn('employee@company.com', 'SecurePassword123');
  console.log('Signed in:', user);
  // user contains: id, email, name, role, department, etc.
} catch (error) {
  console.error('Sign in failed:', error.message);
}
```

---

#### `signOut()`
Signs out the current user.

**Returns:** `Promise<void>`

**Example:**
```typescript
import { signOut } from '@/lib/firebase/auth';

try {
  await signOut();
  console.log('Signed out successfully');
} catch (error) {
  console.error('Sign out failed:', error.message);
}
```

---

### Password Management

#### `sendPasswordResetEmail(email)`
Sends a password reset email to the user.

**Parameters:**
- `email: string` - User's email address

**Returns:** `Promise<void>`

**Example:**
```typescript
import { sendPasswordResetEmail } from '@/lib/firebase/auth';

try {
  await sendPasswordResetEmail('user@company.com');
  console.log('Password reset email sent');
} catch (error) {
  console.error('Failed to send reset email:', error.message);
}
```

---

#### `updatePassword(newPassword)`
Updates the current user's password.

**Parameters:**
- `newPassword: string` - New password

**Returns:** `Promise<void>`

**Note:** Requires recent authentication. User must have signed in recently.

**Example:**
```typescript
import { updatePassword } from '@/lib/firebase/auth';

try {
  await updatePassword('NewSecurePassword123');
  console.log('Password updated');
} catch (error) {
  console.error('Failed to update password:', error.message);
}
```

---

### User Profile Functions

#### `getCurrentUser()`
Gets the current authenticated Firebase Auth user.

**Returns:** `FirebaseUser | null`

**Example:**
```typescript
import { getCurrentUser } from '@/lib/firebase/auth';

const user = getCurrentUser();
if (user) {
  console.log('User ID:', user.uid);
  console.log('Email:', user.email);
} else {
  console.log('No user signed in');
}
```

---

#### `getCurrentUserProfile()`
Gets the current user's profile from Firestore.

**Returns:** `Promise<AuthUser | null>`

**Example:**
```typescript
import { getCurrentUserProfile } from '@/lib/firebase/auth';

const profile = await getCurrentUserProfile();
if (profile) {
  console.log('Name:', profile.name);
  console.log('Role:', profile.role);
  console.log('Department:', profile.department);
}
```

---

#### `updateEmail(newEmail)`
Updates the current user's email address.

**Parameters:**
- `newEmail: string` - New email address

**Returns:** `Promise<void>`

**Note:** Also updates email in Firestore user profile.

**Example:**
```typescript
import { updateEmail } from '@/lib/firebase/auth';

try {
  await updateEmail('newemail@company.com');
  console.log('Email updated');
} catch (error) {
  console.error('Failed to update email:', error.message);
}
```

---

### Auth State Management

#### `onAuthStateChanged(callback)`
Listens to authentication state changes.

**Parameters:**
- `callback: (user: FirebaseUser | null) => void` - Callback function

**Returns:** `() => void` - Unsubscribe function

**Example:**
```typescript
import { onAuthStateChanged } from '@/lib/firebase/auth';

const unsubscribe = onAuthStateChanged((user) => {
  if (user) {
    console.log('User signed in:', user.uid);
  } else {
    console.log('User signed out');
  }
});

// Later, to stop listening:
unsubscribe();
```

---

#### `isAuthenticated()`
Checks if a user is currently signed in.

**Returns:** `boolean`

**Example:**
```typescript
import { isAuthenticated } from '@/lib/firebase/auth';

if (isAuthenticated()) {
  console.log('User is signed in');
} else {
  console.log('User is not signed in');
}
```

---

#### `waitForAuth()`
Waits for authentication state to initialize. Useful for SSR.

**Returns:** `Promise<FirebaseUser | null>`

**Example:**
```typescript
import { waitForAuth } from '@/lib/firebase/auth';

// In a server component or during initialization
const user = await waitForAuth();
if (user) {
  console.log('User is signed in:', user.uid);
}
```

---

## TypeScript Types

### `UserProfile`
Complete user profile data stored in Firestore.

```typescript
interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  department?: string;
  managerId?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  designation?: string;
  employeeId?: string;
  hireDate?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
}
```

### `AuthUser`
User profile with Firebase Auth metadata.

```typescript
interface AuthUser extends UserProfile {
  emailVerified: boolean;
}
```

### `SignUpData`
Data required for user signup.

```typescript
interface SignUpData {
  name: string;
  role: 'admin' | 'employee';
  department?: string;
  phoneNumber?: string;
  designation?: string;
  employeeId?: string;
  hireDate?: string;
}
```

---

## Error Handling

All functions include comprehensive error handling with user-friendly error messages:

- `auth/email-already-in-use` → "This email is already registered"
- `auth/user-not-found` → "No account found with this email"
- `auth/wrong-password` → "Incorrect password"
- `auth/weak-password` → "Password is too weak"
- `auth/requires-recent-login` → "Please sign in again"
- And more...

---

## Usage Examples

### Complete Sign Up Flow

```typescript
import { signUp } from '@/lib/firebase/auth';

const handleSignUp = async (email: string, password: string) => {
  try {
    const user = await signUp(email, password, {
      name: 'Jane Doe',
      role: 'employee',
      department: 'Sales',
      designation: 'Sales Representative',
      employeeId: 'EMP002',
      hireDate: '2024-02-01'
    });
    
    // User is automatically signed in after signup
    console.log('Account created:', user.uid);
    
    // Redirect to dashboard
    router.push('/employee');
  } catch (error: any) {
    console.error('Sign up error:', error.message);
    // Show error to user
  }
};
```

### Complete Sign In Flow

```typescript
import { signIn, getCurrentUserProfile } from '@/lib/firebase/auth';

const handleSignIn = async (email: string, password: string) => {
  try {
    const userProfile = await signIn(email, password);
    
    console.log('Signed in:', userProfile);
    
    // Redirect based on role
    if (userProfile.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/employee');
    }
  } catch (error: any) {
    console.error('Sign in error:', error.message);
    // Show error to user
  }
};
```

### Listen to Auth State

```typescript
import { useEffect } from 'react';
import { onAuthStateChanged } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';

export function useAuthListener() {
  const router = useRouter();
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user) => {
      if (user) {
        console.log('User signed in:', user.uid);
      } else {
        console.log('User signed out');
        router.push('/login');
      }
    });
    
    return () => unsubscribe();
  }, [router]);
}
```

---

## Notes

- All Firestore operations use server timestamps
- User profile is automatically created/updated
- Employee document is created automatically for employee role
- Authentication state persists across page refreshes (Firebase default)
- Error messages are user-friendly and actionable

---

## Next Steps

After implementing authentication service, proceed to:
- Task 5: Create Custom Authentication React Hooks
- Task 6: Update Login Page with Firebase Authentication


