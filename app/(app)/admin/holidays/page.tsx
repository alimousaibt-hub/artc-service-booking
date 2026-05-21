"use client";

import { AppLayout } from "@/components/app-layout";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { formatDateDisplay } from "@/lib/booking-helpers";

interface Branch { id: string; name: string; code: string; }
interface Holiday {
  id: string; date: string; name: string; branch_id: string | null;
  branch?: { name: string; code: string } | null;
}

export default function HolidaysPage() {
  const router = useRouter();
  const supabase = createClient();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ date: "", name: "", branch_id: "" });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      supabase.from("profiles").select("role").eq("id", data.user.id).single()
        .then(({ data: p }) => { if (!["admin","super_admin"].includes(p?.role)) router.push("/dashboard"); });
    });

    fetch("/api/branches").then(r => r.json()).then((data: Branch[]) => setBranches(data));
    fetch("/api/holidays").then(r => r.json()).then((data: Holiday[]) => { setHolidays(data); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await fetch("/api/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, branch_id: form.branch_id || null }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    setHolidays(prev => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)));
    setForm(f => ({ ...f, date: "", name: "" }));
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this holiday?")) return;
    const res = await fetch(`/api/holidays?id=${id}`, { method: "DELETE" });
    if (res.ok) setHolidays(prev => prev.filter(h => h.id !== id));
  };

  const upcoming = holidays.filter(h => h.date >= new Date().toISOString().split("T")[0]);
  const past = holidays.filter(h => h.date < new Date().toISOString().split("T")[0]);

  const HolidayRow = ({ h }: { h: Holiday }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div>
        <p className="font-medium text-sm text-slate-950 dark:text-slate-50">{h.name}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {formatDateDisplay(h.date)}
          {h.branch
            ? <span className="ml-2 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{h.branch.code}</span>
            : <span className="ml-2 text-slate-400">All branches</span>}
        </p>
      </div>
      <button onClick={() => handleDelete(h.id)} className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
        <Trash2 size={14} />
      </button>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">Holidays & Days Off</h1>
          <p className="text-sm text-slate-500 mt-1">
            Specific dates blocked across all or per branch. These block the date picker in the booking form.
          </p>
        </div>

        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{error}</div>}

        {/* Add form */}
        <div className="card">
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50 mb-4">Add holiday / day off</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Date <span className="text-red-500">*</span></label>
              <input type="date" required value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Name <span className="text-red-500">*</span></label>
              <input required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Eid Al Fitr, National Day..." className="w-full" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Branch (leave blank for all)</label>
              <select value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))} className="w-full">
                <option value="">All branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-end">
              <button type="submit" disabled={saving} className="btn btn-primary w-full">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} /> Add holiday</>}
              </button>
            </div>
          </form>
        </div>

        {/* List */}
        {loading ? (
          <div className="card p-8 text-center text-slate-500">Loading...</div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="card">
                <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50 mb-2">
                  Upcoming ({upcoming.length})
                </h2>
                {upcoming.map(h => <HolidayRow key={h.id} h={h} />)}
              </div>
            )}
            {past.length > 0 && (
              <div className="card opacity-60">
                <h2 className="text-sm font-medium text-slate-500 mb-2">Past ({past.length})</h2>
                {past.slice(0, 10).map(h => <HolidayRow key={h.id} h={h} />)}
              </div>
            )}
            {holidays.length === 0 && (
              <div className="card p-8 text-center text-sm text-slate-500">No holidays added yet.</div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
