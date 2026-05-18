"use client";

import { AppLayout } from "@/components/app-layout";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Loader2, ToggleLeft, ToggleRight, X, Pencil, Trash2 } from "lucide-react";

interface Branch { id: string; name: string; code: string; }
interface UserOption { id: string; full_name: string | null; email: string; }
interface Advisor {
  id: string;
  branch_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  daily_capacity: number;
  is_active: boolean;
  profile_id: string | null;
  user?: UserOption | null;
}

export default function AdvisorsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null);
  const [editForm, setEditForm] = useState({ name: "", daily_capacity: "10", email: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ profile_id: "", name: "", email: "", phone: "", daily_capacity: "10" });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      supabase.from("profiles").select("role").eq("id", data.user.id).single()
        .then(({ data: p }) => {
          if (!["admin","super_admin"].includes(p?.role)) router.push("/dashboard");
        });
    });
    fetch("/api/branches").then(r => r.json()).then((data: Branch[]) => {
      setBranches(data);
      if (data.length > 0) setSelectedBranch(data[0].id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedBranch) return;
    setLoading(true);
    Promise.all([
      supabase
        .from("service_advisors")
        .select("*, user:profiles!service_advisors_profile_id_fkey(id,full_name,email)")
        .eq("branch_id", selectedBranch)
        .order("name"),
      // Users with advisor role not yet assigned to any advisor slot
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "advisor")
        .eq("status", "active"),
    ]).then(([{ data: advs }, { data: users }]) => {
      const linked = new Set((advs || []).filter(a => a.profile_id).map(a => a.profile_id));
      setAdvisors((advs || []) as Advisor[]);
      setAvailableUsers(((users || []) as UserOption[]).filter(u => !linked.has(u.id)));
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch]);

  const handleDelete = async (a: Advisor) => {
    if (!confirm(`Delete advisor "${a.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/advisors?id=${a.id}`, {
      method: "DELETE",
    });
    if (res.ok) setAdvisors(prev => prev.filter(x => x.id !== a.id));
    else { const d = await res.json(); setError(d.error); }
  };

  const startEdit = (a: Advisor) => {
    setEditingAdvisor(a);
    setEditForm({ name: a.name, daily_capacity: String(a.daily_capacity), email: a.email || "", phone: a.phone || "" });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdvisor) return;
    setSaving(true);
    const res = await fetch("/api/advisors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingAdvisor.id,
        name: editForm.name,
        daily_capacity: parseInt(editForm.daily_capacity) || 10,
        email: editForm.email || null,
        phone: editForm.phone || null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setAdvisors(prev => prev.map(x => x.id === editingAdvisor.id ? { ...x, ...data } : x));
      setEditingAdvisor(null);
    } else setError(data.error);
    setSaving(false);
  };

  const handleUserPick = (userId: string) => {
    const user = availableUsers.find(u => u.id === userId);
    if (user) {
      setForm(f => ({
        ...f,
        profile_id: userId,
        name: user.full_name || "",
        email: user.email,
      }));
    } else {
      setForm(f => ({ ...f, profile_id: "", name: "", email: "" }));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await fetch("/api/advisors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branch_id: selectedBranch,
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        daily_capacity: parseInt(form.daily_capacity) || 10,
        profile_id: form.profile_id || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    setAdvisors(prev => [...prev, data]);
    if (form.profile_id) setAvailableUsers(prev => prev.filter(u => u.id !== form.profile_id));
    setForm({ profile_id: "", name: "", email: "", phone: "", daily_capacity: "10" });
    setShowForm(false);
    setSaving(false);
  };

  const toggleActive = async (a: Advisor) => {
    const res = await fetch("/api/advisors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, is_active: !a.is_active }),
    });
    if (res.ok) setAdvisors(prev => prev.map(x => x.id === a.id ? { ...x, is_active: !x.is_active } : x));
  };

  const branchLabel = branches.find(b => b.id === selectedBranch);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">Service Advisors</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Advisors are unique per branch. Optionally link to a user account so they can log in and see their appointments.
            </p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
            <Plus size={16} /> Add advisor to {branchLabel?.code || "branch"}
          </button>
        </div>

        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{error}</div>}

        {/* Branch tabs */}
        <div className="flex flex-wrap gap-2">
          {branches.map(b => (
            <button key={b.id} onClick={() => setSelectedBranch(b.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedBranch === b.id
                  ? "bg-brand-600 text-white"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
              }`}>
              {b.name || b.code}
            </button>
          ))}
        </div>

        {/* Add advisor form */}
        {showForm && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">
                Add advisor to {branchLabel?.name}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Optional: pick from existing advisor-role users */}
                <div className="col-span-2">
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Link to user account <span className="text-slate-400">(optional — only users with Advisor role)</span>
                  </label>
                  <select
                    value={form.profile_id}
                    onChange={e => handleUserPick(e.target.value)}
                    className="w-full"
                  >
                    <option value="">No linked account (name-only advisor)</option>
                    {availableUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name || u.email} — {u.email}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Full name <span className="text-red-500">*</span>
                  </label>
                  <input required value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Omar Al-Hassan" className="w-full" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Daily capacity</label>
                  <input type="number" min="1" max="100" value={form.daily_capacity}
                    onChange={e => setForm(f => ({ ...f, daily_capacity: e.target.value }))}
                    className="w-full" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Email</label>
                  <input type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="advisor@company.ae" className="w-full" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Phone</label>
                  <input value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="971XXXXXXXXX" className="w-full" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : "Add advisor"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Advisor list */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
          ) : advisors.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No advisors for this branch. Add one above.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-5 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Name</th>
                  <th className="px-5 py-3 text-left font-medium text-slate-700 dark:text-slate-300">User account</th>
                  <th className="px-5 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Capacity/day</th>
                  <th className="px-5 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-5 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {advisors.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-3 font-medium text-slate-950 dark:text-slate-50">{a.name}</td>
                    <td className="px-5 py-3">
                      {a.user ? (
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          {a.user.full_name || a.user.email}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 font-medium">{a.daily_capacity}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${a.is_active ? "badge-success" : "bg-slate-100 text-slate-600"}`}>
                        {a.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <button onClick={() => startEdit(a)}
                          className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 dark:text-brand-400">
                          <Pencil size={13} /> Edit
                        </button>
                        <button onClick={() => toggleActive(a)}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
                          {a.is_active
                            ? <><ToggleRight size={15} className="text-green-600" /> Deactivate</>
                            : <><ToggleLeft size={15} /> Activate</>}
                        </button>
                        <button onClick={() => handleDelete(a)}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {/* Edit advisor modal */}
      {editingAdvisor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Edit advisor</h2>
              <button onClick={() => setEditingAdvisor(null)} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Full name <span className="text-red-500">*</span></label>
                  <input required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Daily capacity</label>
                  <input type="number" min="1" max="100" value={editForm.daily_capacity} onChange={e => setEditForm(f => ({ ...f, daily_capacity: e.target.value }))} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Phone</label>
                  <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="971XXXXXXXXX" className="w-full" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Email</label>
                  <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="w-full" />
                </div>
              </div>
              <div className="flex gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button type="button" onClick={() => setEditingAdvisor(null)} className="btn btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
