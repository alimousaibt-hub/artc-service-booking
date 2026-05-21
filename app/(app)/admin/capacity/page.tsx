"use client";

import { AppLayout } from "@/components/app-layout";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { formatDateDisplay } from "@/lib/booking-helpers";

interface Branch { id: string; name: string; code: string; }
interface Advisor { id: string; name: string; branch_id: string; daily_capacity: number; }
interface Override { id: string; advisor_id: string; date: string; capacity: number; reason: string | null; advisor?: { name: string; branch?: { code: string } | null } | null; }

export default function CapacityPage() {
  const router = useRouter();
  const supabase = createClient();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ advisor_id: "", date: "", capacity: "", reason: "" });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      supabase.from("profiles").select("role").eq("id", data.user.id).single()
        .then(({ data: p }) => { if (!["admin","super_admin"].includes(p?.role)) router.push("/dashboard"); });
    });
    fetch("/api/branches").then(r => r.json()).then((data: Branch[]) => {
      setBranches(data);
      if (data.length > 0) setSelectedBranch(data[0].id);
    });
    fetch("/api/capacity").then(r => r.json()).then((data: Override[]) => { setOverrides(data); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedBranch) return;
    fetch(`/api/advisors?branch_id=${selectedBranch}`)
      .then(r => r.json())
      .then((data: Advisor[]) => {
        setAdvisors(data);
        setForm(f => ({ ...f, advisor_id: data[0]?.id || "" }));
      });
  }, [selectedBranch]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await fetch("/api/capacity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, capacity: parseInt(form.capacity) }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    setOverrides(prev => {
      const filtered = prev.filter(o => !(o.advisor_id === data.advisor_id && o.date === data.date));
      return [...filtered, data].sort((a, b) => a.date.localeCompare(b.date));
    });
    setForm(f => ({ ...f, date: "", capacity: "", reason: "" }));
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/capacity?id=${id}`, { method: "DELETE" });
    if (res.ok) setOverrides(prev => prev.filter(o => o.id !== id));
  };

  const selectedAdvisor = advisors.find(a => a.id === form.advisor_id);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">Capacity Overrides</h1>
          <p className="text-sm text-slate-500 mt-1">
            Override an advisor&apos;s booking capacity for a specific date. Useful for holidays, training days, or special events.
          </p>
        </div>

        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{error}</div>}

        {/* Branch + advisor selector */}
        <div className="card">
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50 mb-4">Add override</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {branches.map(b => (
              <button key={b.id} onClick={() => setSelectedBranch(b.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedBranch === b.id ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}>
                {b.code}
              </button>
            ))}
          </div>

          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Advisor <span className="text-red-500">*</span></label>
              <select required value={form.advisor_id} onChange={e => setForm(f => ({ ...f, advisor_id: e.target.value }))} className="w-full">
                {advisors.map(a => (
                  <option key={a.id} value={a.id}>{a.name} (default: {a.daily_capacity}/day)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Date <span className="text-red-500">*</span></label>
              <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                Override capacity <span className="text-red-500">*</span>
                {selectedAdvisor && <span className="text-slate-400 ml-1">(default: {selectedAdvisor.daily_capacity})</span>}
              </label>
              <input type="number" required min="0" max="100" value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                placeholder="0" className="w-full" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Reason</label>
              <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Training day, reduced hours..." className="w-full" />
            </div>
            <div className="col-span-2">
              <button type="submit" disabled={saving} className="btn btn-primary flex items-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} /> Apply override</>}
              </button>
            </div>
          </form>
        </div>

        {/* Existing overrides */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-semibold text-slate-950 dark:text-slate-50">Active overrides</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
          ) : overrides.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No overrides yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-5 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Advisor</th>
                  <th className="px-5 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Date</th>
                  <th className="px-5 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Capacity</th>
                  <th className="px-5 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Reason</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {overrides.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-3 font-medium text-slate-950 dark:text-slate-50">
                      {o.advisor?.name}
                      {o.advisor?.branch && (
                        <span className="ml-2 text-xs font-mono text-slate-400">{o.advisor.branch.code}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{formatDateDisplay(o.date)}</td>
                    <td className="px-5 py-3 font-semibold text-brand-600 dark:text-brand-400">{o.capacity}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">{o.reason || "—"}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => handleDelete(o.id)} className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 size={13} />
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
