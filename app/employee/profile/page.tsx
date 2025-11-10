"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRequireRole, useUpdateEmail } from "@/lib/firebase/hooks/useAuth";
import { useEmployeeByUserId, useEmployeeByEmail } from "@/lib/firebase/hooks/useEmployees";
import { db, storage } from "@/lib/firebase/config";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateEmployee, getEmployee } from "@/lib/firebase/services/employees";
import { getCurrentUser as getLocalUser } from "@/lib/auth";

export default function EmployeeProfilePage() {
  const { user, userProfile, loading } = useRequireRole("employee", "/");
  const { employee: employeeById } = useEmployeeByUserId(user?.uid);
  const [localUser, setLocalUser] = useState<any>(null);
  const [employeeByDocId, setEmployeeByDocId] = useState<any>(null);
  const [loadingEmployee, setLoadingEmployee] = useState(false);
  
  // Local auth fallback
  useEffect(() => {
    setLocalUser(getLocalUser());
  }, []);
  
  const effectiveEmail = userProfile?.email || user?.email || localUser?.email || undefined;
  const { employee: employeeByEmail } = useEmployeeByEmail(effectiveEmail);
  
  // Also try to get employee by document ID (userId as doc ID)
  useEffect(() => {
    if (user?.uid && !employeeById && !employeeByEmail) {
      setLoadingEmployee(true);
      getEmployee(user.uid).then((emp) => {
        setEmployeeByDocId(emp);
        setLoadingEmployee(false);
      }).catch(() => {
        setLoadingEmployee(false);
      });
    }
  }, [user?.uid, employeeById, employeeByEmail]);
  
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { mutate: updateEmail, isLoading: isUpdatingEmail } = useUpdateEmail();

  const emp = employeeById || employeeByEmail || employeeByDocId || null;

  const initial = useMemo(() => ({
    name: userProfile?.name || emp?.name || localUser?.name || "",
    firstName: emp?.firstName || "",
    lastName: emp?.lastName || "",
    email: userProfile?.email || emp?.email || effectiveEmail || "",
    phone: userProfile?.phoneNumber || emp?.phone || "",
    department: emp?.department || userProfile?.department || "",
    designation: emp?.designation || userProfile?.designation || "",
    managerId: emp?.managerId || userProfile?.managerId || "",
    avatarUrl: userProfile?.avatarUrl || "",
    dateOfBirth: emp?.dateOfBirth || "",
    address: emp?.address || "",
  }), [userProfile, emp, localUser, effectiveEmail]);

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initial);
    setAvatarPreview(initial.avatarUrl || "");
  }, [initial]);

  const onPick = () => fileRef.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setAvatarFile(f);
    if (f) setAvatarPreview(URL.createObjectURL(f));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      // Upload avatar if changed
      let avatarUrl: string | undefined = form.avatarUrl || undefined;
      if (avatarFile) {
        const path = `avatars/${user.uid}`;
        const r = storageRef(storage, path);
        await uploadBytes(r, avatarFile);
        avatarUrl = await getDownloadURL(r);
      }

      // Construct full name from firstName and lastName if available, otherwise use name
      const fullName = (form.firstName && form.lastName) 
        ? `${form.firstName} ${form.lastName}`.trim()
        : form.name;

      // Update user profile document
      const userDocRef = doc(db, "users", user.uid);
      const userUpdates: any = {
        name: fullName || form.name,
        updatedAt: new Date(),
      };
      
      // Only include fields that have values (Firestore doesn't allow undefined)
      if (form.phone) {
        userUpdates.phoneNumber = form.phone;
      }
      if (form.department) {
        userUpdates.department = form.department;
      }
      if (form.designation) {
        userUpdates.designation = form.designation;
      }
      if (avatarUrl !== undefined) {
        userUpdates.avatarUrl = avatarUrl;
      }
      
      await setDoc(userDocRef, userUpdates, { merge: true });

      // Update email via Auth if changed
      if (form.email && form.email !== userProfile?.email) {
        await updateEmail({ newEmail: form.email });
      }

      // Update employee document - try by ID first, then by userId
      const employeeDocId = emp?.id || user?.uid;
      if (employeeDocId) {
        const employeeUpdates: any = {
          name: fullName || form.name,
          email: form.email?.toLowerCase(),
        };
        
        // Only include fields that have values (Firestore doesn't allow undefined)
        if (form.firstName) employeeUpdates.firstName = form.firstName;
        if (form.lastName) employeeUpdates.lastName = form.lastName;
        if (form.department) employeeUpdates.department = form.department;
        if (form.designation) employeeUpdates.designation = form.designation;
        if (form.managerId) employeeUpdates.managerId = form.managerId;
        if (form.dateOfBirth) employeeUpdates.dateOfBirth = form.dateOfBirth;
        if (form.address) employeeUpdates.address = form.address;
        
        try {
          await updateEmployee(employeeDocId, employeeUpdates);
        } catch (updateErr: any) {
          // If employee document doesn't exist, create it
          if (updateErr.message?.includes("not found") || updateErr.message?.includes("No document")) {
            const { createEmployee } = await import("@/lib/firebase/services/employees");
            const employeeId = emp?.employeeId || userProfile?.employeeId || `EMP-${user.uid.substring(0, 8).toUpperCase()}`;
            await createEmployee({
              userId: user.uid,
              employeeId: employeeId,
              name: fullName || form.name,
              firstName: form.firstName || undefined,
              lastName: form.lastName || undefined,
              email: form.email?.toLowerCase(),
              role: userProfile?.role || "employee",
              department: form.department || "",
              designation: form.designation || "",
              managerId: form.managerId || undefined,
              dateOfBirth: form.dateOfBirth || undefined,
              address: form.address || undefined,
              joinDate: emp?.joinDate || userProfile?.hireDate || new Date().toISOString().split('T')[0],
              isActive: true,
            } as any);
          } else {
            throw updateErr;
          }
        }
      }

      setMessage("Profile saved successfully.");
    } catch (err: any) {
      setError(err?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const employment = useMemo(() => ({
    employeeId: userProfile?.employeeId || emp?.employeeId || emp?.id || "",
    role: userProfile?.role || emp?.role || "employee",
    joinDate: emp?.joinDate || userProfile?.hireDate || "",
  }), [userProfile, emp]);

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return dateString;
    }
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return null;
    try {
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch {
      return null;
    }
  };

  const fullName = useMemo(() => {
    if (form.firstName && form.lastName) {
      return `${form.firstName} ${form.lastName}`.trim();
    }
    return form.name || "Not set";
  }, [form.firstName, form.lastName, form.name]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
          <p className="text-sm text-slate-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
        <p className="text-sm text-slate-600">Edit personal info, upload profile picture, and view assigned manager.</p>
      </div>

      {/* Profile Overview Section */}
      <Card>
        <CardHeader title="Profile Overview" />
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Personal Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Full Name:</span>
                    <span className="font-medium text-slate-900">{fullName}</span>
                  </div>
                  {form.firstName && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">First Name:</span>
                      <span className="font-medium text-slate-900">{form.firstName || "Not set"}</span>
                    </div>
                  )}
                  {form.lastName && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Last Name:</span>
                      <span className="font-medium text-slate-900">{form.lastName || "Not set"}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date of Birth:</span>
                    <span className="font-medium text-slate-900">
                      {form.dateOfBirth ? `${formatDate(form.dateOfBirth)} ${calculateAge(form.dateOfBirth) ? `(${calculateAge(form.dateOfBirth)} years)` : ""}` : "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="font-medium text-slate-900">{form.email || "Not set"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span className="font-medium text-slate-900">{form.phone || "Not set"}</span>
                  </div>
                  {form.address && (
                    <div className="flex justify-between items-start">
                      <span className="text-slate-500">Address:</span>
                      <span className="font-medium text-slate-900 text-right max-w-[60%]">{form.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Employment Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Employee ID:</span>
                    <span className="font-medium text-slate-900">{employment.employeeId || emp?.id || "Not set"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Role:</span>
                    <span className="font-medium text-slate-900 capitalize">{employment.role || "Not set"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Department:</span>
                    <span className="font-medium text-slate-900">{emp?.department || form.department || userProfile?.department || "Not set"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Designation:</span>
                    <span className="font-medium text-slate-900">{emp?.designation || form.designation || userProfile?.designation || "Not set"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Manager ID:</span>
                    <span className="font-medium text-slate-900">{emp?.managerId || form.managerId || userProfile?.managerId || "Not assigned"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Join Date:</span>
                    <span className="font-medium text-slate-900">{employment.joinDate ? formatDate(employment.joinDate) : (emp?.joinDate ? formatDate(emp.joinDate) : "Not set")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader title="Edit Personal Information" />
          <CardContent>
            <form onSubmit={save} className="space-y-3">
              {message ? (
                <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>
              ) : null}
              {error ? (
                <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              ) : null}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-slate-200 overflow-hidden">
                  {avatarPreview ? <img src={avatarPreview} alt="avatar" className="h-full w-full object-cover" /> : null}
                </div>
                <div>
                  <Button type="button" onClick={onPick} disabled={saving || loading}>Upload Photo</Button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">First Name</label>
                  <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} disabled={saving || loading} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Last Name</label>
                  <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} disabled={saving || loading} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Date of Birth</label>
                  <input type="date" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} disabled={saving || loading} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
                  <input type="email" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} disabled={saving || loading || isUpdatingEmail} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Phone</label>
                  <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} disabled={saving || loading} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Department</label>
                  <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} disabled={saving || loading} />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Address</label>
                <textarea 
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" 
                  rows={3}
                  value={form.address} 
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} 
                  disabled={saving || loading}
                  placeholder="Enter your address"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
                <input type="password" className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm shadow-sm" value="********" readOnly />
                <div className="mt-1 text-[10px] text-slate-500">For security, passwords can't be shown. Use Update Password below.</div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Designation</label>
                  <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} disabled={saving || loading} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Manager</label>
                  <input readOnly className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm shadow-sm" value={form.managerId} />
                </div>
              </div>

              <Button type="submit" disabled={saving || loading}>{saving ? "Saving..." : "Save Changes"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Additional Information" />
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Employee ID</label>
                  <input readOnly className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm shadow-sm" value={employment.employeeId || emp?.id || "Not set"} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Role</label>
                  <input readOnly className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm shadow-sm capitalize" value={employment.role || "Not set"} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Department</label>
                  <input readOnly className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm shadow-sm" value={emp?.department || form.department || userProfile?.department || "Not set"} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Designation</label>
                  <input readOnly className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm shadow-sm" value={emp?.designation || form.designation || userProfile?.designation || "Not set"} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Join Date</label>
                  <input readOnly className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm shadow-sm" value={employment.joinDate ? formatDate(employment.joinDate) : (emp?.joinDate ? formatDate(emp.joinDate) : "Not set")} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Security" />
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Password changed");
              }}
              className="space-y-3"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Current Password</label>
                <input type="password" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">New Password</label>
                  <input type="password" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Confirm Password</label>
                  <input type="password" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" />
                </div>
              </div>
              <Button type="submit" className="bg-slate-100 text-slate-800 hover:bg-slate-200">Update Password</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


