# Deploying to IONOS - Step by Step Guide

This guide will help you deploy your Next.js attendance management application to IONOS hosting.

## Prerequisites

1. IONOS hosting account with Node.js support (or static hosting plan)
2. Access to IONOS control panel
3. Node.js installed locally (for building)
4. Your Firebase configuration credentials

## Option 1: Node.js Hosting (Recommended for Full Features)

IONOS supports Node.js applications. This is the recommended option if you need server-side rendering and API routes.

### Step 1: Build Your Application Locally

1. Open terminal in your project directory
2. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. Build the production version:
   ```bash
   npm run build
   ```

### Step 2: Prepare Environment Variables

Create a `.env.production` file in your project root with your Firebase credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAJweQf9Zyazjh9p0kNh_92Jt6kQ2j03C8
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=attendaceapp-9e768.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=attendaceapp-9e768
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=attendaceapp-9e768.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=640739911427
NEXT_PUBLIC_FIREBASE_APP_ID=1:640739911427:web:c2fd6dee54bb75de2f6b36
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-D3HQ0JB655
```

**Note:** You can also set these in the IONOS control panel under environment variables.

### Step 3: Configure Next.js for Production

Update `next.config.ts` to ensure proper production settings:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Creates a minimal server for deployment
  // Or use 'export' for static export (see Option 2)
};

export default nextConfig;
```

### Step 4: Upload Files to IONOS

1. **Via FTP/SFTP:**
   - Connect to your IONOS hosting via FTP/SFTP client (FileZilla, WinSCP, etc.)
   - Upload the entire project folder to your hosting directory (usually `htdocs` or `www`)
   - Make sure to include:
     - `.next` folder (build output)
     - `node_modules` folder (or install on server)
     - `package.json`
     - `next.config.ts`
     - All source files
     - `.env.production` (or set environment variables in control panel)

2. **Via IONOS Control Panel:**
   - Log into your IONOS account
   - Navigate to your hosting package
   - Use the File Manager to upload files
   - Or use Git deployment if available

### Step 5: Install Dependencies on Server

SSH into your IONOS server and run:

```bash
cd /path/to/your/project
npm install --production
```

### Step 6: Configure Node.js in IONOS

1. In IONOS control panel, navigate to **Node.js** settings
2. Set the **Start File** to: `server.js` or configure to run `npm start`
3. Set the **Node.js Version** (recommended: Node.js 18 or 20)
4. Set **Port** (usually 3000, but check IONOS documentation)
5. Add environment variables in the control panel if not using `.env` file

### Step 7: Start the Application

IONOS may auto-start your Node.js app, or you may need to:

1. Create a `start.sh` script:
   ```bash
   #!/bin/bash
   cd /path/to/your/project
   npm start
   ```

2. Or configure in IONOS control panel to run: `npm start`

### Step 8: Configure Domain and SSL

1. Point your domain to IONOS nameservers
2. Enable SSL certificate in IONOS control panel
3. Configure reverse proxy if needed (IONOS may handle this automatically)

---

## Option 2: Static Export (Simpler, Limited Features)

If you don't need server-side rendering, you can export a static version.

### Step 1: Configure for Static Export

Update `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;
```

### Step 2: Build Static Export

```bash
npm run build
```

This will create an `out` folder with static files.

### Step 3: Upload to IONOS

1. Upload the entire contents of the `out` folder to your IONOS web directory (`htdocs` or `www`)
2. Set your domain's document root to point to this directory

### Step 4: Configure Environment Variables

Since static exports can't use server-side environment variables, you'll need to:

1. Update `lib/firebase/config.ts` to use hardcoded values (already has fallbacks)
2. Or use client-side environment variables (they're already prefixed with `NEXT_PUBLIC_`)

---

## Important Notes

### Firebase Configuration
- Your Firebase config already has fallback values, so it should work
- For production, it's better to use environment variables
- Make sure your Firebase project allows your IONOS domain in authorized domains

### Firebase Authorized Domains
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add your IONOS domain (e.g., `yourdomain.com`, `www.yourdomain.com`)

### Performance Optimization
- Enable compression in IONOS control panel
- Use CDN if available
- Enable caching headers

### Troubleshooting

1. **Build Errors:**
   - Check Node.js version compatibility
   - Ensure all dependencies are installed
   - Review build logs

2. **Runtime Errors:**
   - Check environment variables are set correctly
   - Verify Firebase configuration
   - Check server logs in IONOS control panel

3. **Connection Issues:**
   - Verify domain DNS settings
   - Check firewall/security settings
   - Ensure port is accessible

---

## Quick Deployment Checklist

- [ ] Build application locally (`npm run build`)
- [ ] Set up environment variables
- [ ] Upload files to IONOS
- [ ] Install dependencies on server
- [ ] Configure Node.js in IONOS control panel
- [ ] Add domain to Firebase authorized domains
- [ ] Test the application
- [ ] Enable SSL certificate
- [ ] Configure custom domain

---

## IONOS-Specific Configuration

IONOS hosting structure typically looks like:
```
/home/username/
  └── htdocs/          (or www/)
      └── your-app/
          ├── .next/
          ├── node_modules/
          ├── app/
          ├── components/
          ├── lib/
          ├── package.json
          └── next.config.ts
```

### Recommended IONOS Settings:
- **Node.js Version:** 18.x or 20.x
- **Start Command:** `npm start` or `node server.js`
- **Port:** Check IONOS documentation (may be auto-assigned)
- **Working Directory:** `/htdocs/your-app` or your project path

---

## Support Resources

- [IONOS Node.js Documentation](https://www.ionos.com/help/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Firebase Hosting Setup](https://firebase.google.com/docs/hosting)

---

**Need Help?** If you encounter issues, check:
1. IONOS server logs
2. Next.js build output
3. Browser console for client-side errors
4. Firebase console for authentication issues

