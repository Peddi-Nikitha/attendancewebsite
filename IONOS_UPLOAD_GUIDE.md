# 🚀 IONOS Upload Guide - Build Ready

## ✅ Build Status

**Build Date:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  
**Build Type:** Static Export  
**Output Directory:** `out/`  
**Total HTML Pages:** 29 pages  
**Status:** ✅ Ready for Upload

## 📦 What to Upload

Upload **ALL contents** from the `out` folder to your IONOS web directory (`htdocs` or `www`).

### Critical Files:
- ✅ `.htaccess` - **MUST be in root directory** (essential for routing)
- ✅ `index.html` - Landing page
- ✅ All `.html` files (29 pages total)
- ✅ `_next/` folder - Contains all JavaScript, CSS, and assets
- ✅ All other folders and files

## 📋 Upload Checklist

### Step 1: Connect to IONOS
1. Use FTP/SFTP client (FileZilla, WinSCP, etc.)
2. Connect to your IONOS hosting
3. Navigate to your web directory (`htdocs` or `www`)

### Step 2: Upload Files
1. **Upload everything from the `out` folder**
2. **IMPORTANT:** Make sure `.htaccess` is uploaded to the root
3. Maintain the folder structure exactly as it is in `out/`

### Step 3: Verify File Structure
Your IONOS directory should look like this:
```
htdocs/ (or www/)
├── .htaccess          ← CRITICAL: Must be in root
├── index.html
├── admin.html
├── admin-employees.html
├── employee.html
├── employee-mark-attendance.html
├── login.html
├── _next/             ← Contains all JS/CSS assets
│   └── static/
├── admin-employees/
├── employee-mark-attendance/
└── ... (all other folders)
```

## 🔧 Routes Generated

### Admin Routes (11 routes)
- `/admin` → admin.html
- `/admin-employees` → admin-employees.html
- `/admin-attendance` → admin-attendance.html
- `/admin-timesheets` → admin-timesheets.html
- `/admin-leaves` → admin-leaves.html
- `/admin-payslips` → admin-payslips.html
- `/admin-holidays` → admin-holidays.html
- `/admin-reports` → admin-reports.html
- `/admin-projects` → admin-projects.html
- `/admin-settings` → admin-settings.html
- `/admin-profile` → admin-profile.html

### Employee Routes (9 routes)
- `/employee` → employee.html
- `/employee-mark-attendance` → employee-mark-attendance.html
- `/employee-attendance-history` → employee-attendance-history.html
- `/employee-timesheet` → employee-timesheet.html
- `/employee-leave` → employee-leave.html
- `/employee-payslips` → employee-payslips.html
- `/employee-documents` → employee-documents.html
- `/employee-profile` → employee-profile.html
- `/employee-projects` → employee-projects.html

### Auth Routes (5 routes)
- `/login` → login.html
- `/forgot-password` → forgot-password.html
- `/reset-password` → reset-password.html
- `/verify-otp` → verify-otp.html
- `/profile-setup` → profile-setup.html

### Other Routes
- `/` → index.html (Landing page)
- `/sitemap` → sitemap.html

## ⚠️ Important Notes

### 1. .htaccess File
- **CRITICAL:** The `.htaccess` file is essential for routing to work
- It must be in the root directory of your web server
- It handles URL rewriting (e.g., `/admin` → `admin.html`)
- If routes don't work, check that `.htaccess` is uploaded correctly

### 2. File Permissions
- Ensure `.htaccess` has read permissions (644 or 755)
- All HTML files should be readable (644)
- Folders should have execute permissions (755)

### 3. Firebase Configuration
- Firebase credentials are already configured in the build
- Make sure your Firebase project allows your IONOS domain:
  1. Go to Firebase Console → Authentication → Settings
  2. Add your domain to "Authorized domains"

### 4. Testing After Upload
1. Visit your domain root (`https://yourdomain.com`)
2. Test login functionality
3. Test navigation (admin and employee routes)
4. Verify all pages load correctly

## 🐛 Troubleshooting

### Routes Not Working?
1. ✅ Check `.htaccess` is in root directory
2. ✅ Verify file permissions (644 for files, 755 for folders)
3. ✅ Check IONOS supports `.htaccess` (Apache servers do by default)
4. ✅ Clear browser cache and try again

### Pages Not Loading?
1. ✅ Verify all files uploaded correctly
2. ✅ Check `_next/` folder is uploaded completely
3. ✅ Verify file paths are correct
4. ✅ Check browser console for errors

### Firebase Errors?
1. ✅ Add your domain to Firebase authorized domains
2. ✅ Check Firebase project settings
3. ✅ Verify Firebase credentials are correct

## 📊 Build Summary

- **Total Routes:** 29 static pages
- **Build Output:** `out/` directory
- **Build Size:** Check folder size before upload
- **Build Time:** ~34 seconds
- **Status:** ✅ Successfully built and ready

## 🎯 Quick Upload Steps

1. **Open FTP client** and connect to IONOS
2. **Navigate to web directory** (`htdocs` or `www`)
3. **Select all files** from the `out` folder
4. **Upload everything** to IONOS root
5. **Verify `.htaccess`** is in root directory
6. **Test your website** at your domain

---

**Your build is ready! Upload the `out` folder contents to IONOS and you're good to go! 🚀**

