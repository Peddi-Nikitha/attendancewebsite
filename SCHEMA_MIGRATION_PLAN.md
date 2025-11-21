# Web Application Schema Migration Plan
## Mobile Application Schema Compatibility

**Date:** 2025-01-XX  
**Purpose:** Migrate web application Firestore schema to be compatible with mobile application schema while preserving mobile app fields and adding web app enhancements.

---

## Executive Summary

This document outlines the migration plan to unify the web and mobile application schemas. The mobile application schema will serve as the base, and web application fields will be mapped or added to maintain compatibility.

**Key Principles:**
1. **Mobile schema is the base** - All existing mobile app fields remain unchanged
2. **Web fields are mapped** - Web app fields are mapped to mobile schema equivalents
3. **New fields are additive** - Web app specific features are added as optional fields
4. **Backward compatibility** - Both apps continue to work during and after migration

---

## 1. Users Collection Migration

### 1.1 Current State Analysis

**Mobile App Schema (`users`):**
```typescript
{
  uid: string,                    // Firebase Auth UID (document ID)
  email: string,                  // ✅ Required
  display_name: string,           // ✅ Required
  full_name?: string,             // Recommended
  photo_url?: string,            // Storage path or URL
  phone_number?: string,         // E.164 format
  employee_id?: string,          // Internal employee ID
  department?: string,           // Department name/code
  Gender?: string,               // male/female/other/prefer_not_to_say
  dob?: string | Timestamp,     // Date of birth
  created_time: Timestamp,       // ✅ Required
  checkin_status?: boolean,      // Default: false
  checkin_time?: Timestamp,      // Latest check-in
  checkin_location?: GeoPoint,   // GPS at check-in
  checkout_time?: Timestamp,     // Latest check-out
  last_active?: Timestamp,       // Last activity time
  roles?: string[],              // ['admin', 'employee', 'manager']
  meta?: object                  // Extra non-queryable data
}
```

