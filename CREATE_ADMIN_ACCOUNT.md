# How to Create Admin Firebase Auth Account

## Problem
The credentials `admin@example.com` / `admin123` don't work because they need to be in Firebase Authentication, not just localStorage.

## Solution: Create Firebase Auth Account

### Option 1: Using Firebase Console (Easiest)

1. **Go to Firebase Console**
   - Open: https://console.firebase.google.com/project/attendaceapp-9e768/authentication/users

2. **Add User**
   - Click the **"Add user"** button (top of the page)
   - **Email**: `admin@example.com`
   - **Password**: `admin123` (or any password you prefer)
   - Click **"Add user"**

3. **Log In**
   - Go back to your app
   - Use `admin@example.com` / `admin123` to log in
   - It should work now!

### Option 2: Using Your App's Sign Up (If Available)

If your app has a sign-up page:
1. Go to sign-up page
2. Create account with:
   - Email: `admin@example.com`
   - Password: `admin123`
   - Role: `admin`

### Option 3: Use Different Credentials

If you already have a Firebase Auth account:
1. Use those credentials to log in
2. Make sure the user has `role: "admin"` in Firestore `users` collection

## Verify It Works

After creating the account:
1. Log out of your app
2. Log in with `admin@example.com` / `admin123`
3. Try uploading a document
4. It should work!

## Important Notes

- Firebase Auth is separate from Firestore
- You need BOTH:
  - Firebase Auth account (for Storage access)
  - Firestore user document (for app data)
- The user document in Firestore should have `role: "admin"`

