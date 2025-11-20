# 📤 What to Upload to IONOS

## Answer: Upload the `out` folder contents

You have two options:

### Option 1: Upload `out` folder contents directly (Recommended)

1. Open your FTP client (FileZilla, WinSCP, etc.)
2. Connect to your IONOS hosting
3. Navigate to your web directory (usually `htdocs` or `www`)
4. **Select ALL files and folders from the `out` folder**
5. Upload them to the **root** of your IONOS web directory

### Option 2: Use the zip file

1. Extract `attendance-build-20251118-224327.zip` on your computer
2. Upload the extracted contents to IONOS

---

## 📁 What's Inside the `out` Folder

### Critical Files (Must Upload):
- ✅ **`.htaccess`** - Required for routing (MUST be in root!)
- ✅ **`index.html`** - Home page
- ✅ **`_next/`** folder - Contains all JavaScript and CSS (REQUIRED!)

### HTML Files (All routes):
- `admin.html`
- `admin-employees.html`
- `admin-attendance.html`
- `admin-timesheets.html`
- `admin-leaves.html`
- `admin-payslips.html`
- `admin-holidays.html`
- `admin-reports.html`
- `admin-projects.html`
- `admin-settings.html`
- `admin-profile.html`
- `employee.html`
- `employee-mark-attendance.html`
- `employee-attendance-history.html`
- `employee-timesheet.html`
- `employee-leave.html`
- `employee-payslips.html`
- `employee-documents.html`
- `employee-profile.html`
- `employee-projects.html`
- `login.html`
- `forgot-password.html`
- `reset-password.html`
- `verify-otp.html`
- `profile-setup.html`
- `sitemap.html`
- `404.html`
- `_not-found.html`

### Folders to Upload:
- `_next/` - JavaScript and CSS assets (CRITICAL!)
- `admin-employees/` - Employee documents subfolder
- `admin-attendance/` - Route folder
- `admin-timesheets/` - Route folder
- `admin-leaves/` - Route folder
- `admin-payslips/` - Route folder
- `admin-holidays/` - Route folder
- `admin-reports/` - Route folder
- `admin-projects/` - Route folder
- `admin-settings/` - Route folder
- `admin-profile/` - Route folder
- `employee-mark-attendance/` - Route folder
- `employee-attendance-history/` - Route folder
- `employee-timesheet/` - Route folder
- `employee-leave/` - Route folder
- `employee-payslips/` - Route folder
- `employee-documents/` - Route folder
- `employee-profile/` - Route folder
- `employee-projects/` - Route folder
- `login/` - Route folder
- `forgot-password/` - Route folder
- `reset-password/` - Route folder
- `verify-otp/` - Route folder
- `profile-setup/` - Route folder
- `sitemap/` - Route folder
- `_not-found/` - 404 page folder

### Other Files:
- `favicon.ico`
- `file.svg`
- `globe.svg`
- `next.svg`
- `vercel.svg`
- `window.svg`
- Various `.txt` files (can be ignored, but won't hurt to upload)

---

## 🎯 IONOS Directory Structure (After Upload)

Your IONOS web directory should look like this:

```
htdocs/ (or www/)
├── .htaccess              ← MUST be here!
├── index.html
├── admin.html
├── admin-employees.html
├── employee-leave.html
├── ... (all other HTML files)
├── _next/                 ← JavaScript & CSS
│   └── static/
│       └── ...
├── admin-employees/
├── employee-mark-attendance/
└── ... (all other folders)
```

---

## ⚠️ Important Notes

1. **`.htaccess` MUST be in the root** - Without it, routes won't work!
2. **Upload `_next/` folder** - Contains all JavaScript and CSS, required for the app to work
3. **Upload all folders** - Even if they seem empty, they may contain important files
4. **Case sensitivity** - Some servers are case-sensitive, so keep exact file names

---

## ✅ Quick Checklist

- [ ] `.htaccess` file uploaded to root
- [ ] `index.html` uploaded
- [ ] All `.html` files uploaded
- [ ] `_next/` folder uploaded completely
- [ ] All route folders uploaded
- [ ] Assets (images, icons) uploaded

---

## 🚀 After Upload

1. Test your domain: `https://yourdomain.com`
2. Test login: `https://yourdomain.com/login`
3. Test admin routes: `https://yourdomain.com/admin-employees`
4. Test employee routes: `https://yourdomain.com/employee-leave`

If routes don't work, check that `.htaccess` is in the root directory!

