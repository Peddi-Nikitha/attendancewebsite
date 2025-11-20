# IONOS Deployment Instructions

## Build Status: ✅ Ready for Deployment

Your application has been successfully built and is ready to upload to IONOS.

## Build Information

- **Build Date:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
- **Build Type:** Static Export
- **Output Directory:** `out/`
- **Total Routes:** 31 static pages

## Deployment Steps

### Step 1: Upload Files to IONOS

1. **Connect to IONOS via FTP/SFTP:**
   - Use FileZilla, WinSCP, or any FTP client
   - Connect to your IONOS hosting account
   - Navigate to your web directory (usually `htdocs` or `www`)

2. **Upload the `out` folder contents:**
   - Upload **ALL** files and folders from the `out` directory
   - **IMPORTANT:** Make sure to include the `.htaccess` file (it's in the root of `out`)
   - Upload the `_next` folder (contains JavaScript and CSS assets)
   - Upload all HTML files
   - Upload all other assets (images, icons, etc.)

3. **File Structure on IONOS should look like:**
   ```
   htdocs/
   ├── .htaccess          ← CRITICAL: Must be in root
   ├── index.html
   ├── admin.html
   ├── admin-employees.html
   ├── admin-attendance.html
   ├── employee.html
   ├── employee-leave.html
   ├── _next/             ← Contains all JS/CSS assets
   │   └── static/
   ├── admin-employees/
   ├── employee-mark-attendance/
   └── ... (all other folders)
   ```

### Step 2: Verify .htaccess File

**CRITICAL:** The `.htaccess` file is essential for proper routing. Verify:

1. The `.htaccess` file is uploaded to the root of your web directory
2. IONOS supports `.htaccess` files (Apache servers do by default)
3. File permissions allow the web server to read it

If routes don't work after deployment, check:
- `.htaccess` file is present in the root directory
- File permissions are correct (644 or 755)
- IONOS has `.htaccess` support enabled

### Step 3: Configure Domain (if needed)

1. Point your domain to IONOS nameservers
2. Set the document root to your upload directory
3. Enable SSL certificate in IONOS control panel

### Step 4: Test the Application

After uploading, test these key routes:

**Admin Routes:**
- `/admin` - Admin Dashboard
- `/admin-employees` - Employee Management
- `/admin-attendance` - Attendance
- `/admin-timesheets` - Timesheets
- `/admin-leaves` - Leaves
- `/admin-payslips` - Payslips
- `/admin-holidays` - Holidays
- `/admin-reports` - Reports
- `/admin-projects` - Projects
- `/admin-settings` - Settings
- `/admin-profile` - Admin Profile

**Employee Routes:**
- `/employee` - Employee Dashboard
- `/employee-mark-attendance` - Mark Attendance
- `/employee-attendance-history` - Attendance History
- `/employee-timesheet` - Timesheet
- `/employee-leave` - Leave Requests
- `/employee-payslips` - Payslips
- `/employee-documents` - Documents
- `/employee-profile` - Employee Profile
- `/employee-projects` - Projects

**Auth Routes:**
- `/login` - Login Page
- `/forgot-password` - Password Recovery
- `/reset-password` - Reset Password
- `/verify-otp` - OTP Verification
- `/profile-setup` - Profile Setup

### Step 5: Firebase Configuration

Your Firebase configuration is already embedded in the build with fallback values. However, for production:

1. **Add IONOS Domain to Firebase:**
   - Go to Firebase Console → Authentication → Settings → Authorized domains
   - Add your IONOS domain (e.g., `yourdomain.com`, `www.yourdomain.com`)

2. **Verify Firebase Rules:**
   - Ensure Firestore security rules allow your domain
   - Check Storage rules if using file uploads

## Troubleshooting

### Issue: 404 Errors on Navigation

**Solution:**
1. Verify `.htaccess` file is uploaded and in the root directory
2. Check file permissions (should be 644 or 755)
3. Contact IONOS support to ensure `.htaccess` support is enabled
4. Verify Apache mod_rewrite is enabled

### Issue: Assets Not Loading (CSS/JS)

**Solution:**
1. Ensure the `_next` folder is uploaded completely
2. Check that file paths are correct (case-sensitive on some servers)
3. Verify `.htaccess` rules for serving static files

### Issue: Firebase Authentication Not Working

**Solution:**
1. Add your IONOS domain to Firebase authorized domains
2. Check browser console for CORS errors
3. Verify Firebase configuration in `lib/firebase/config.ts`

### Issue: Routes Show "Not Found"

**Solution:**
1. Check `.htaccess` file is present and readable
2. Verify route files exist (e.g., `admin-employees.html`)
3. Test with direct file access (e.g., `yoursite.com/admin-employees.html`)

## Quick Upload Checklist

- [ ] All files from `out` folder uploaded
- [ ] `.htaccess` file is in the root directory
- [ ] `_next` folder uploaded completely
- [ ] All HTML files uploaded
- [ ] Domain configured and pointing to IONOS
- [ ] SSL certificate enabled
- [ ] Firebase domain added to authorized domains
- [ ] Tested all main routes
- [ ] Verified navigation works correctly

## File Size Information

The `out` folder contains:
- Static HTML files for all routes
- JavaScript bundles in `_next/static/`
- CSS files in `_next/static/`
- Images and other assets
- `.htaccess` configuration file

**Total size:** Check the `out` folder size before uploading to estimate upload time.

## Support

If you encounter issues:
1. Check IONOS server logs
2. Review browser console for errors
3. Verify Firebase console for authentication issues
4. Test routes directly by accessing HTML files

---

**Build completed successfully!** Your application is ready for deployment to IONOS.

