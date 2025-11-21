# Schema Migration Quick Reference Guide

## Field Name Mappings

### Users Collection

| Web App Field | Mobile App Field | Type |
|--------------|------------------|------|
| `name` | `display_name` | string |
| `role` | `roles[]` | array |
| `phoneNumber` | `phone_number` | string |
| `avatarUrl` | `photo_url` | string |
| `employeeId` | `employee_id` | string |
| `createdAt` | `created_time` | Timestamp |
| `lastLoginAt` | `last_active` | Timestamp |
| `firstName + lastName` | `full_name` | string |
| `dateOfBirth` | `dob` | string/Timestamp |
| `salary` | `salary_package` | object |
| `leaveBalance` | `leave_balance` | object |

### Attendance Collection

| Web App Field | Mobile App Field | Type |
|--------------|------------------|------|
| `employeeId` (email) | `user_id` (ref) | DocumentReference |
| `checkIn.timestamp` | `checkin_time` | Timestamp |
| `checkOut.timestamp` | `checkout_time` | Timestamp |
| `checkIn.location` | `checkin_location` | GeoPoint |
| `checkOut.location` | `checkout_location` | GeoPoint |
| `totalHours` | `work_duration_minutes` | number (convert: hours * 60) |
| `status` | `status` | string |

### Leave Collection

| Web App Field | Mobile App Field | Type |
|--------------|------------------|------|
| `employeeId` (email) | `user_id` (ref) | DocumentReference |
| `from` | `start_date` | DateTime |
| `to` | `end_date` | DateTime |
| `type` | `leave_type` | string (map values) |
| `status` | `status` | string (normalize case) |
| `createdAt` | `created_at` | Timestamp |
| `updatedAt` | `updated_at` | Timestamp |

### Leave Balance Collection

| Web App Field | Mobile App Field | Type |
|--------------|------------------|------|
| `leaveBalance.casual` | `casual_leave` | number |
| `leaveBalance.sick` | `sick_leave` | number |
| `leaveBalance.privilege` | `earned_leave` | number |

### Payslip Collection

| Web App Field | Mobile App Field | Type |
|--------------|------------------|------|
| `employeeId` (doc ID) | `user_id` (ref) | DocumentReference |
| `id` | `payslip_id` | string |
| `month` (YYYY-MM) | `month` (1-12) | number |
| `monthName` | `title` | string |
| `grossSalary` | `gross_salary` | number |
| `deductions` | `total_deductions` | number |
| `netPay` | `net_salary` | number |
| `fileUrl`/`filePath` | `url` | string |
| `createdAt` | `created_at` | Timestamp |
| `updatedAt` | `updated_at` | Timestamp |

## Value Transformations

### Leave Type Mapping
```typescript
"Casual" → "Casual Leave"
"Sick" → "Sick Leave"
"Privilege" → "Privilege Leave"
```

### Leave Status Mapping
```typescript
"Pending" → "pending"
"Approved" → "approved"
"Rejected" → "rejected"
```

### Time Conversions
```typescript
totalHours → work_duration_minutes: totalHours * 60
work_duration_minutes → totalHours: work_duration_minutes / 60
```

### Date Conversions
```typescript
"YYYY-MM-DD" string → Timestamp: new Date(dateString + 'T00:00:00')
"YYYY-MM" string → month number: parseInt(monthStr)
```

## Collection Structure Changes

### Before (Web App)
- `users` collection (basic user info)
- `employees` collection (detailed employee info)
- `attendance` collection (uses email as employeeId)
- `leaveRequests` collection (uses email as employeeId)
- `payslips` collection (uses employee doc ID)

### After (Unified)
- `users` collection (merged, uses mobile app schema as base)
- `attendance` collection (uses DocumentReference to users)
- `leave` collection (uses DocumentReference to users)
- `leave_balance` collection (separate collection, uses DocumentReference)
- `salarypackage` collection (separate collection, uses DocumentReference)
- `payslip` collection (uses DocumentReference to users)
- `Timesheet` collection (mobile app only, preserved)
- `projects` collection (web app only, preserved)

## Critical Migration Rules

1. **DocumentReferences**: Always convert email strings to DocumentReferences
2. **Field Naming**: Use snake_case for mobile app fields, preserve camelCase for web app compatibility
3. **Timestamps**: Use Firestore Timestamp type, not ISO strings
4. **GeoPoints**: Convert {latitude, longitude} objects to GeoPoint type
5. **Arrays**: Convert single values to arrays where needed (e.g., role → roles[])
6. **Preserve All Fields**: Keep both mobile and web app fields during transition

## Migration Order

1. **Users** (base collection)
2. **Attendance** (depends on users)
3. **Leave** (depends on users)
4. **Leave Balance** (depends on users and leave)
5. **Salary Package** (depends on users)
6. **Payslip** (depends on users and salary package)
7. **Projects** (independent)

