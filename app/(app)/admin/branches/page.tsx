"use client";

import { AppLayout } from "@/components/app-layout";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Loader2, ToggleLeft, ToggleRight } from "lucide-react";

interface Branch {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export default function BranchesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "" });

  useEffect(() => {
    // Guard: admin only
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      supabase.from("profiles").select("role").eq("id", data.user.id).single()
        .then(({ data: p }) => {
          if (!["admin", "super_admin"].includes(p?.role)) router.push("/dashboard");
        });
    });

    fetch("/api/branches")
      .then((r) => r.json())
      .then((data) => { setBranches(data); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    setBranches((prev) => [...prev, data]);
    setForm({ name: "", code: "" });
    setShowForm(false);
    setSaving(false);
  };

  const handleToggle = async (branch: Branch) => {
    const res = await fetch("/api/branches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: branch.id, is_active: !branch.is_active }),
    });
    if (res.ok) {
      setBranches((prev) =>
        prev.map((b) => b.id === branch.id ? { ...b, is_active: !b.is_active } : b)
      );
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">
              Branches
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Manage your service centre locations
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Add branch
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Add branch form */}
        {showForm && (
          <div className="card">
            <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50 mb-4">
              New branch
            </h2>
            <form onSubmit={handleCreate} className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-40">
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  Branch name
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ras Al Khaimah"
                  className="w-full"
                />
              </div>
              <div className="w-32">
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  Code
                </label>
                <input
                  required
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="RAK"
                  maxLength={6}
                  className="w-full"
                />
              </div>
              <div className="flex items-end gap-2">
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : "Create"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Branch list */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
          ) : branches.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No branches yet. Add one above.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-5 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Name</th>
                  <th className="px-5 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Code</th>
                  <th className="px-5 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-5 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {branches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-3 font-medium text-slate-950 dark:text-slate-50">
                      {b.name}
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded bg-slate-100 px-2 py-1 font-mono text-xs dark:bg-slate-800">
                        {b.code}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`badge ${b.is_active ? "badge-success" : "bg-slate-100 text-slate-600"}`}>
                        {b.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleToggle(b)}
                        className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                      >
                        {b.is_active ? (
                          <><ToggleRight size={18} className="text-green-600" /> Deactivate</>
                        ) : (
                          <><ToggleLeft size={18} /> Activate</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