**Web App Schema (`users` + `employees`):**
```typescript
// users collection
{
  id: string,                    // Firebase Auth UID
  email: string,                 // ✅ Required
  name: string,                  // ✅ Required
  role: 'admin' | 'employee',   // ✅ Required
  department?: string,
  managerId?: string,
  phoneNumber?: string,
  avatarUrl?: string,
  designation?: string,
  employeeId?: string,
  hireDate?: string,            // YYYY-MM-DD
  isActive: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastLoginAt?: Timestamp
}

// employees collection (separate)
{
  id: string,
  userId: string,               // Reference to users
  employeeId: string,
  name?: string,
  firstName?: string,
  lastName?: string,
  email?: string,
  role?: 'employee' | 'admin',
  department: string,
  managerId?: string,
  designation?: string,
  joinDate: string,
  dateOfBirth?: string,
  address?: string,
  phoneNumber?: string,
  salary?: { basic, allowances, deductions },
  leaveBalance?: { casual, sick, privilege },
  isActive: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 1.2 Migration Strategy

**Target Unified Schema (`users` collection):**
```typescript
{
  // Mobile App Base Fields (PRESERVE - DO NOT CHANGE)
  uid: string,                    // ✅ Document ID = Firebase Auth UID
  email: string,                  // ✅ Required
  display_name: string,           // ✅ Required (maps from web: name)
  full_name?: string,             // Maps from web: firstName + lastName
  photo_url?: string,            // Maps from web: avatarUrl
  phone_number?: string,         // Maps from web: phoneNumber
  employee_id?: string,          // Maps from web: employeeId
  department?: string,           // ✅ Preserved
  Gender?: string,               // ✅ Preserved (add from web if missing)
  dob?: string | Timestamp,      // Maps from web: dateOfBirth
  created_time: Timestamp,       // ✅ Required (maps from createdAt)
  checkin_status?: boolean,      // ✅ Preserved
  checkin_time?: Timestamp,      // ✅ Preserved
  checkin_location?: GeoPoint,   // ✅ Preserved
  checkout_time?: Timestamp,     // ✅ Preserved
  last_active?: Timestamp,       // Maps from web: lastLoginAt
  roles?: string[],              // Maps from web: [role]
  meta?: object,                 // ✅ Preserved
  
  // Web App Additional Fields (ADD - NEW)
  managerId?: string,            // ✅ Add (web app field)
  designation?: string,          // ✅ Add (web app field)
  hireDate?: string,            // ✅ Add (web app field - YYYY-MM-DD)
  isActive?: boolean,            // ✅ Add (web app field, default: true)
  updatedAt?: Timestamp,         // ✅ Add (web app field)
  address?: string,              // ✅ Add (web app field)
  firstName?: string,           // ✅ Add (web app field - for backward compat)
  lastName?: string,            // ✅ Add (web app field - for backward compat)
  
  // Salary Package Fields (from mobile schema - ADD if not exists)
  salary_package?: {            // ✅ Add (from mobile salarypackage collection)
    yearly_salary?: number,
    monthly_salary?: number,
    basic_salary?: number,
    hra?: number,
    special_allowance?: number,
    bonus?: number,
    pf_number?: string,
    pf_employee?: number,
    pf_employer?: number,
    esi_employee?: number,
    esi_employer?: number,
    tax_deduction?: number,
    lop_rate_per_day?: number
  },
  
  // Leave Balance Fields (from mobile schema - ADD if not exists)
  leave_balance?: {              // ✅ Add (from mobile leave_balance collection)
    year?: number,
    sick_leave?: number,
    casual_leave?: number,
    medical_leave?: number,
    earned_leave?: number,
    total_leave?: number,
    used_leave?: number,
    carry_forward?: number,
    pending_applied?: number
  }
}
```

### 1.3 Field Mapping

| Web App Field | Mobile App Field | Action | Notes |
|--------------|------------------|--------|-------|
| `users.name` | `display_name` | Map | Primary display name |
| `users.role` | `roles[]` | Map | Convert to array: `[role]` |
| `users.phoneNumber` | `phone_number` | Map | Same field, different naming |
| `users.avatarUrl` | `photo_url` | Map | Same field, different naming |
| `users.employeeId` | `employee_id` | Map | Same field, different naming |
| `users.department` | `department` | Preserve | Already exists |
| `users.managerId` | `managerId` | Add | New field in mobile schema |
| `users.designation` | `designation` | Add | New field in mobile schema |
| `users.hireDate` | `hireDate` | Add | New field in mobile schema |
| `users.isActive` | `isActive` | Add | New field in mobile schema |
| `users.createdAt` | `created_time` | Map | Same field, different naming |
| `users.updatedAt` | `updatedAt` | Add | New field in mobile schema |
| `users.lastLoginAt` | `last_active` | Map | Same field, different naming |
| `employees.firstName` | `firstName` | Add | For backward compatibility |
| `employees.lastName` | `lastName` | Add | For backward compatibility |
| `employees.fullName` | `full_name` | Map | Combine firstName + lastName |
| `employees.dateOfBirth` | `dob` | Map | Same field, different naming |
| `employees.address` | `address` | Add | New field in mobile schema |
| `employees.salary` | `salary_package` | Map | Transform structure |
| `employees.leaveBalance` | `leave_balance` | Map | Transform structure |

### 1.4 Migration Steps

1. **Create migration script** to:
   - Merge `users` and `employees` collections into unified `users` collection
   - Map field names (camelCase → snake_case where needed)
   - Transform nested structures (salary, leaveBalance)
   - Preserve all mobile app fields
   - Add web app specific fields

2. **Data transformation logic:**
   ```typescript
   // Pseudo-code
   for each employee in employees collection:
     userDoc = get user document (userId)
     mergedDoc = {
       ...userDoc,  // Preserve existing mobile fields
       display_name: userDoc.display_name || employee.name,
       full_name: employee.firstName + " " + employee.lastName,
       phone_number: userDoc.phone_number || employee.phoneNumber,
       employee_id: userDoc.employee_id || employee.employeeId,
       department: userDoc.department || employee.department,
       managerId: employee.managerId,
       designation: employee.designation,
       hireDate: employee.joinDate,
       isActive: employee.isActive,
       address: employee.address,
       dob: employee.dateOfBirth,
       salary_package: transformSalary(employee.salary),
       leave_balance: transformLeaveBalance(employee.leaveBalance),
       updatedAt: employee.updatedAt
     }
     update users collection with mergedDoc
   ```

3. **Deprecate `employees` collection:**
   - After migration, mark as deprecated
   - Update all queries to use `users` collection
   - Keep `employees` collection for 3 months for rollback

---

## 2. Attendance Collection Migration

### 2.1 Current State Analysis

**Mobile App Schema (`attendance`):**
```typescript
{
  user_id: DocumentReference,    // ✅ Reference to users/{uid}
  checkin_time?: Timestamp,      // Check-in timestamp
  checkout_time?: Timestamp,     // Check-out timestamp
  checkin_location?: GeoPoint,    // GPS at check-in
  checkout_location?: GeoPoint,   // GPS at check-out
  date: string,                  // ✅ YYYY-MM-DD or Timestamp
  work_duration_minutes?: number, // Auto-calculated
  status?: string                // present, absent, leave, half-day
}
```

**Web App Schema (`attendance`):**
```typescript
{
  employeeId: string,            // ✅ Employee email (not reference)
  date: string,                  // ✅ YYYY-MM-DD
  status: "present" | "absent" | "half-day" | "holiday" | "leave" | "weekend",
  checkIn?: {
    timestamp: Timestamp,
    location?: { latitude: number, longitude: number },
    method: "manual" | "gps" | "qr" | "system"
  },
  checkOut?: {
    timestamp: Timestamp,
    location?: { latitude: number, longitude: number },
    method: "manual" | "gps" | "qr" | "system"
  },
  lunchBreak?: {
    start: Timestamp,
    end?: Timestamp,
    duration?: number  // hours (decimal)
  },
  totalHours?: number,           // hours (decimal) - excludes lunch break
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 2.2 Migration Strategy

**Target Unified Schema (`attendance` collection):**
```typescript
{
  // Mobile App Base Fields (PRESERVE)
  user_id: DocumentReference,    // ✅ Required - Reference to users/{uid}
  date: string,                  // ✅ Required - YYYY-MM-DD
  checkin_time?: Timestamp,      // Maps from checkIn.timestamp
  checkout_time?: Timestamp,     // Maps from checkOut.timestamp
  checkin_location?: GeoPoint,   // Maps from checkIn.location
  checkout_location?: GeoPoint,  // Maps from checkOut.location
  work_duration_minutes?: number, // Maps from totalHours (convert to minutes)
  status?: string,               // ✅ Preserved (present, absent, leave, half-day)
  
  // Web App Additional Fields (ADD)
  employeeId?: string,           // ✅ Add - Keep for backward compatibility (email)
  checkIn?: {                    // ✅ Add - Detailed check-in info
    timestamp: Timestamp,
    location?: { latitude: number, longitude: number },
    method: "manual" | "gps" | "qr" | "system"
  },
  checkOut?: {                   // ✅ Add - Detailed check-out info
    timestamp: Timestamp,
    location?: { latitude: number, longitude: number },
    method: "manual" | "gps" | "qr" | "system"
  },
  lunchBreak?: {                 // ✅ Add - Web app feature
    start: Timestamp,
    end?: Timestamp,
    duration?: number  // hours (decimal)
  },
  totalHours?: number,           // ✅ Add - Web app calculation
  createdAt?: Timestamp,         // ✅ Add - Web app metadata
  updatedAt?: Timestamp          // ✅ Add - Web app metadata
}
```

### 2.3 Field Mapping

| Web App Field | Mobile App Field | Action | Notes |
|--------------|------------------|--------|-------|
| `employeeId` (email) | `user_id` (ref) | Transform | Convert email to DocumentReference |
| `checkIn.timestamp` | `checkin_time` | Map | Same field, different structure |
| `checkOut.timestamp` | `checkout_time` | Map | Same field, different structure |
| `checkIn.location` | `checkin_location` | Map | Convert object to GeoPoint |
| `checkOut.location` | `checkout_location` | Map | Convert object to GeoPoint |
| `totalHours` | `work_duration_minutes` | Map | Convert hours to minutes: `totalHours * 60` |
| `status` | `status` | Preserve | Same field |
| `date` | `date` | Preserve | Same field |
| `lunchBreak` | N/A | Add | New web app feature |
| `checkIn.method` | N/A | Add | New web app field |
| `checkOut.method` | N/A | Add | New web app field |
| `createdAt` | N/A | Add | New web app field |
| `updatedAt` | N/A | Add | New web app field |

### 2.4 Migration Steps

1. **Create migration script** to:
   - Convert `employeeId` (email string) to `user_id` (DocumentReference)
   - Map `checkIn.timestamp` → `checkin_time`
   - Map `checkOut.timestamp` → `checkout_time`
   - Convert location objects to GeoPoint
   - Calculate `work_duration_minutes` from `totalHours`
   - Preserve all web app fields for backward compatibility

2. **Document ID strategy:**
   - Mobile: Uses `{user_id}_{date}` format
   - Web: Uses `{employeeId}_{date}` format
   - Unified: Use `{uid}_{date}` format (where uid is from user_id reference)

3. **Data transformation logic:**
   ```typescript
   // Pseudo-code
   for each attendance record:
     // Get user document by email
     userDoc = get user by email (employeeId)
     if (!userDoc) continue
     
     // Convert location to GeoPoint
     checkinGeoPoint = null
     if (record.checkIn?.location):
       checkinGeoPoint = new GeoPoint(
         record.checkIn.location.latitude,
         record.checkIn.location.longitude
       )
     
     checkoutGeoPoint = null
     if (record.checkOut?.location):
       checkoutGeoPoint = new GeoPoint(
         record.checkOut.location.latitude,
         record.checkOut.location.longitude
       )
     
     // Calculate work_duration_minutes
     workDurationMinutes = null
     if (record.totalHours):
       workDurationMinutes = record.totalHours * 60
     
     // Create unified document
     unifiedDoc = {
       user_id: doc(db, 'users', userDoc.uid),  // DocumentReference
       date: record.date,
       checkin_time: record.checkIn?.timestamp,
       checkout_time: record.checkOut?.timestamp,
       checkin_location: checkinGeoPoint,
       checkout_location: checkoutGeoPoint,
       work_duration_minutes: workDurationMinutes,
       status: record.status,
       // Preserve web app fields
       employeeId: record.employeeId,  // For backward compatibility
       checkIn: record.checkIn,
       checkOut: record.checkOut,
       lunchBreak: record.lunchBreak,
       totalHours: record.totalHours,
       createdAt: record.createdAt,
       updatedAt: record.updatedAt
     }
     
     // Save with unified document ID
     docId = `${userDoc.uid}_${record.date}`
     setDoc(doc(db, 'attendance', docId), unifiedDoc)
   ```

---

## 3. Leave Collection Migration

### 3.1 Current State Analysis

**Mobile App Schema (`leave`):**
```typescript
{
  user_id: DocumentReference,    // ✅ Reference to users/{uid}
  start_date: DateTime,          // ✅ Start date (YYYY-MM-DD or Timestamp)
  end_date: DateTime,            // ✅ End date (YYYY-MM-DD or Timestamp)
  reason: string,                // ✅ Required
  leave_type: string,            // ✅ "Sick Leave", "Casual Leave"
  status: string,                 // ✅ "pending", "approved", "rejected"
  created_at: DateTime,          // ✅ Required
  updated_at: DateTime,          // ✅ Required
  days_count?: number,           // Auto-calculated
  approved_by?: DocumentReference, // Reference to users/{uid}
  comments?: string              // Admin remarks
}
```

**Web App Schema (`leaveRequests`):**
```typescript
{
  id?: string,
  employeeId: string,            // Employee email (not reference)
  type: "Casual" | "Sick" | "Privilege",
  reason?: string,
  from: string,                  // YYYY-MM-DD
  to: string,                    // YYYY-MM-DD
  status: "Pending" | "Approved" | "Rejected",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 3.2 Migration Strategy

**Target Unified Schema (`leave` collection):**
```typescript
{
  // Mobile App Base Fields (PRESERVE)
  user_id: DocumentReference,    // ✅ Required - Reference to users/{uid}
  start_date: DateTime,          // ✅ Required - Maps from 'from'
  end_date: DateTime,            // ✅ Required - Maps from 'to'
  reason: string,                // ✅ Required
  leave_type: string,            // ✅ Required - Maps from 'type'
  status: string,                // ✅ Required - "pending", "approved", "rejected"
  created_at: DateTime,          // ✅ Required
  updated_at: DateTime,          // ✅ Required
  days_count?: number,           // Auto-calculated
  approved_by?: DocumentReference, // Reference to users/{uid}
  comments?: string,            // Admin remarks
  
  // Web App Additional Fields (ADD)
  employeeId?: string,          // ✅ Add - Keep for backward compatibility (email)
  type?: string,                // ✅ Add - Keep for backward compatibility
  from?: string,                // ✅ Add - Keep for backward compatibility
  to?: string,                  // ✅ Add - Keep for backward compatibility
  createdAt?: Timestamp,        // ✅ Add - Keep for backward compatibility
  updatedAt?: Timestamp         // ✅ Add - Keep for backward compatibility
}
```

### 3.3 Field Mapping

| Web App Field | Mobile App Field | Action | Notes |
|--------------|------------------|--------|-------|
| `employeeId` (email) | `user_id` (ref) | Transform | Convert email to DocumentReference |
| `from` | `start_date` | Map | Convert string to DateTime/Timestamp |
| `to` | `end_date` | Map | Convert string to DateTime/Timestamp |
| `type` | `leave_type` | Map | Map values: "Casual" → "Casual Leave", "Sick" → "Sick Leave", "Privilege" → "Privilege Leave" |
| `reason` | `reason` | Preserve | Same field |
| `status` | `status` | Map | Map case: "Pending" → "pending", "Approved" → "approved", "Rejected" → "rejected" |
| `createdAt` | `created_at` | Map | Same field, different naming |
| `updatedAt` | `updated_at` | Map | Same field, different naming |
| N/A | `days_count` | Calculate | Auto-calculate from start_date to end_date |
| N/A | `approved_by` | Add | Set when status changes to "approved" |
| N/A | `comments` | Add | For admin remarks |

### 3.4 Migration Steps

1. **Create migration script** to:
   - Convert `employeeId` (email) to `user_id` (DocumentReference)
   - Map `from` → `start_date` (convert to Timestamp)
   - Map `to` → `end_date` (convert to Timestamp)
   - Map `type` → `leave_type` (with value transformation)
   - Map `status` (case normalization)
   - Calculate `days_count`
   - Preserve web app fields for backward compatibility

2. **Data transformation logic:**
   ```typescript
   // Pseudo-code
   for each leaveRequest:
     // Get user document by email
     userDoc = get user by email (employeeId)
     if (!userDoc) continue
     
     // Convert dates
     startDate = new Date(leaveRequest.from + 'T00:00:00')
     endDate = new Date(leaveRequest.to + 'T23:59:59')
     
     // Calculate days_count
     daysCount = calculateDays(startDate, endDate)
     
     // Map leave type
     leaveTypeMap = {
       "Casual": "Casual Leave",
       "Sick": "Sick Leave",
       "Privilege": "Privilege Leave"
     }
     leaveType = leaveTypeMap[leaveRequest.type] || leaveRequest.type
     
     // Map status (normalize case)
     statusMap = {
       "Pending": "pending",
       "Approved": "approved",
       "Rejected": "rejected"
     }
     status = statusMap[leaveRequest.status] || leaveRequest.status.toLowerCase()
     
     // Create unified document
     unifiedDoc = {
       user_id: doc(db, 'users', userDoc.uid),
       start_date: Timestamp.fromDate(startDate),
       end_date: Timestamp.fromDate(endDate),
       reason: leaveRequest.reason || "",
       leave_type: leaveType,
       status: status,
       created_at: leaveRequest.createdAt,
       updated_at: leaveRequest.updatedAt,
       days_count: daysCount,
       // Preserve web app fields
       employeeId: leaveRequest.employeeId,
       type: leaveRequest.type,
       from: leaveRequest.from,
       to: leaveRequest.to,
       createdAt: leaveRequest.createdAt,
       updatedAt: leaveRequest.updatedAt
     }
     
     // Save document
     setDoc(doc(db, 'leave', leaveRequest.id), unifiedDoc)
   ```

---

## 4. Leave Balance Collection Migration

### 4.1 Current State Analysis

**Mobile App Schema (`leave_balance`):**
```typescript
{
  user_id: DocumentReference,    // ✅ Reference to users/{uid}
  year: number,                  // ✅ Required - Financial/calendar year
  sick_leave?: number,           // Remaining sick leave days
  casual_leave?: number,         // Remaining casual/paid leave days
  medical_leave?: number,        // Remaining medical/extra paid days
  earned_leave?: number,         // Remaining earned/privileged leave days
  total_leave?: number,          // Total allocated leave for year
  used_leave?: number,           // Total leave days used
  carry_forward?: number,        // Days carried from previous year
  pending_applied?: number,      // Days applied but not approved
  updated_at: DateTime,          // ✅ Required
  created_at: DateTime,          // ✅ Required
  notes?: string                 // Admin notes
}
```

**Web App Schema (nested in `employees`):**
```typescript
{
  leaveBalance?: {
    casual: number,
    sick: number,
    privilege: number
  }
}
```

### 4.2 Migration Strategy

**Target Unified Schema (`leave_balance` collection):**
```typescript
{
  // Mobile App Base Fields (PRESERVE)
  user_id: DocumentReference,    // ✅ Required - Reference to users/{uid}
  year: number,                  // ✅ Required - Current year
  sick_leave?: number,           // ✅ Preserved
  casual_leave?: number,         // ✅ Preserved
  medical_leave?: number,        // ✅ Preserved
  earned_leave?: number,         // Maps from privilege
  total_leave?: number,          // ✅ Preserved
  used_leave?: number,          // ✅ Preserved
  carry_forward?: number,        // ✅ Preserved
  pending_applied?: number,      // ✅ Preserved
  updated_at: DateTime,          // ✅ Required
  created_at: DateTime,          // ✅ Required
  notes?: string                 // ✅ Preserved
}
```

### 4.3 Field Mapping

| Web App Field | Mobile App Field | Action | Notes |
|--------------|------------------|--------|-------|
| `employees.leaveBalance.casual` | `casual_leave` | Map | Same field |
| `employees.leaveBalance.sick` | `sick_leave` | Map | Same field |
| `employees.leaveBalance.privilege` | `earned_leave` | Map | Web uses "privilege", mobile uses "earned_leave" |
| N/A | `medical_leave` | Preserve | Mobile app field |
| N/A | `total_leave` | Calculate | Sum of all leave types |
| N/A | `used_leave` | Calculate | From approved leave requests |
| N/A | `pending_applied` | Calculate | From pending leave requests |

### 4.4 Migration Steps

1. **Create migration script** to:
   - Extract leave balance from `employees` collection
   - Create `leave_balance` documents for each employee
   - Calculate `total_leave`, `used_leave`, `pending_applied`
   - Map `privilege` → `earned_leave`

2. **Data transformation logic:**
   ```typescript
   // Pseudo-code
   currentYear = new Date().getFullYear()
   
   for each employee:
     if (!employee.leaveBalance) continue
     
     userDoc = get user by userId
     if (!userDoc) continue
     
     // Calculate used leave from approved requests
     approvedLeaves = get approved leave requests for employee
     usedLeave = sum days_count from approvedLeaves
     
     // Calculate pending leave
     pendingLeaves = get pending leave requests for employee
     pendingApplied = sum days_count from pendingLeaves
     
     // Calculate total leave
     totalLeave = 
       (employee.leaveBalance.casual || 0) +
       (employee.leaveBalance.sick || 0) +
       (employee.leaveBalance.privilege || 0)
     
     // Create leave_balance document
     leaveBalanceDoc = {
       user_id: doc(db, 'users', userDoc.uid),
       year: currentYear,
       sick_leave: employee.leaveBalance.sick || 0,
       casual_leave: employee.leaveBalance.casual || 0,
       earned_leave: employee.leaveBalance.privilege || 0,
       total_leave: totalLeave,
       used_leave: usedLeave,
       pending_applied: pendingApplied,
       created_at: serverTimestamp(),
       updated_at: serverTimestamp()
     }
     
     // Document ID: {user_id}_{year}
     docId = `${userDoc.uid}_${currentYear}`
     setDoc(doc(db, 'leave_balance', docId), leaveBalanceDoc)
   ```

---

## 5. Timesheet Collection Migration

### 5.1 Current State Analysis

**Mobile App Schema (`Timesheet`):**
```typescript
{
  user_id: DocumentReference,    // ✅ Reference to users/{uid}
  taskdate: DateTime,            // ✅ Required - Calendar date
  start_time?: DateTime,         // Start timestamp
  end_time?: DateTime,           // End timestamp
  duration_hours: number,        // ✅ Required - Calculated hours
  activity: string,              // ✅ Required - Task title
  description?: string,          // Detailed description
  project_id?: DocumentReference, // Reference to projects/{id}
  tags?: string[],               // Labels/categories
  status: string,                // ✅ Required - draft/submitted/approved/rejected
  overtime_hours?: number,       // Extra hours beyond scheduled
  break_minutes?: number,        // Total break minutes
  is_billable?: boolean,         // Billable to client
  created_at: DateTime,          // ✅ Required
  updated_at: DateTime,          // ✅ Required
  approved_by?: DocumentReference, // Reference to users/{uid}
  notes?: string                 // Manager comments
}
```

**Web App Schema:**
- ❌ **Web app does NOT have a timesheet collection**
- Web app uses `attendance` collection for time tracking
- Web app has `projects` collection but no timesheet linking

### 5.2 Migration Strategy

**Target Unified Schema (`Timesheet` collection):**
```typescript
{
  // Mobile App Base Fields (PRESERVE - ALL FIELDS)
  user_id: DocumentReference,    // ✅ Required
  taskdate: DateTime,            // ✅ Required
  start_time?: DateTime,         // ✅ Preserved
  end_time?: DateTime,           // ✅ Preserved
  duration_hours: number,        // ✅ Required
  activity: string,              // ✅ Required
  description?: string,          // ✅ Preserved
  project_id?: DocumentReference, // ✅ Preserved
  tags?: string[],               // ✅ Preserved
  status: string,                // ✅ Required
  overtime_hours?: number,       // ✅ Preserved
  break_minutes?: number,        // ✅ Preserved
  is_billable?: boolean,         // ✅ Preserved
  created_at: DateTime,          // ✅ Required
  updated_at: DateTime,          // ✅ Required
  approved_by?: DocumentReference, // ✅ Preserved
  notes?: string                 // ✅ Preserved
  
  // Web App Integration (ADD - OPTIONAL)
  attendance_id?: string,        // ✅ Add - Link to attendance record (optional)
  linked_from_attendance?: boolean // ✅ Add - Flag if created from attendance
}
```

### 5.3 Migration Steps

1. **No migration needed** - Mobile app schema is complete
2. **Web app integration:**
   - Web app can optionally create timesheet entries from attendance records
   - Add optional fields to link timesheet to attendance if needed

---

## 6. Salary Package Collection Migration

### 6.1 Current State Analysis

**Mobile App Schema (`salarypackage`):**
```typescript
{
  user_id: DocumentReference,    // ✅ Reference to users/{uid}
  yearly_salary: number,         // ✅ Required - Total CTC
  monthly_salary: number,        // ✅ Required - Monthly base
  basic_salary?: number,         // Basic component
  hra?: number,                  // House Rent Allowance
  special_allowance?: number,    // Additional allowance
  bonus?: number,                // Annual bonus
  pf_number?: string,            // PF account number
  pf_employee?: number,          // Employee PF contribution
  pf_employer?: number,          // Employer PF contribution
  esi_employee?: number,         // Employee ESI contribution
  esi_employer?: number,         // Employer ESI contribution
  tax_deduction?: number,        // Monthly TDS/tax
  lop_rate_per_day?: number,     // Salary deduction per day (unpaid leave)
  created_at: DateTime,          // ✅ Required
  updated_at: DateTime,          // ✅ Required
  notes?: string                 // HR/Finance notes
}
```

**Web App Schema (nested in `employees`):**
```typescript
{
  salary?: {
    basic: number,
    allowances: number,
    deductions: number
  }
}
```

### 6.2 Migration Strategy

**Target Unified Schema (`salarypackage` collection):**
```typescript
{
  // Mobile App Base Fields (PRESERVE - ALL FIELDS)
  user_id: DocumentReference,    // ✅ Required
  yearly_salary: number,         // ✅ Required - Calculate from monthly
  monthly_salary: number,        // ✅ Required - Calculate from basic + allowances
  basic_salary?: number,         // Maps from salary.basic
  hra?: number,                  // ✅ Preserved
  special_allowance?: number,    // Maps from salary.allowances
  bonus?: number,                // ✅ Preserved
  pf_number?: string,            // ✅ Preserved
  pf_employee?: number,          // ✅ Preserved
  pf_employer?: number,          // ✅ Preserved
  esi_employee?: number,         // ✅ Preserved
  esi_employer?: number,         // ✅ Preserved
  tax_deduction?: number,        // Maps from salary.deductions
  lop_rate_per_day?: number,     // ✅ Preserved
  created_at: DateTime,          // ✅ Required
  updated_at: DateTime,          // ✅ Required
  notes?: string                 // ✅ Preserved
}
```

### 6.3 Field Mapping

| Web App Field | Mobile App Field | Action | Notes |
|--------------|------------------|--------|-------|
| `employees.salary.basic` | `basic_salary` | Map | Same field |
| `employees.salary.allowances` | `special_allowance` | Map | Web uses "allowances", mobile uses "special_allowance" |
| `employees.salary.deductions` | `tax_deduction` | Map | Web uses "deductions", mobile uses "tax_deduction" |
| N/A | `yearly_salary` | Calculate | `monthly_salary * 12` |
| N/A | `monthly_salary` | Calculate | `basic_salary + special_allowance` |

### 6.4 Migration Steps

1. **Create migration script** to:
   - Extract salary from `employees` collection
   - Create `salarypackage` documents
   - Calculate `yearly_salary` and `monthly_salary`
   - Map web app fields to mobile app fields

2. **Data transformation logic:**
   ```typescript
   // Pseudo-code
   for each employee:
     if (!employee.salary) continue
     
     userDoc = get user by userId
     if (!userDoc) continue
     
     basicSalary = employee.salary.basic || 0
     allowances = employee.salary.allowances || 0
     deductions = employee.salary.deductions || 0
     
     monthlySalary = basicSalary + allowances
     yearlySalary = monthlySalary * 12
     
     // Create salarypackage document
     salaryPackageDoc = {
       user_id: doc(db, 'users', userDoc.uid),
       yearly_salary: yearlySalary,
       monthly_salary: monthlySalary,
       basic_salary: basicSalary,
       special_allowance: allowances,
       tax_deduction: deductions,
       created_at: serverTimestamp(),
       updated_at: serverTimestamp()
     }
     
     // Document ID: {user_id} (one per user)
     setDoc(doc(db, 'salarypackage', userDoc.uid), salaryPackageDoc)
   ```

---

## 7. Payslip Collection Migration

### 7.1 Current State Analysis

**Mobile App Schema (`payslip`):**
```typescript
{
  user_id: DocumentReference,    // ✅ Reference to users/{uid}
  payslip_id: string,           // ✅ Required - Unique identifier
  month: number,                 // ✅ Required - Month (1-12)
  year: number,                  // ✅ Required - Year
  title?: string,                // Short title/label
  gross_salary: number,          // ✅ Required - Total gross earnings
  total_deductions: number,      // ✅ Required - Sum of deductions
  net_salary: number,            // ✅ Required - Amount payable
  components?: object,           // Detailed salary breakup
  deduction_breakup?: object,    // Detailed deductions
  lop_days?: number,             // Unpaid leave days
  lop_amount?: number,           // Deduction for LOP
  is_generated: boolean,         // ✅ Required - PDF generated flag
  url?: string,                  // Storage path/URL
  generated_by?: DocumentReference, // Reference to users/{uid}
  created_at: DateTime,          // ✅ Required
  updated_at: DateTime,          // ✅ Required
  notes?: string                 // HR/Finance notes
}
```

**Web App Schema (`payslips`):**
```typescript
{
  id: string,
  employeeId: string,            // Employee document ID (not reference)
  employeeEmail?: string,         // Employee email
  month: string,                 // YYYY-MM format
  year: number,
  monthName: string,              // "January 2025"
  basic: number,
  allowances: number,
  deductions: number,
  overtime: number,
  bonus?: number,
  grossSalary: number,
  netPay: number,
  workingDays: number,
  presentDays: number,
  absentDays: number,
  leaveDays: number,
  overtimeHours: number,
  status: 'draft' | 'generated' | 'approved' | 'paid',
  generatedAt: Timestamp,
  generatedBy?: string,           // Admin user ID
  notes?: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  fileUrl?: string,               // Download URL
  filePath?: string,               // Storage path
  uploadedAt?: Timestamp,
  isUploaded?: boolean
}
```

### 7.2 Migration Strategy

**Target Unified Schema (`payslip` collection):**
```typescript
{
  // Mobile App Base Fields (PRESERVE)
  user_id: DocumentReference,    // ✅ Required - Reference to users/{uid}
  payslip_id: string,           // ✅ Required - Maps from id
  month: number,                 // ✅ Required - Extract from YYYY-MM
  year: number,                  // ✅ Required
  title?: string,                // Maps from monthName
  gross_salary: number,          // ✅ Required - Maps from grossSalary
  total_deductions: number,      // ✅ Required - Maps from deductions
  net_salary: number,            // ✅ Required - Maps from netPay
  components?: object,           // Maps from { basic, allowances, overtime, bonus }
  deduction_breakup?: object,    // Maps from { deductions, overtime deductions }
  lop_days?: number,             // Maps from absentDays (if applicable)
  lop_amount?: number,           // Calculate from lop_days
  is_generated: boolean,         // ✅ Required - Maps from status !== 'draft'
  url?: string,                  // Maps from fileUrl or filePath
  generated_by?: DocumentReference, // Maps from generatedBy
  created_at: DateTime,          // ✅ Required - Maps from createdAt
  updated_at: DateTime,          // ✅ Required - Maps from updatedAt
  notes?: string                 // ✅ Preserved
  
  // Web App Additional Fields (ADD)
  employeeId?: string,           // ✅ Add - Keep for backward compatibility
  employeeEmail?: string,        // ✅ Add - Keep for backward compatibility
  monthName?: string,            // ✅ Add - Keep for backward compatibility
  basic?: number,                // ✅ Add - Keep for backward compatibility
  allowances?: number,           // ✅ Add - Keep for backward compatibility
  overtime?: number,             // ✅ Add - Keep for backward compatibility
  bonus?: number,                // ✅ Add - Keep for backward compatibility
  grossSalary?: number,          // ✅ Add - Keep for backward compatibility
  netPay?: number,               // ✅ Add - Keep for backward compatibility
  workingDays?: number,          // ✅ Add - Web app field
  presentDays?: number,          // ✅ Add - Web app field
  absentDays?: number,           // ✅ Add - Web app field
  leaveDays?: number,            // ✅ Add - Web app field
  overtimeHours?: number,        // ✅ Add - Web app field
  status?: string,               // ✅ Add - Web app field
  generatedAt?: Timestamp,       // ✅ Add - Web app field
  fileUrl?: string,              // ✅ Add - Web app field
  filePath?: string,             // ✅ Add - Web app field
  uploadedAt?: Timestamp,        // ✅ Add - Web app field
  isUploaded?: boolean,          // ✅ Add - Web app field
  createdAt?: Timestamp,         // ✅ Add - Keep for backward compatibility
  updatedAt?: Timestamp          // ✅ Add - Keep for backward compatibility
}
```

### 7.3 Field Mapping

| Web App Field | Mobile App Field | Action | Notes |
|--------------|------------------|--------|-------|
| `employeeId` (doc ID) | `user_id` (ref) | Transform | Convert employee doc ID to user DocumentReference |
| `id` | `payslip_id` | Map | Same field, different naming |
| `month` (YYYY-MM) | `month` (1-12) | Transform | Extract month number from YYYY-MM |
| `year` | `year` | Preserve | Same field |
| `monthName` | `title` | Map | Same field, different naming |
| `grossSalary` | `gross_salary` | Map | Same field, different naming |
| `deductions` | `total_deductions` | Map | Same field, different naming |
| `netPay` | `net_salary` | Map | Same field, different naming |
| `{basic, allowances, overtime, bonus}` | `components` | Transform | Create object structure |
| `deductions` | `deduction_breakup` | Transform | Create object structure |
| `absentDays` | `lop_days` | Map | Same concept |
| `fileUrl` or `filePath` | `url` | Map | Same field, different naming |
| `generatedBy` (string) | `generated_by` (ref) | Transform | Convert to DocumentReference |
| `status !== 'draft'` | `is_generated` | Transform | Boolean conversion |
| `createdAt` | `created_at` | Map | Same field, different naming |
| `updatedAt` | `updated_at` | Map | Same field, different naming |

### 7.4 Migration Steps

1. **Create migration script** to:
   - Convert `employeeId` to `user_id` (DocumentReference)
   - Extract month number from YYYY-MM format
   - Transform salary components to `components` object
   - Transform deductions to `deduction_breakup` object
   - Convert `generatedBy` to DocumentReference
   - Calculate `lop_amount` from `lop_days`
   - Preserve all web app fields for backward compatibility

2. **Data transformation logic:**
   ```typescript
   // Pseudo-code
   for each payslip:
     // Get user document
     employeeDoc = get employee by employeeId
     if (!employeeDoc) continue
     
     userDoc = get user by userId (employeeDoc.userId)
     if (!userDoc) continue
     
     // Extract month number
     [yearStr, monthStr] = payslip.month.split('-')
     month = parseInt(monthStr)
     year = parseInt(yearStr)
     
     // Create components object
     components = {
       basic: payslip.basic,
       allowances: payslip.allowances,
       overtime: payslip.overtime,
       bonus: payslip.bonus || 0
     }
     
     // Create deduction_breakup object
     deductionBreakup = {
       deductions: payslip.deductions,
       overtime_deductions: 0  // Calculate if needed
     }
     
     // Calculate lop_amount (if applicable)
     lopAmount = 0
     if (payslip.absentDays > 0):
       // Get salary package for lop_rate_per_day
       salaryPackage = get salarypackage for user
       if (salaryPackage?.lop_rate_per_day):
         lopAmount = payslip.absentDays * salaryPackage.lop_rate_per_day
     
     // Convert generatedBy to reference
     generatedByRef = null
     if (payslip.generatedBy):
       generatedByRef = doc(db, 'users', payslip.generatedBy)
     
     // Determine is_generated
     isGenerated = payslip.status !== 'draft'
     
     // Get URL
     url = payslip.fileUrl || payslip.filePath || null
     
     // Create unified document
     unifiedDoc = {
       user_id: doc(db, 'users', userDoc.uid),
       payslip_id: payslip.id,
       month: month,
       year: year,
       title: payslip.monthName,
       gross_salary: payslip.grossSalary,
       total_deductions: payslip.deductions,
       net_salary: payslip.netPay,
       components: components,
       deduction_breakup: deductionBreakup,
       lop_days: payslip.absentDays || 0,
       lop_amount: lopAmount,
       is_generated: isGenerated,
       url: url,
       generated_by: generatedByRef,
       created_at: payslip.createdAt,
       updated_at: payslip.updatedAt,
       notes: payslip.notes,
       // Preserve web app fields
       employeeId: payslip.employeeId,
       employeeEmail: payslip.employeeEmail,
       monthName: payslip.monthName,
       basic: payslip.basic,
       allowances: payslip.allowances,
       overtime: payslip.overtime,
       bonus: payslip.bonus,
       grossSalary: payslip.grossSalary,
       netPay: payslip.netPay,
       workingDays: payslip.workingDays,
       presentDays: payslip.presentDays,
       absentDays: payslip.absentDays,
       leaveDays: payslip.leaveDays,
       overtimeHours: payslip.overtimeHours,
       status: payslip.status,
       generatedAt: payslip.generatedAt,
       fileUrl: payslip.fileUrl,
       filePath: payslip.filePath,
       uploadedAt: payslip.uploadedAt,
       isUploaded: payslip.isUploaded,
       createdAt: payslip.createdAt,
       updatedAt: payslip.updatedAt
     }
     
     // Save document
     setDoc(doc(db, 'payslip', payslip.id), unifiedDoc)
   ```

---

## 8. Projects Collection Migration

### 8.1 Current State Analysis

**Mobile App Schema:**
- ❌ **Mobile app does NOT have a projects collection**
- Mobile app has `project_id` field in Timesheet collection

**Web App Schema (`projects`):**
```typescript
{
  id: string,
  name: string,
  description?: string,
  startDate?: string,            // YYYY-MM-DD
  endDate?: string,              // YYYY-MM-DD
  status: "planned" | "active" | "on-hold" | "completed" | "cancelled",
  employeeIds: string[],          // Array of employee document IDs
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 8.2 Migration Strategy

**Target Unified Schema (`projects` collection):**
```typescript
{
  // Web App Base Fields (PRESERVE - ALL FIELDS)
  id: string,                    // ✅ Document ID
  name: string,                  // ✅ Required
  description?: string,          // ✅ Preserved
  startDate?: string,            // ✅ Preserved - YYYY-MM-DD
  endDate?: string,              // ✅ Preserved - YYYY-MM-DD
  status: string,                // ✅ Required
  employeeIds: string[],          // ✅ Preserved - Array of user document IDs
  createdAt: Timestamp,          // ✅ Required
  updatedAt: Timestamp,         // ✅ Required
  
  // Mobile App Integration (ADD - OPTIONAL)
  user_ids?: DocumentReference[], // ✅ Add - Array of DocumentReferences (for mobile compatibility)
  project_id?: string            // ✅ Add - Alias for id (for mobile compatibility)
}
```

### 8.3 Migration Steps

1. **No major migration needed** - Web app schema is complete
2. **Add mobile app compatibility:**
   - Add `user_ids` as DocumentReference array (convert from employeeIds)
   - Add `project_id` as alias for `id`

---

## 9. Implementation Plan

### Phase 1: Schema Analysis & Documentation (Week 1)
- ✅ Complete schema comparison (this document)
- Create field mapping tables
- Document data transformation rules
- Identify potential data conflicts

### Phase 2: Migration Scripts Development (Week 2-3)
- Develop migration scripts for each collection
- Create data validation scripts
- Build rollback procedures
- Test on staging environment

### Phase 3: Data Migration Execution (Week 4)
- Backup all existing data
- Run migration scripts in batches
- Validate migrated data
- Fix any data inconsistencies

### Phase 4: Code Updates (Week 5-6)
- Update web app services to use unified schema
- Update queries to use DocumentReferences where needed
- Update field names (camelCase → snake_case where needed)
- Update all UI components to use new field names

### Phase 5: Testing & Validation (Week 7)
- Test web app functionality
- Test mobile app compatibility
- Validate data integrity
- Performance testing

### Phase 6: Deployment (Week 8)
- Deploy to production
- Monitor for issues
- Rollback plan ready
- Documentation update

---

## 10. Migration Scripts Structure

### 10.1 Script Organization
```
migrations/
├── 001_users_migration.ts
├── 002_attendance_migration.ts
├── 003_leave_migration.ts
├── 004_leave_balance_migration.ts
├── 005_salary_package_migration.ts
├── 006_payslip_migration.ts
├── 007_projects_migration.ts
├── utils/
│   ├── field_mappers.ts
│   ├── validators.ts
│   └── helpers.ts
└── README.md
```

### 10.2 Script Template
```typescript
// Example: 001_users_migration.ts
import { db } from '@/lib/firebase/config';
import { collection, doc, getDocs, setDoc, updateDoc, query } from 'firebase/firestore';

export async function migrateUsers() {
  console.log('Starting users collection migration...');
  
  // 1. Get all users
  const usersRef = collection(db, 'users');
  const usersSnap = await getDocs(usersRef);
  
  // 2. Get all employees
  const employeesRef = collection(db, 'employees');
  const employeesSnap = await getDocs(employeesRef);
  
  // 3. Create employee lookup map
  const employeeMap = new Map();
  employeesSnap.forEach(doc => {
    const data = doc.data();
    employeeMap.set(data.userId, { id: doc.id, ...data });
  });
  
  // 4. Migrate each user
  let migrated = 0;
  let errors = 0;
  
  for (const userDoc of usersSnap.docs) {
    try {
      const userData = userDoc.data();
      const employeeData = employeeMap.get(userDoc.id);
      
      // Merge and transform data
      const mergedData = {
        // Preserve mobile app fields
        ...userData,
        
        // Map web app fields
        display_name: userData.display_name || userData.name,
        full_name: employeeData ? 
          `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim() : 
          userData.full_name,
        phone_number: userData.phone_number || employeeData?.phoneNumber,
        employee_id: userData.employee_id || employeeData?.employeeId,
        department: userData.department || employeeData?.department,
        
        // Add web app fields
        managerId: employeeData?.managerId,
        designation: employeeData?.designation,
        hireDate: employeeData?.joinDate,
        isActive: employeeData?.isActive ?? true,
        address: employeeData?.address,
        dob: employeeData?.dateOfBirth || userData.dob,
        
        // Transform salary
        salary_package: employeeData?.salary ? {
          basic_salary: employeeData.salary.basic,
          special_allowance: employeeData.salary.allowances,
          tax_deduction: employeeData.salary.deductions,
          monthly_salary: (employeeData.salary.basic || 0) + (employeeData.salary.allowances || 0),
          yearly_salary: ((employeeData.salary.basic || 0) + (employeeData.salary.allowances || 0)) * 12
        } : userData.salary_package,
        
        // Transform leave balance
        leave_balance: employeeData?.leaveBalance ? {
          casual_leave: employeeData.leaveBalance.casual || 0,
          sick_leave: employeeData.leaveBalance.sick || 0,
          earned_leave: employeeData.leaveBalance.privilege || 0
        } : userData.leave_balance,
        
        // Map roles
        roles: userData.roles || (userData.role ? [userData.role] : ['employee']),
        
        // Map timestamps
        created_time: userData.created_time || userData.createdAt,
        updatedAt: userData.updatedAt || serverTimestamp(),
        last_active: userData.last_active || userData.lastLoginAt
      };
      
      // Update user document
      await updateDoc(doc(db, 'users', userDoc.id), mergedData);
      migrated++;
      
      if (migrated % 100 === 0) {
        console.log(`Migrated ${migrated} users...`);
      }
    } catch (error) {
      console.error(`Error migrating user ${userDoc.id}:`, error);
      errors++;
    }
  }
  
  console.log(`Users migration complete: ${migrated} migrated, ${errors} errors`);
  return { migrated, errors };
}
```

---

## 11. Code Updates Required

### 11.1 Service Layer Updates

**File: `lib/firebase/services/employees.ts`**
- Update to use `users` collection instead of `employees`
- Update field names (camelCase → snake_case)
- Update queries to use DocumentReferences

**File: `lib/firebase/services/attendance.ts`**
- Update to use `user_id` (DocumentReference) instead of `employeeId` (string)
- Add support for both `checkin_time`/`checkout_time` and `checkIn`/`checkOut`
- Maintain backward compatibility

**File: `lib/firebase/services/leaves.ts`**
- Update to use `user_id` (DocumentReference) instead of `employeeId` (string)
- Update field names (`from`/`to` → `start_date`/`end_date`)
- Update status values (case normalization)

**File: `lib/firebase/services/payslips.ts`**
- Update to use `user_id` (DocumentReference) instead of `employeeId` (string)
- Update field names (camelCase → snake_case)
- Add support for mobile app fields

### 11.2 Hook Updates

**File: `lib/firebase/hooks/useEmployees.ts`**
- Update to query `users` collection
- Update field name mappings

**File: `lib/firebase/hooks/useAttendance.ts`**
- Update to use DocumentReferences
- Add backward compatibility for string employeeId

**File: `lib/firebase/hooks/useLeaves.ts`**
- Update field names and references

### 11.3 UI Component Updates

- Update all components to use new field names
- Update employee lookups to use `users` collection
- Update attendance displays to handle both schemas during transition

---

## 12. Backward Compatibility Strategy

### 12.1 Dual Schema Support (Transition Period)

During migration, support both schemas:

```typescript
// Example: Get employee name
function getEmployeeName(userDoc: any): string {
  // Try mobile app field first
  if (userDoc.display_name) return userDoc.display_name;
  // Fallback to web app field
  if (userDoc.name) return userDoc.name;
  // Fallback to full name
  if (userDoc.full_name) return userDoc.full_name;
  return 'Unknown';
}
```

### 12.2 Gradual Migration

1. **Phase 1:** Add mobile app fields to existing documents (additive)
2. **Phase 2:** Update code to read from mobile app fields
3. **Phase 3:** Remove web app specific fields (after validation)

---

## 13. Risk Mitigation

### 13.1 Data Loss Prevention
- ✅ Full backup before migration
- ✅ Test on staging environment first
- ✅ Migrate in batches
- ✅ Validate each batch before proceeding

### 13.2 Rollback Plan
- Keep original collections for 3 months
- Maintain mapping tables for reverse migration
- Version control for migration scripts

### 13.3 Testing Strategy
- Unit tests for field mappers
- Integration tests for migration scripts
- End-to-end tests for both apps
- Data validation tests

---

## 14. Checklist

### Pre-Migration
- [ ] Complete schema analysis
- [ ] Create migration scripts
- [ ] Test on staging environment
- [ ] Backup production data
- [ ] Document rollback procedure

### Migration Execution
- [ ] Run users migration
- [ ] Run attendance migration
- [ ] Run leave migration
- [ ] Run leave_balance migration
- [ ] Run salary_package migration
- [ ] Run payslip migration
- [ ] Run projects migration
- [ ] Validate all migrated data

### Post-Migration
- [ ] Update web app code
- [ ] Test web app functionality
- [ ] Test mobile app compatibility
- [ ] Update documentation
- [ ] Monitor for issues
- [ ] Plan deprecation of old collections

---

## 15. Estimated Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| Phase 1 | 1 week | Schema analysis & documentation |
| Phase 2 | 2 weeks | Migration scripts development |
| Phase 3 | 1 week | Data migration execution |
| Phase 4 | 2 weeks | Code updates |
| Phase 5 | 1 week | Testing & validation |
| Phase 6 | 1 week | Deployment & monitoring |
| **Total** | **8 weeks** | Complete migration |

---

## 16. Next Steps

1. **Review this plan** with the team
2. **Approve migration approach**
3. **Set up staging environment**
4. **Begin Phase 1** (Schema Analysis)
5. **Develop migration scripts**
6. **Execute migration**

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Author:** AI Assistant  
**Status:** Draft - Pending Review

