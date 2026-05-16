"use client";

import { AppLayout } from "@/components/app-layout";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Profile, UserRole, UserStatus } from "@/types/database";
import { Check, X, Trash2 } from "lucide-react";

export default function AdminUsersPage() {
  const supabase = createClient();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Profile>>({});

  useEffect(() => {
    const loadData = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }

      // Check if user is super_admin
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (currentProfile?.role !== "super_admin") {
        router.push("/dashboard");
        return;
      }

      setCurrentUser(currentProfile as Profile);

      // Load all users
      const { data: allUsers } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      setUsers((allUsers || []) as Profile[]);
      setLoading(false);
    };

    loadData();
  }, [supabase, router]);

  const handleApprove = async (userId: string) => {
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year subscription

    const { error } = await supabase
      .from("profiles")
      .update({
        status: "active" as UserStatus,
        role: "crm_agent" as UserRole,
        subscription_expires_at: expiryDate.toISOString(),
        approved_at: new Date().toISOString(),
        approved_by: currentUser?.id,
      })
      .eq("id", userId);

    if (error) {
      alert("Error approving user: " + error.message);
      return;
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              status: "active",
              role: "crm_agent",
              subscription_expires_at: expiryDate.toISOString(),
              approved_at: new Date().toISOString(),
              approved_by: currentUser?.id,
            }
          : u
      )
    );
  };

  const handleReject = async (userId: string) => {
    const { error } = await supabase.from("profiles").delete().eq("id", userId);

    if (error) {
      alert("Error rejecting user: " + error.message);
      return;
    }

    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleUpdateUser = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update(editData)
      .eq("id", userId);

    if (error) {
      alert("Error updating user: " + error.message);
      return;
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, ...editData } : u
      )
    );
    setEditingId(null);
    setEditData({});
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="text-slate-600 dark:text-slate-400">Loading...</div>
      </AppLayout>
    );
  }

  const pendingUsers = users.filter((u) => u.status === "pending");
  const activeUsers = users.filter((u) => u.status === "active");

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-950 dark:text-slate-50">
            User Management
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Approve pending users, manage roles, and set subscription dates
          </p>
        </div>

        {/* Pending Users */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
            Pending approval ({pendingUsers.length})
          </h2>

          {pendingUsers.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              No pending users
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-700"
                >
                  <div className="flex-1">
                    <p className="font-medium text-slate-950 dark:text-slate-50">
                      {user.full_name || "Unnamed"}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {user.email}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Created{" "}
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(user.id)}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Check size={16} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(user.id)}
                      className="btn btn-danger flex items-center gap-2"
                    >
                      <X size={16} />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Users */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
            Active users ({activeUsers.length})
          </h2>

          {activeUsers.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              No active users
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      Role
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      Expires
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                    >
                      <td className="py-3 px-4">
                        {user.full_name || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {user.email}
                      </td>
                      <td className="py-3 px-4">
                        {editingId === user.id ? (
                          <select
                            value={editData.role || user.role}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                role: e.target.value as UserRole,
                              })
                            }
                            className="text-sm"
                          >
                            <option value="crm_agent">CRM Agent</option>
                            <option value="advisor">Advisor</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        ) : (
                          <span className="inline-block rounded px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                            {user.role}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {editingId === user.id ? (
                          <input
                            type="date"
                            value={
                              editData.subscription_expires_at?.slice(0, 10) ||
                              user.subscription_expires_at?.slice(0, 10) ||
                              ""
                            }
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                subscription_expires_at: new Date(
                                  e.target.value
                                ).toISOString(),
                              })
                            }
                            className="text-sm"
                          />
                        ) : (
                          user.subscription_expires_at
                            ? new Date(
                                user.subscription_expires_at
                              ).toLocaleDateString()
                            : "—"
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {editingId === user.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateUser(user.id)}
                              className="text-xs font-medium text-green-600 hover:text-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditData({});
                              }}
                              className="text-xs font-medium text-slate-600 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingId(user.id);
                              setEditData({});
                            }}
                            className="text-xs font-medium text-brand-600 hover:text-brand-700"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
