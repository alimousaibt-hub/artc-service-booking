"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { toDateString } from "@/lib/booking-helpers";
import { Branch, ServiceAdvisor } from "@/types/database";
import { PhoneInput } from "@/components/booking/phone-input";
import { PlateInput } from "@/components/booking/plate-input";
import { TimeSlotGrid } from "@/components/booking/time-slot-grid";

interface AdvisorWithCapacity extends ServiceAdvisor {
  booked_count?: number;
  effective_capacity?: number;
  is_full?: boolean;
}

interface BranchWithDays extends Branch {
  closed_days?: number[];
}

interface AppointmentFormProps {
  mode: "create" | "edit";
  initialDate?: string;
  initialBranchId?: string;
  branches: BranchWithDays[];
  existingAppointment?: {
    id: string;
    customer_name: string;
    customer_phone: string | null;
    plate_number: string | null;
    branch_id: string;
    advisor_id: string;
    appointment_date: string;
    time_slot: string | null;
    notes: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function AppointmentForm({
  mode,
  initialDate,
  initialBranchId,
  branches,
  existingAppointment,
  onClose,
  onSuccess,
}: AppointmentFormProps) {
  const isEdit = mode === "edit" && existingAppointment;

  const [form, setForm] = useState({
    customer_name: isEdit ? existingAppointment.customer_name : "",
    customer_phone: isEdit ? (existingAppointment.customer_phone || "") : "",
    plate_number: isEdit ? (existingAppointment.plate_number || "") : "",
    branch_id: isEdit ? existingAppointment.branch_id : (initialBranchId || branches[0]?.id || ""),
    advisor_id: isEdit ? existingAppointment.advisor_id : "",
    appointment_date: isEdit ? existingAppointment.appointment_date : (initialDate || ""),
    time_slot: isEdit ? (existingAppointment.time_slot || "") : "",
    notes: isEdit ? (existingAppointment.notes || "") : "",
  });

  const [advisors, setAdvisors] = useState<AdvisorWithCapacity[]>([]);
  const [loadingAdvisors, setLoadingAdvisors] = useState(false);
  const [holidayDates, setHolidayDates] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load holidays for the branch
  useEffect(() => {
    if (!form.branch_id) return;
    const year = new Date().getFullYear();
    fetch(`/api/holidays?branch_id=${form.branch_id}&year=${year}`)
      .then(r => r.json())
      .then((data: { date: string }[]) => {
        setHolidayDates(new Set((data || []).map(h => h.date)));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.branch_id]);

  // Get closed days for selected branch
  const selectedBranch = branches.find(b => b.id === form.branch_id);
  const closedDays: number[] = selectedBranch?.closed_days || [];

  // Build min date (today)
  const minDate = toDateString(new Date());

  // Load holidays for selected branch
  useEffect(() => {
    if (!form.branch_id) return;
    fetch(`/api/holidays?branch_id=${form.branch_id}`)
      .then(r => r.json())
      .then((data: { date: string }[]) => {
        setHolidayDates(new Set((data || []).map(h => h.date)));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.branch_id]);

  // Load advisors when branch or date changes
  useEffect(() => {
    if (!form.branch_id) return;
    setLoadingAdvisors(true);
    const params = new URLSearchParams({ branch_id: form.branch_id });
    if (form.appointment_date) params.set("date", form.appointment_date);

    fetch(`/api/advisors?${params}`)
      .then(r => r.json())
      .then((data: AdvisorWithCapacity[]) => {
        setAdvisors(data);
        if (data.length > 0 && !data.find(a => a.id === form.advisor_id)) {
          setForm(f => ({ ...f, advisor_id: data[0]?.id || "" }));
        }
      })
      .finally(() => setLoadingAdvisors(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.branch_id, form.appointment_date]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Check if a date string falls on a closed day or holiday
  const isDateClosed = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const dow = new Date(dateStr + "T00:00:00").getDay();
    if (closedDays.includes(dow)) return true;
    if (holidayDates.has(dateStr)) return true;
    return false;
  };

  const getDateBlockReason = (dateStr: string): string => {
    if (!dateStr) return "";
    const dow = new Date(dateStr + "T00:00:00").getDay();
    if (closedDays.includes(dow)) return "Service centre is closed on this day.";
    if (holidayDates.has(dateStr)) return "This date is a holiday.";
    return "";
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (isDateClosed(val)) {
      setError(getDateBlockReason(val) || "This date is not available for booking.");
      return;
    }
    setError(null);
    set("appointment_date", val);
    set("time_slot", ""); // reset slot when date changes
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDateClosed(form.appointment_date)) {
      setError("Cannot book on a closed day.");
      return;
    }
    setError(null);
    setSaving(true);

    try {
      if (isEdit) {
        const logEdits = ["customer_name","customer_phone","plate_number"].map(field => ({
          field,
          old: String(existingAppointment[field as keyof typeof existingAppointment] ?? ""),
          new: form[field as keyof typeof form],
        }));

        const res = await fetch("/api/appointments", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: existingAppointment.id,
            fields: {
              customer_name: form.customer_name,
              customer_phone: form.customer_phone || null,
              plate_number: form.plate_number || null,
              notes: form.notes || null,
            },
            log_edits: logEdits,
          }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      } else {
        const res = await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_name: form.customer_name,
            customer_phone: form.customer_phone || null,
            plate_number: form.plate_number || null,
            branch_id: form.branch_id,
            advisor_id: form.advisor_id,
            appointment_date: form.appointment_date,
            time_slot: form.time_slot || null,
            notes: form.notes || null,
          }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const selectedAdvisor = advisors.find(a => a.id === form.advisor_id);
  const closedDayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
            {isEdit ? "Edit appointment" : "New appointment"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Customer info */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Customer
            </h3>

            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                Full name <span className="text-red-500">*</span>
              </label>
              <input required value={form.customer_name}
                onChange={e => set("customer_name", e.target.value)}
                placeholder="John Doe" className="w-full" />
            </div>

            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                Phone number
              </label>
              <PhoneInput
                value={form.customer_phone}
                onChange={v => set("customer_phone", v)}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                Plate number
              </label>
              <PlateInput
                value={form.plate_number}
                onChange={v => set("plate_number", v)}
              />
            </div>
          </div>

          {/* Scheduling — only on create */}
          {!isEdit && (
            <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Scheduling
              </h3>

              {branches.length > 1 && (
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Branch</label>
                  <select value={form.branch_id}
                    onChange={e => { set("branch_id", e.target.value); set("time_slot", ""); }}
                    className="w-full">
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input type="date" required min={minDate}
                  value={form.appointment_date}
                  onChange={handleDateChange}
                  className="w-full" />
                {closedDays.length > 0 && (
                  <p className="mt-1 text-xs text-slate-400">
                    Closed: {closedDays.map(d => closedDayNames[d]).join(", ")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  Service advisor <span className="text-red-500">*</span>
                </label>
                {loadingAdvisors ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                    <Loader2 size={14} className="animate-spin" /> Loading advisors...
                  </div>
                ) : (
                  <select required value={form.advisor_id}
                    onChange={e => { set("advisor_id", e.target.value); set("time_slot", ""); }}
                    className="w-full">
                    <option value="">Select advisor</option>
                    {advisors.map(a => (
                      <option key={a.id} value={a.id} disabled={a.is_full}>
                        {a.name}
                        {form.appointment_date
                          ? ` (${a.booked_count ?? 0}/${a.effective_capacity ?? a.daily_capacity})`
                          : ""}
                        {a.is_full ? " — FULL" : ""}
                      </option>
                    ))}
                  </select>
                )}
                {selectedAdvisor?.is_full && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    This advisor is fully booked for this date.
                  </p>
                )}
              </div>

              {/* Time slot grid */}
              {form.advisor_id && form.appointment_date && !selectedAdvisor?.is_full && (
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Time slot
                  </label>
                  <TimeSlotGrid
                    advisorId={form.advisor_id}
                    date={form.appointment_date}
                    selectedSlot={form.time_slot}
                    onSelect={slot => set("time_slot", slot)}
                    disabled={saving}
                  />
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              placeholder="Any additional notes..." rows={2} className="w-full resize-none" />
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit"
              disabled={saving || (!isEdit && (selectedAdvisor?.is_full ?? false))}
              className="btn btn-primary flex-1 disabled:opacity-50">
              {saving
                ? <><Loader2 size={14} className="animate-spin" /> Saving...</>
                : isEdit ? "Save changes" : "Create appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
