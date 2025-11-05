"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRequireRole, useUpdateEmail } from "@/lib/firebase/hooks/useAuth";
import { useEmployeeByUserId, useEmployeeByEmail } from "@/lib/firebase/hooks/useEmployees";
import { db, storage } from "@/lib/firebase/config";
import { doc, setDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateEmployee } from "@/lib/firebase/services/employees";
import { getCurrentUser as getLocalUser } from "@/lib/auth";

export default function EmployeeProfilePage() {
  const { user, userProfile, loading } = useRequireRole("employee", "/");
  const { employee: employeeById } = useEmployeeByUserId(user?.uid);
  const [localUser, setLocalUser] = useState<any>(null);
  // Local auth fallback
  useEffect(() => {
    setLocalUser(getLocalUser());
  }, []);
  const effectiveEmail = userProfile?.email || user?.email || localUser?.email || undefined;
  const { employee: employeeByEmail } = useEmployeeByEmail(effectiveEmail);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { mutate: updateEmail, isLoading: isUpdatingEmail } = useUpdateEmail();

  const emp = employeeById || employeeByEmail || null;

  const initial = useMemo(() => ({
    name: userProfile?.name || emp?.name || localUser?.name || "",
    email: userProfile?.email || effectiveEmail || "",
    phone: userProfile?.phoneNumber || "",
    department: userProfile?.department || emp?.department || "",
    designation: userProfile?.designation || emp?.designation || "",
    managerId: userProfile?.managerId || emp?.managerId || "",
    avatarUrl: userProfile?.avatarUrl || "",
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

      // Update user profile document
      const userDocRef = doc(db, "users", user.uid);
      const userUpdates: any = {
        name: form.name,
        phoneNumber: form.phone,
        department: form.department,
        designation: form.designation,
        avatarUrl: avatarUrl ?? null,
        updatedAt: new Date(),
      };
      await setDoc(userDocRef, userUpdates, { merge: true });

      // Update email via Auth if changed
      if (form.email && form.email !== userProfile?.email) {
        await updateEmail({ newEmail: form.email });
      }

      // Update employee document
      if (employee?.id) {
        await updateEmployee(employee.id, {
          name: form.name,
          email: form.email?.toLowerCase(),
          department: form.department,
          designation: form.designation,
          managerId: form.managerId || undefined,
        });
      }

      setMessage("Profile saved successfully.");
    } catch (err: any) {
      setError(err?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const employment = useMemo(() => ({
    employeeId: userProfile?.employeeId || emp?.employeeId || "",
    role: userProfile?.role || "employee",
    joinDate: emp?.joinDate || userProfile?.hireDate || "",
  }), [userProfile, emp]);

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

      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader title="Personal Information" />
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
                  <label className="mb-1 block text-xs font-medium text-slate-600">Full Name</label>
                  <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} disabled={saving || loading} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
                  <input type="email" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} disabled={saving || loading || isUpdatingEmail} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
                  <input type="password" className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm shadow-sm" value="********" readOnly />
                  <div className="mt-1 text-[10px] text-slate-500">For security, passwords can’t be shown. Use Update Password below.</div>
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
          <CardHeader title="Employment Details" />
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Employee ID</label>
                  <input readOnly className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm shadow-sm" value={employment.employeeId} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Role</label>
                  <input readOnly className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm shadow-sm" value={employment.role} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Join Date</label>
                  <input readOnly className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm shadow-sm" value={employment.joinDate} />
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


