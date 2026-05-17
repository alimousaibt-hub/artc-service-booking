"use client";

import { AppLayout } from "@/components/app-layout";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Loader2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Save } from "lucide-react";

const DOW_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DOW_FULL   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

interface DayCapacity { day_of_week: number; capacity: number; }

interface Branch {
  id: string; name: string; code: string;
  is_active: boolean; closed_days: number[]; created_at: string;
}

export default function BranchesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // branch id being saved
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Per-branch editable config: closed_days + day capacities
  const [editConfig, setEditConfig] = useState<Record<string, {
    closed_days: number[];
    capacities: Record<number, number>; // dow → capacity
  }>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      supabase.from("profiles").select("role").eq("id", data.user.id).single()
        .then(({ data: p }) => {
          if (!["admin","super_admin"].includes(p?.role)) router.push("/dashboard");
        });
    });
    loadBranches();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBranches = () => {
    fetch("/api/branches")
      .then(r => r.json())
      .then((data: Branch[]) => { setBranches(data); setLoading(false); });
  };

  const loadDayCapacities = async (branchId: string) => {
    const { data } = await supabase
      .from("branch_day_capacity")
      .select("day_of_week, capacity")
      .eq("branch_id", branchId);

    const capMap: Record<number, number> = {};
    (data || []).forEach((r: DayCapacity) => { capMap[r.day_of_week] = r.capacity; });

    const branch = branches.find(b => b.id === branchId);
    setEditConfig(prev => ({
      ...prev,
      [branchId]: {
        closed_days: branch?.closed_days || [],
        capacities: capMap,
      }
    }));
  };

  const handleExpand = (branchId: string) => {
    if (expandedId === branchId) { setExpandedId(null); return; }
    setExpandedId(branchId);
    if (!editConfig[branchId]) loadDayCapacities(branchId);
  };

  const toggleClosedDay = (branchId: string, dow: number) => {
    setEditConfig(prev => {
      const cur = prev[branchId] || { closed_days: [], capacities: {} };
      const closed = cur.closed_days.includes(dow)
        ? cur.closed_days.filter(d => d !== dow)
        : [...cur.closed_days, dow];
      return { ...prev, [branchId]: { ...cur, closed_days: closed } };
    });
  };

  const setCapacity = (branchId: string, dow: number, val: string) => {
    setEditConfig(prev => {
      const cur = prev[branchId] || { closed_days: [], capacities: {} };
      return { ...prev, [branchId]: { ...cur, capacities: { ...cur.capacities, [dow]: parseInt(val) || 0 } } };
    });
  };

  const saveBranchConfig = async (branch: Branch) => {
    const cfg = editConfig[branch.id];
    if (!cfg) return;
    setSaving(branch.id); setError(null);

    try {
      // 1. Update closed_days on branches table
      const patchRes = await fetch("/api/branches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: branch.id, closed_days: cfg.closed_days }),
      });
      if (!patchRes.ok) throw new Error("Failed to save closed days");

      // 2. Upsert day capacities
      const rows = Object.entries(cfg.capacities)
        .filter(([dow]) => !cfg.closed_days.includes(Number(dow)))
        .map(([dow, cap]) => ({
          branch_id: branch.id,
          day_of_week: Number(dow),
          capacity: cap,
        }));

      if (rows.length > 0) {
        const { error: capErr } = await supabase
          .from("branch_day_capacity")
          .upsert(rows, { onConflict: "branch_id,day_of_week" });
        if (capErr) throw new Error(capErr.message);
      }

      // Update local branch closed_days
      setBranches(prev => prev.map(b =>
        b.id === branch.id ? { ...b, closed_days: cfg.closed_days } : b
      ));

      setExpandedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving("new"); setError(null);
    const res = await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(null); return; }
    setBranches(prev => [...prev, data]);
    setForm({ name: "", code: "" });
    setShowForm(false);
    setSaving(null);
  };

  const handleToggle = async (branch: Branch) => {
    const res = await fetch("/api/branches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: branch.id, is_active: !branch.is_active }),
    });
    if (res.ok) setBranches(prev =>
      prev.map(b => b.id === branch.id ? { ...b, is_active: !b.is_active } : b)
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">Branches</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Manage locations, closed days, and per-day capacity
            </p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
            <Plus size={16} /> Add branch
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
            <h2 className="text-base font-semibold mb-4 text-slate-950 dark:text-slate-50">New branch</h2>
            <form onSubmit={handleCreate} className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-40">
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Branch name</label>
                <input required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ras Al Khaimah" className="w-full" />
              </div>
              <div className="w-28">
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Code</label>
                <input required value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="RAK" maxLength={6} className="w-full" />
              </div>
              <div className="flex items-end gap-2">
                <button type="submit" disabled={saving === "new"} className="btn btn-primary">
                  {saving === "new" ? <Loader2 size={14} className="animate-spin" /> : "Create"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Branch list */}
        {loading ? (
          <div className="card p-8 text-center text-sm text-slate-500">Loading...</div>
        ) : (
          <div className="space-y-3">
            {branches.map(branch => {
              const cfg = editConfig[branch.id];
              const isExpanded = expandedId === branch.id;
              const isSaving = saving === branch.id;

              return (
                <div key={branch.id} className="card p-0 overflow-hidden">
                  {/* Branch header row */}
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="font-semibold text-slate-950 dark:text-slate-50">{branch.name}</span>
                        <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 font-mono text-xs dark:bg-slate-800">
                          {branch.code}
                        </span>
                      </div>
                      <span className={`badge ${branch.is_active ? "badge-success" : "bg-slate-100 text-slate-600"}`}>
                        {branch.is_active ? "Active" : "Inactive"}
                      </span>
                      {branch.closed_days?.length > 0 && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Off: {branch.closed_days.map(d => DOW_LABELS[d]).join(", ")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggle(branch)}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
                        {branch.is_active
                          ? <><ToggleRight size={15} className="text-green-600" /> Deactivate</>
                          : <><ToggleLeft size={15} /> Activate</>}
                      </button>
                      <button onClick={() => handleExpand(branch.id)}
                        className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800 dark:text-brand-400 ml-2">
                        {isExpanded ? <><ChevronUp size={14} /> Close</> : <><ChevronDown size={14} /> Configure</>}
                      </button>
                    </div>
                  </div>

                  {/* Expandable config panel */}
                  {isExpanded && cfg && (
                    <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 px-5 py-5">
                      <div className="grid gap-6 md:grid-cols-2">

                        {/* Closed days */}
                        <div>
                          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                            Day off (closed)
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {DOW_LABELS.map((label, dow) => {
                              const isClosed = cfg.closed_days.includes(dow);
                              return (
                                <button key={dow} type="button"
                                  onClick={() => toggleClosedDay(branch.id, dow)}
                                  className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
                                    isClosed
                                      ? "bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300"
                                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-400 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
                                  }`}>
                                  {label}
                                  {isClosed && " ✕"}
                                </button>
                              );
                            })}
                          </div>
                          <p className="mt-2 text-xs text-slate-400">
                            Closed days are blocked in the booking calendar.
                          </p>
                        </div>

                        {/* Per-day capacity */}
                        <div>
                          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                            Branch capacity per day
                          </h3>
                          <div className="space-y-2">
                            {DOW_FULL.map((dayName, dow) => {
                              const isClosed = cfg.closed_days.includes(dow);
                              if (isClosed) return null;
                              return (
                                <div key={dow} className="flex items-center gap-3">
                                  <span className="w-24 text-sm text-slate-600 dark:text-slate-400">{dayName}</span>
                                  <input
                                    type="number" min="0" max="200"
                                    value={cfg.capacities[dow] ?? ""}
                                    onChange={e => setCapacity(branch.id, dow, e.target.value)}
                                    placeholder="0"
                                    className="w-24 text-sm"
                                  />
                                  <span className="text-xs text-slate-400">vehicles</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex justify-end">
                        <button onClick={() => saveBranchConfig(branch)} disabled={isSaving}
                          className="btn btn-primary flex items-center gap-2">
                          {isSaving
                            ? <><Loader2 size={14} className="animate-spin" /> Saving...</>
                            : <><Save size={14} /> Save configuration</>}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Loading config */}
                  {isExpanded && !cfg && (
                    <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4 text-sm text-slate-500">
                      <Loader2 size={14} className="animate-spin inline mr-2" /> Loading configuration...
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
