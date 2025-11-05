/**
 * Firebase Authentication Service
 * 
 * This module provides authentication functions for Firebase Authentication
 * and manages user profile data in Firestore.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  updateProfile as firebaseUpdateProfile,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
  UserCredential,
  AuthError,
  updateEmail as firebaseUpdateEmail,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  Timestamp,
  collection,
  getDocs,
  query,
  where,
  limit as fsLimit,
} from 'firebase/firestore';
import { auth, db } from './config';

// ============================================
// TypeScript Types
// ============================================

export type UserRole = 'admin' | 'employee';

export interface UserProfile {
  id: string; // Firebase Auth UID
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  managerId?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  designation?: string;
  employeeId?: string;
  hireDate?: string; // YYYY-MM-DD
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
}

export interface AuthUser extends UserProfile {
  // Additional fields from Firebase Auth
  emailVerified: boolean;
}

export interface SignUpData {
  name: string;
  role: UserRole;
  department?: string;
  phoneNumber?: string;
  designation?: string;
  employeeId?: string;
  hireDate?: string;
}

export interface EmployeeData {
  userId: string;
  employeeId: string;
  department: string;
  managerId?: string;
  designation: string;
  joinDate: string; // YYYY-MM-DD
  salary?: {
    basic: number;
    allowances: number;
    deductions: number;
  };
  leaveBalance?: {
    casual: number;
    sick: number;
    privilege: number;
  };
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// Authentication Functions
// ============================================

/**
 * Sign up a new user with email and password
 * Creates Firebase Auth user and user profile in Firestore
 * Also creates employee document if role is 'employee'
 * 
 * @param email - User's email address
 * @param password - User's password
 * @param userData - Additional user profile data
 * @returns Firebase User object
 * @throws Error if signup fails
 */
export async function signUp(
  email: string,
  password: string,
  userData: SignUpData
): Promise<FirebaseUser> {
  try {
    // Validate inputs
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (!userData.name || !userData.role) {
      throw new Error('Name and role are required');
    }

    // Create Firebase Auth user
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    // Create user profile in Firestore
    const userProfile: Omit<UserProfile, 'lastLoginAt'> = {
      id: user.uid,
      email: user.email!,
      name: userData.name,
      role: userData.role,
      department: userData.department,
      phoneNumber: userData.phoneNumber,
      designation: userData.designation,
      employeeId: userData.employeeId,
      hireDate: userData.hireDate,
      isActive: true,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    // Save user profile to Firestore
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, userProfile);

    // If role is employee, create employee document
    if (userData.role === 'employee' && userData.department && userData.designation) {
      const employeeId = userData.employeeId || `EMP-${user.uid.substring(0, 8).toUpperCase()}`;
      
      const employeeData: EmployeeData = {
        userId: user.uid,
        employeeId: employeeId,
        department: userData.department,
        designation: userData.designation,
        joinDate: userData.hireDate || new Date().toISOString().split('T')[0],
        isActive: true,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      };

      const employeeDocRef = doc(db, 'employees', user.uid); // Use userId as document ID
      await setDoc(employeeDocRef, employeeData);

      // Update user profile with employeeId
      await setDoc(
        userDocRef,
        { employeeId: employeeId },
        { merge: true }
      );
    }

    // Update Firebase Auth display name
    if (userData.name) {
      await firebaseUpdateProfile(user, {
        displayName: userData.name,
      });
    }

    return user;
  } catch (error: any) {
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email is already registered. Please sign in instead.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Please use a stronger password.');
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Email/password accounts are not enabled.');
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to create account. Please try again.');
    }
  }
}

