"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, type StaffMember } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Trash2, Users, Shield, X } from "lucide-react";

export default function StaffPage() {
  const { appUser, addStaffMember, getStaffMembers, deleteStaffMember } = useAuth();
  const router = useRouter();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = appUser?.role === "admin";

  // Redirect non-admins
  useEffect(() => {
    if (appUser && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [appUser, isAdmin, router]);

  const fetchStaff = useCallback(async () => {
    try {
      const members = await getStaffMembers();
      setStaff(members);
    } catch {
      // Firestore index may not exist yet
    } finally {
      setLoadingStaff(false);
    }
  }, [getStaffMembers]);

  useEffect(() => {
    if (isAdmin) fetchStaff();
  }, [isAdmin, fetchStaff]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await addStaffMember(email, password, name);
      setShowModal(false);
      setName("");
      setEmail("");
      setPassword("");
      await fetchStaff();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add staff member";
      setError(msg.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "").trim());
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this staff member? They will no longer be able to access the dashboard.")) return;
    setDeletingId(id);
    try {
      await deleteStaffMember(id);
      setStaff((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-accent" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Staff Management</h1>
          <p className="mt-1 text-sm text-text-muted">
            Add and manage staff members who can access the system.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-btn px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-btn-hover"
        >
          <UserPlus className="h-4 w-4" />
          Add Staff
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-surface-border bg-surface-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Shield className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-text-primary">1</p>
              <p className="text-xs text-text-muted">Admin</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-text-primary">{staff.length}</p>
              <p className="text-xs text-text-muted">Staff Members</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-text-primary">{staff.length + 1}</p>
              <p className="text-xs text-text-muted">Total Users</p>
            </div>
          </div>
        </div>
      </div>

      {/* Staff List */}
      <div className="rounded-xl border border-surface-border bg-surface-card">
        <div className="border-b border-surface-border px-5 py-4">
          <h2 className="text-sm font-semibold text-text-primary">Staff Members</h2>
        </div>

        {loadingStaff ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-surface-border border-t-accent" />
          </div>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="mb-3 h-10 w-10 text-text-muted/40" />
            <p className="text-sm font-medium text-text-secondary">No staff members yet</p>
            <p className="mt-1 text-xs text-text-muted">
              Click &quot;Add Staff&quot; to create credentials for a team member.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {staff.map((member) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-bg text-xs font-semibold text-text-secondary">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{member.name}</p>
                    <p className="text-xs text-text-muted">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600 capitalize">
                    {member.role}
                  </span>
                  <span className="text-xs text-text-muted">
                    {member.createdAt.toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDelete(member.id)}
                    disabled={deletingId === member.id}
                    className="rounded p-1.5 text-text-muted hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Remove staff member"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModal(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-xl bg-surface-card border border-surface-border shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
                <h3 className="text-base font-semibold text-text-primary">Add Staff Member</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded p-1 text-text-muted hover:bg-surface-bg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="p-5 space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-surface-border bg-white px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-accent placeholder:text-text-muted"
                    placeholder="Staff member's name"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-surface-border bg-white px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-accent placeholder:text-text-muted"
                    placeholder="staff@restaurant.com"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-1.5">
                    Password
                  </label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-surface-border bg-white px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-accent placeholder:text-text-muted"
                    placeholder="Set initial password (min 6 chars)"
                    minLength={6}
                  />
                  <p className="mt-1 text-[11px] text-text-muted">
                    Share these credentials with the staff member so they can sign in.
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 rounded-lg border border-surface-border bg-white py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-bg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-lg bg-btn py-2.5 text-sm font-medium text-white transition-colors hover:bg-btn-hover disabled:opacity-50"
                  >
                    {submitting ? "Creating..." : "Create Staff Account"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
