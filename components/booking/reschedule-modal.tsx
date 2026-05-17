"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { TIME_SLOTS, formatTime } from "@/lib/booking-helpers";

interface Advisor {
  id: string; name: string;
  booked_count?: number; effective_capacity?: number; is_full?: boolean;
}
interface Branch { id: string; name: string; code: string; }

interface RescheduleModalProps {
  appointment: {
    id: string; customer_name: string; appointment_date: string;
    advisor_id: string; branch_id: string;
  };
  branches: Branch[];
  onClose: () => void;
  onSuccess: (newDate: string) => void;
}

export function RescheduleModal({ appointment, branches, onClose, onSuccess }: RescheduleModalProps) {
  const [form, setForm] = useState({
    appointment_date: "",
    advisor_id: appointment.advisor_id,
    time_slot: "",
    reason: "",
  });
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loadingAdvisors, setLoadingAdvisors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!form.appointment_date) return;
    setLoadingAdvisors(true);
    const branch = branches.find(b => b.id === appointment.branch_id);
    fetch(`/api/advisors?branch_id=${appointment.branch_id}&date=${form.appointment_date}`)
      .then(r => r.json())
      .then(data => { setAdvisors(data); setLoadingAdvisors(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.appointment_date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      onSuccess(form.appointment_date);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reschedule");
    } finally {
      setSaving(false);
    }
  };

  const selectedAdvisor = advisors.find(a => a.id === form.advisor_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">↻ Reschedule appointment</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800">
            <p className="font-medium text-slate-950 dark:text-slate-50">{appointment.customer_name}</p>
            <p className="text-slate-500 dark:text-slate-400">Currently: {appointment.appointment_date}</p>
            <p className="text-xs text-slate-400 mt-1">
              Original appointment becomes a ghost record for reference.
            </p>
          </div>

          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{error}</div>}

          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
              New date <span className="text-red-500">*</span>
            </label>
            <input type="date" required value={form.appointment_date}
              onChange={e => set("appointment_date", e.target.value)} className="w-full" />
          </div>

          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
              Service advisor <span className="text-red-500">*</span>
            </label>
            {loadingAdvisors ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                <Loader2 size={14} className="animate-spin" /> Loading...
              </div>
            ) : (
              <select required value={form.advisor_id}
                onChange={e => set("advisor_id", e.target.value)} className="w-full">
                <option value="">Select advisor</option>
                {advisors.map(a => (
                  <option key={a.id} value={a.id} disabled={a.is_full}>
                    {a.name}
                    {form.appointment_date ? ` (${a.booked_count ?? 0}/${a.effective_capacity ?? "?"})` : ""}
                    {a.is_full ? " — FULL" : ""}
                  </option>
                ))}
              </select>
            )}
            {selectedAdvisor?.is_full && (
              <p className="mt-1 text-xs text-red-600">This advisor is fully booked on that date.</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">New time slot</label>
            <select value={form.time_slot} onChange={e => set("time_slot", e.target.value)} className="w-full">
              <option value="">No specific time</option>
              {TIME_SLOTS.map(t => <option key={t} value={t}>{formatTime(t)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Reason</label>
            <input value={form.reason} onChange={e => set("reason", e.target.value)}
              placeholder="Customer request, vehicle not ready..." className="w-full" />
          </div>

          <div className="flex gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving || (!!selectedAdvisor?.is_full)}
              className="btn flex-1 disabled:opacity-50"
              style={{ background: "var(--color-purple-600, #9333ea)", color: "#fff" }}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Rescheduling...</> : "Confirm reschedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