/**
 * Sign in an existing user with email and password
 * Fetches user profile from Firestore
 * 
 * @param email - User's email address
 * @param password - User's password
 * @returns User profile data
 * @throws Error if sign in fails
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthUser> {
  try {
    // Validate inputs
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Attempt Firestore-based credential login first (employees collection)
    const emailLower = email.trim().toLowerCase();
    try {
      const qEmployees = query(
        collection(db, 'employees'),
        where('email', '==', emailLower),
        fsLimit(1)
      );
      const snaps = await getDocs(qEmployees);
      if (!snaps.empty) {
        const docSnap = snaps.docs[0];
        const employee = docSnap.data() as any;
        if (employee?.passwordHash) {
          // DJB2 deterministic hash (for demo)
          let h = 5381 >>> 0;
          for (let i = 0; i < password.length; i++) {
            h = (((h << 5) + h) + password.charCodeAt(i)) >>> 0;
          }
          const hash = h.toString(16);
          if (hash === employee.passwordHash) {
            const now = Timestamp.now();
            const role = (employee.role === 'admin' ? 'admin' : 'employee') as UserRole;
            const userProfile: AuthUser = {
              id: employee.userId || docSnap.id,
              email: emailLower,
              name: employee.name || emailLower,
              role,
              department: employee.department,
              isActive: employee.isActive !== false,
              createdAt: employee.createdAt || now,
              updatedAt: now,
              emailVerified: false,
            } as AuthUser;
            return userProfile;
          }
        }
      }
    } catch {}

    // Sign in with Firebase Auth
    const userCredential: UserCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    // Fetch user profile from Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // User doesn't have a profile, sign them out
      await firebaseSignOut(auth);
      throw new Error('User profile not found. Please contact support.');
    }

    const userData = userDoc.data() as UserProfile;

    // Update last login time
    await setDoc(
      userDocRef,
      { lastLoginAt: serverTimestamp() },
      { merge: true }
    );

    // Return combined user data
    return {
      ...userData,
      emailVerified: user.emailVerified,
    } as AuthUser;
  } catch (error: any) {
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email address.');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Incorrect password. Please try again.');
    } else if (error.code === 'auth/invalid-credential') {
      // Firebase sometimes returns this instead of wrong-password/user-not-found
      throw new Error('Incorrect email or password.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    } else if (error.code === 'auth/user-disabled') {
      throw new Error('This account has been disabled.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed attempts. Please try again later.');
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to sign in. Please try again.');
    }
  }
}

/**
 * Sign out the current user
 * 
 * @returns Promise that resolves when sign out is complete
 * @throws Error if sign out fails
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    throw new Error('Failed to sign out. Please try again.');
  }
}

/**
 * Send password reset email
 * 
 * @param email - User's email address
 * @returns Promise that resolves when email is sent
 * @throws Error if sending email fails
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  try {
    if (!email) {
      throw new Error('Email is required');
    }

    await firebaseSendPasswordResetEmail(auth, email);
  } catch (error: any) {
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email address.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to send password reset email. Please try again.');
    }
  }
}

/**
 * Update user's password
 * Requires the user to be signed in
 * 
 * @param newPassword - New password
 * @returns Promise that resolves when password is updated
 * @throws Error if update fails
 */
export async function updatePassword(newPassword: string): Promise<void> {
  try {
    if (!newPassword) {
      throw new Error('New password is required');
    }

    const user = auth.currentUser;
    if (!user) {
      throw new Error('You must be signed in to update your password.');
    }

    await firebaseUpdatePassword(user, newPassword);
  } catch (error: any) {
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Please use a stronger password.');
    } else if (error.code === 'auth/requires-recent-login') {
      throw new Error('Please sign in again to update your password.');
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to update password. Please try again.');
    }
  }
}

/**
 * Get current authenticated user
 * 
 * @returns Firebase User object or null if not signed in
 */
export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}

/**
 * Get current user's profile from Firestore
 * 
 * @returns User profile data or null if not signed in or profile not found
 */
export async function getCurrentUserProfile(): Promise<AuthUser | null> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data() as UserProfile;

    return {
      ...userData,
      emailVerified: user.emailVerified,
    } as AuthUser;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Listen to authentication state changes
 * 
 * @param callback - Function called when auth state changes
 * @returns Unsubscribe function
 */
export function onAuthStateChanged(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return firebaseOnAuthStateChanged(auth, callback);
}

/**
 * Update user's email address
 * Requires recent authentication
 * 
 * @param newEmail - New email address
 * @returns Promise that resolves when email is updated
 * @throws Error if update fails
 */
export async function updateEmail(newEmail: string): Promise<void> {
  try {
    if (!newEmail) {
      throw new Error('New email is required');
    }

    const user = auth.currentUser;
    if (!user) {
      throw new Error('You must be signed in to update your email.');
    }

    await firebaseUpdateEmail(user, newEmail);

    // Update email in Firestore user profile
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(
      userDocRef,
      { email: newEmail, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (error: any) {
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email is already in use by another account.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    } else if (error.code === 'auth/requires-recent-login') {
      throw new Error('Please sign in again to update your email.');
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to update email. Please try again.');
    }
  }
}

/**
 * Check if user is authenticated
 * 
 * @returns true if user is signed in, false otherwise
 */
export function isAuthenticated(): boolean {
  return auth.currentUser !== null;
}

/**
 * Wait for auth state to initialize
 * Useful for server-side rendering
 * 
 * @returns Promise that resolves with current user or null
 */
export function waitForAuth(): Promise<FirebaseUser | null> {
  return new Promise((resolve) => {
    const unsubscribe = firebaseOnAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}


