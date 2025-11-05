"use client";
import { useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function EmployeeProfilePage() {
  const [avatar, setAvatar] = useState<string>("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({ name: "John Doe", email: "john@company.com", phone: "", department: "Engineering", manager: "Priya Singh" });

  const onPick = () => fileRef.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setAvatar(URL.createObjectURL(f));
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Profile saved");
  };

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
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-slate-200 overflow-hidden">
                  {avatar ? <img src={avatar} alt="avatar" className="h-full w-full object-cover" /> : null}
                </div>
                <div>
                  <Button type="button" onClick={onPick}>Upload Photo</Button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Full Name</label>
                  <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
                  <input type="email" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Phone</label>
                  <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Department</label>
                  <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Manager</label>
                <input readOnly className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm shadow-sm" value={form.manager} />
              </div>

              <Button type="submit">Save Changes</Button>
            </form>
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


