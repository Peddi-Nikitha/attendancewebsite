# Firebase Storage Security Rules Setup

## Problem
You're encountering a `storage/unauthorized` error when trying to access employee documents. This is because Firebase Storage security rules need to be configured to allow authenticated users to access files.

## 🚨 IMMEDIATE FIX (Use This First!)

**If you're still getting permission errors, use the permissive rules to get it working immediately:**

1. Go to: [Firebase Console - Storage Rules](https://console.firebase.google.com/project/attendaceapp-9e768/storage/rules)
2. Copy the **ENTIRE** contents from `storage.rules.permissive` file
3. Paste it into the Firebase Console rules editor (replace everything)
4. Click **Publish**
5. Wait 10-20 seconds for rules to propagate
6. Try accessing the document again

**⚠️ Warning**: These rules allow any authenticated user to access all employee documents. Use only for testing! Switch to secure rules once working.

**After it works, you can switch to `storage.rules` for proper security.**

## Solution (Recommended - Secure Rules)

### Step 1: Deploy Storage Rules

You have two options to deploy the storage rules:

#### Option A: Using Firebase Console (Recommended for Quick Setup)

1. Go directly to: [Firebase Console - Storage Rules](https://console.firebase.google.com/project/attendaceapp-9e768/storage/rules)
2. Copy the contents of `storage.rules` file from your project
3. Paste it into the Firebase Console rules editor
4. Click **Publish**

**Direct Link**: https://console.firebase.google.com/project/attendaceapp-9e768/storage/rules

#### Option B: Using Firebase CLI

If you have Firebase CLI installed:

```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not already done)
firebase init storage

# Deploy the rules
firebase deploy --only storage
```

### Step 2: Verify User Data Structure

The storage rules expect user documents in Firestore with the following structure:

**Collection: `users`**
**Document ID: `{userId}` (Firebase Auth UID)**

```json
{
  "role": "admin" | "employee",
  "employeeId": "employee-doc-id" (for employees),
  "email": "user@example.com",
  "name": "User Name"
}
```

### Step 3: Test the Rules

After deploying:

1. Try accessing an employee document as an authenticated user
2. Verify that:
   - Admins can access all employee documents
   - Employees can only access their own documents
   - Unauthenticated users cannot access any documents

## Rule Explanation

The storage rules work as follows:

1. **Employee Documents** (`employee-docs/{employeeId}/{filename}`):
   - **Read**: Allowed if user is admin OR if the employeeId matches the user's employeeId
   - **Write**: Allowed if user is admin OR if the employeeId matches the user's employeeId

2. **Avatar Images** (`avatars/{userId}`):
   - **Read**: Allowed for all authenticated users
   - **Write**: Allowed only if the userId matches the authenticated user's UID

3. **All Other Paths**: Denied by default

## Troubleshooting

### Error: "User does not have permission"
- Verify the user document exists in Firestore `users` collection
- Check that the `employeeId` field matches the path in Storage
- Ensure the user is authenticated (check `request.auth != null`)

### Error: "Permission denied"
- Make sure the storage rules are deployed
- Check that the user's role is set correctly in Firestore
- Verify the employeeId in the user document matches the employeeId in the storage path

### Testing Rules Locally

You can test rules using the Firebase Emulator Suite:

```bash
firebase emulators:start --only storage
```

## Security Notes

- These rules assume that the `employeeId` in the user document matches the `employeeId` in the storage path
- Admins have full access to all employee documents
- Employees can only access their own documents
- All access requires authentication

