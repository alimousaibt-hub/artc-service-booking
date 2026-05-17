"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { TimeSlotGrid } from "@/components/booking/time-slot-grid";

interface Advisor {
  id: string; name: string;
  booked_count?: number; effective_capacity?: number; is_full?: boolean;
}
interface Branch { id: string; name: string; code: string; closed_days?: number[]; }

interface RescheduleModalProps {
  appointment: {
    id: string; customer_name: string; appointment_date: string;
    advisor_id: string; branch_id: string;
  };
  branches: Branch[];
  onClose: () => void;
  onSuccess: (newDate: string, newBranchId: string) => void;
}

const DOW_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export function RescheduleModal({ appointment, branches, onClose, onSuccess }: RescheduleModalProps) {
  const [form, setForm] = useState({
    branch_id: appointment.branch_id,
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

  // Selected branch closed days
  const selectedBranch = branches.find(b => b.id === form.branch_id);
  const closedDays: number[] = selectedBranch?.closed_days || [];

  const isDateClosed = (dateStr: string) => {
    if (!dateStr) return false;
    return closedDays.includes(new Date(dateStr + "T00:00:00").getDay());
  };

  // When branch changes, reset advisor and date
  useEffect(() => {
    setForm(f => ({ ...f, advisor_id: "", appointment_date: "", time_slot: "" }));
    setAdvisors([]);
  }, [form.branch_id]);

  // Load advisors when branch or date changes
  useEffect(() => {
    if (!form.branch_id || !form.appointment_date) return;
    setLoadingAdvisors(true);
    fetch(`/api/advisors?branch_id=${form.branch_id}&date=${form.appointment_date}`)
      .then(r => r.json())
      .then((data: Advisor[]) => {
        setAdvisors(data);
        // Pre-select same advisor if same branch, otherwise clear
        if (form.branch_id !== appointment.branch_id) {
          setForm(f => ({ ...f, advisor_id: data[0]?.id || "" }));
        }
        setLoadingAdvisors(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.branch_id, form.appointment_date]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (isDateClosed(val)) {
      setError(`${selectedBranch?.name || "Branch"} is closed on ${DOW_NAMES[new Date(val + "T00:00:00").getDay()]}.`);
      return;
    }
    setError(null);
    set("appointment_date", val);
    set("time_slot", "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDateClosed(form.appointment_date)) { setError("Cannot book on a closed day."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: form.branch_id,
          advisor_id: form.advisor_id,
          appointment_date: form.appointment_date,
          time_slot: form.time_slot || null,
          reason: form.reason,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      onSuccess(form.appointment_date, form.branch_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reschedule");
    } finally {
      setSaving(false);
    }
  };

  const selectedAdvisor = advisors.find(a => a.id === form.advisor_id);
  const today = new Date().toISOString().split("T")[0];

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
            <p className="text-xs text-slate-400 mt-1">Original becomes a ghost record for reference.</p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{error}</div>
          )}

          {/* Branch — can reschedule to different branch */}
          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Branch</label>
            <select value={form.branch_id} onChange={e => set("branch_id", e.target.value)} className="w-full">
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}{b.id === appointment.branch_id ? " (current)" : ""}
                </option>
              ))}
            </select>
            {form.branch_id !== appointment.branch_id && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                ⚠ Rescheduling to a different branch
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
              New date <span className="text-red-500">*</span>
            </label>
            <input type="date" required min={today}
              value={form.appointment_date}
              onChange={handleDateChange}
              className="w-full" />
            {closedDays.length > 0 && (
              <p className="mt-1 text-xs text-slate-400">
                Closed: {closedDays.map(d => DOW_NAMES[d]).join(", ")}
              </p>
            )}
          </div>

          {/* Advisor */}
          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
              Service advisor <span className="text-red-500">*</span>
            </label>
            {loadingAdvisors ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                <Loader2 size={14} className="animate-spin" /> Loading advisors...
              </div>
            ) : !form.appointment_date ? (
              <p className="text-sm text-slate-400 py-2">Select a date first</p>
            ) : (
              <select required value={form.advisor_id}
                onChange={e => { set("advisor_id", e.target.value); set("time_slot", ""); }}
                className="w-full">
                <option value="">Select advisor</option>
                {advisors.map(a => (
                  <option key={a.id} value={a.id} disabled={a.is_full}>
                    {a.name}
                    {` (${a.booked_count ?? 0}/${a.effective_capacity ?? "?"})`}
                    {a.is_full ? " — FULL" : ""}
                  </option>
                ))}
              </select>
            )}
            {selectedAdvisor?.is_full && (
              <p className="mt-1 text-xs text-red-600">Advisor is fully booked on that date.</p>
            )}
          </div>

          {/* Time slot grid */}
          {form.advisor_id && form.appointment_date && !selectedAdvisor?.is_full && (
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Time slot</label>
              <TimeSlotGrid
                advisorId={form.advisor_id}
                date={form.appointment_date}
                selectedSlot={form.time_slot}
                onSelect={slot => set("time_slot", slot)}
                excludeId={appointment.id}
              />
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Reason</label>
            <input value={form.reason} onChange={e => set("reason", e.target.value)}
              placeholder="Customer request, vehicle not ready..." className="w-full" />
          </div>

          <div className="flex gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit"
              disabled={saving || !form.appointment_date || !form.advisor_id || !!selectedAdvisor?.is_full}
              className="btn flex-1 bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Rescheduling...</> : "Confirm reschedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
