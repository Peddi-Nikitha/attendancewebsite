# Firebase Configuration

This directory contains the Firebase SDK configuration and services for the Attendance Management System.

## Files

- `config.ts` - Main Firebase configuration file that initializes all Firebase services
- `test-config.ts` - Utility file for testing Firebase configuration (can be removed after verification)

## Services Initialized

### 1. Authentication (`auth`)
Firebase Authentication service for user authentication.

```typescript
import { auth } from '@/lib/firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';

// Example usage
await signInWithEmailAndPassword(auth, email, password);
```

### 2. Firestore (`db`)
Cloud Firestore database for storing application data.

```typescript
import { db } from '@/lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';

// Example usage
const usersRef = collection(db, 'users');
const snapshot = await getDocs(usersRef);
```

### 3. Storage (`storage`)
Firebase Storage for file uploads (avatars, attachments, PDFs).

```typescript
import { storage } from '@/lib/firebase/config';
import { ref, uploadBytes } from 'firebase/storage';

// Example usage
const storageRef = ref(storage, 'avatars/user123.jpg');
await uploadBytes(storageRef, file);
```

### 4. Analytics (`analytics`)
Firebase Analytics for tracking user behavior (client-side only).

```typescript
import { analytics } from '@/lib/firebase/config';
import { logEvent } from 'firebase/analytics';

// Example usage (client-side only)
if (analytics) {
  logEvent(analytics, 'page_view', { page_path: '/dashboard' });
}
```

## Configuration

The Firebase configuration uses environment variables with fallback values:

```typescript
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "fallback_value",
  // ... other config
};
```

### Environment Variables

Create a `.env.local` file in the project root (optional, fallback values are already in config.ts):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

**Note**: `.env.local` is already in `.gitignore` and will not be committed to the repository.

## Testing Configuration

To verify that all Firebase services are properly initialized, you can use the test utility:

```typescript
import { testFirebaseConfig } from '@/lib/firebase/test-config';

// In a React component or page
testFirebaseConfig();
```

## Project Information

- **Project ID**: `attendaceapp-9e768`
- **Auth Domain**: `attendaceapp-9e768.firebaseapp.com`
- **Storage Bucket**: `attendaceapp-9e768.firebasestorage.app`

## Next Steps

1. ✅ Firebase SDK installed and configured
2. ⬜ Enable Authentication in Firebase Console (Email/Password)
3. ⬜ Create Firestore Database in Firebase Console
4. ⬜ Set up Firestore Security Rules (Task 3)
5. ⬜ Create Authentication Service (Task 4)

## Troubleshooting

### Common Issues

1. **"Firebase App already initialized" error**
   - This is normal in development with hot reloading
   - Firebase SDK handles this automatically

2. **Analytics is null**
   - This is expected on the server-side (Next.js SSR)
   - Analytics only initializes on the client-side

3. **Environment variables not loading**
   - Ensure variables start with `NEXT_PUBLIC_` prefix
   - Restart the Next.js dev server after adding env vars
   - Check `.env.local` file exists in project root


