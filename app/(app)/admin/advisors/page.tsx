"use client";

import { AppLayout } from "@/components/app-layout";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Loader2, ToggleLeft, ToggleRight } from "lucide-react";

interface Branch { id: string; name: string; code: string; }
interface Advisor {
  id: string;
  branch_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  daily_capacity: number;
  is_active: boolean;
  created_at: string;
}

export default function AdvisorsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", daily_capacity: "10", branch_id: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Advisor>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      supabase.from("profiles").select("role").eq("id", data.user.id).single()
        .then(({ data: p }) => {
          if (!["admin", "super_admin"].includes(p?.role)) router.push("/dashboard");
        });
    });

    fetch("/api/branches")
      .then((r) => r.json())
      .then((data: Branch[]) => {
        setBranches(data);
        if (data.length > 0) {
          setSelectedBranch(data[0].id);
          setForm((f) => ({ ...f, branch_id: data[0].id }));
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load advisors when branch filter changes
  useEffect(() => {
    if (!selectedBranch) return;
    setLoading(true);
    fetch(`/api/advisors?branch_id=${selectedBranch}`)
      .then((r) => r.json())
      .then((data) => { setAdvisors(data); setLoading(false); });
  }, [selectedBranch]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await fetch("/api/advisors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        daily_capacity: parseInt(form.daily_capacity) || 10,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    setAdvisors((prev) => [...prev, data]);
    setForm({ name: "", email: "", phone: "", daily_capacity: "10", branch_id: selectedBranch });
    setShowForm(false);
    setSaving(false);
  };

  const handleUpdate = async (id: string) => {
    const res = await fetch("/api/advisors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...editData }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAdvisors((prev) => prev.map((a) => a.id === id ? updated : a));
      setEditingId(null); setEditData({});
    }
  };

  const handleToggle = async (advisor: Advisor) => {
    const res = await fetch("/api/advisors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: advisor.id, is_active: !advisor.is_active }),
    });
    if (res.ok) {
      setAdvisors((prev) =>
        prev.map((a) => a.id === advisor.id ? { ...a, is_active: !a.is_active } : a)
      );
    }
  };

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name || "—";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">
              Service Advisors
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Manage advisors and their daily capacity
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Add advisor
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Branch filter */}
        <div className="flex gap-2">
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBranch(b.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedBranch === b.id
                  ? "bg-brand-600 text-white"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>

        {/* Add form */}
        {showForm && (
          <div className="card">
            <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50 mb-4">
              New advisor
            </h2>
            <form onSubmit={handleCreate}>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Branch
                  </label>
                  <select
                    value={form.branch_id}
                    onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
                    className="w-full"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Full name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="John Smith"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="advisor@company.ae"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Phone
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="971XXXXXXXXX"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Daily capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={form.daily_capacity}
                    onChange={(e) => setForm((f) => ({ ...f, daily_capacity: e.target.value }))}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : "Create advisor"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Advisor list */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
          ) : advisors.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No advisors for this branch yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-5 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Name</th>
                  <th className="px-5 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Branch</th>
                  <th className="px-5 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Email</th>
                  <th className="px-5 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Capacity/day</th>
                  <th className="px-5 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-5 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {advisors.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-3 font-medium text-slate-950 dark:text-slate-50">
                      {editingId === a.id ? (
                        <input
                          value={editData.name ?? a.name}
                          onChange={(e) => setEditData((d) => ({ ...d, name: e.target.value }))}
                          className="w-full text-sm"
                        />
                      ) : a.name}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {branchName(a.branch_id)}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {editingId === a.id ? (
                        <input
                          type="email"
                          value={editData.email ?? (a.email || "")}
                          onChange={(e) => setEditData((d) => ({ ...d, email: e.target.value }))}
                          className="w-full text-sm"
                        />
                      ) : (a.email || "—")}
                    </td>
                    <td className="px-5 py-3">
                      {editingId === a.id ? (
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={editData.daily_capacity ?? a.daily_capacity}
                          onChange={(e) => setEditData((d) => ({ ...d, daily_capacity: parseInt(e.target.value) }))}
                          className="w-20 text-sm"
                        />
                      ) : (
                        <span className="font-medium">{a.daily_capacity}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`badge ${a.is_active ? "badge-success" : "bg-slate-100 text-slate-600"}`}>
                        {a.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {editingId === a.id ? (
                          <>
                            <button
                              onClick={() => handleUpdate(a.id)}
                              className="text-xs font-medium text-green-600 hover:text-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setEditingId(null); setEditData({}); }}
                              className="text-xs text-slate-500 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setEditingId(a.id); setEditData({}); }}
                              className="text-xs font-medium text-brand-600 hover:text-brand-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggle(a)}
                              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            >
                              {a.is_active
                                ? <><ToggleRight size={15} className="text-green-600" /> Deactivate</>
                                : <><ToggleLeft size={15} /> Activate</>
                              }
                            </button>
                          </>
                        )}
                      </div>
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
