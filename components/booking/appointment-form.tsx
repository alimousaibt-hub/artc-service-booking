"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { TIME_SLOTS, formatTime } from "@/lib/booking-helpers";
import { Branch, ServiceAdvisor } from "@/types/database";

interface AdvisorWithCapacity extends ServiceAdvisor {
  booked_count?: number;
  effective_capacity?: number;
  is_full?: boolean;
}

interface AppointmentFormProps {
  mode: "create" | "edit";
  initialDate?: string;       // YYYY-MM-DD pre-selected
  initialBranchId?: string;     // pre-select branch from current tab
  initialAdvisorId?: string;
  branches: Branch[];
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
  initialAdvisorId,
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
    advisor_id: isEdit ? existingAppointment.advisor_id : (initialAdvisorId || ""),
    appointment_date: isEdit ? existingAppointment.appointment_date : (initialDate || ""),
    time_slot: isEdit ? (existingAppointment.time_slot || "") : "",
    notes: isEdit ? (existingAppointment.notes || "") : "",
  });

  const [advisors, setAdvisors] = useState<AdvisorWithCapacity[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load advisors when branch or date changes
  useEffect(() => {
    if (!form.branch_id) return;
    setLoading(true);
    const params = new URLSearchParams({ branch_id: form.branch_id });
    if (form.appointment_date) params.set("date", form.appointment_date);

    fetch(`/api/advisors?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setAdvisors(data);
        // Reset advisor if not in list
        if (data.length > 0 && !data.find((a: AdvisorWithCapacity) => a.id === form.advisor_id)) {
          setForm((f) => ({ ...f, advisor_id: data[0].id }));
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.branch_id, form.appointment_date]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (isEdit) {
        // Edit: only customer info fields, with audit log
        const logEdits = ["customer_name", "customer_phone", "plate_number"].map(
          (field) => ({
            field,
            old: existingAppointment[field as keyof typeof existingAppointment] || "",
            new: form[field as keyof typeof form],
          })
        );

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

        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Failed to update");
        }
      } else {
        // Create
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

        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Failed to create");
        }
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const selectedAdvisor = advisors.find((a) => a.id === form.advisor_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
            {isEdit ? "Edit appointment" : "New appointment"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Customer info */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Customer info
            </h3>
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.customer_name}
                onChange={(e) => set("customer_name", e.target.value)}
                placeholder="John Doe"
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  Phone number
                </label>
                <input
                  value={form.customer_phone}
                  onChange={(e) => set("customer_phone", e.target.value)}
                  placeholder="971XXXXXXXXX"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  Plate number
                </label>
                <input
                  value={form.plate_number}
                  onChange={(e) => set("plate_number", e.target.value.toUpperCase())}
                  placeholder="A 12345"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Scheduling — only shown when creating */}
          {!isEdit && (
            <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Scheduling
              </h3>

              {branches.length > 1 && (
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Branch
                  </label>
                  <select
                    value={form.branch_id}
                    onChange={(e) => set("branch_id", e.target.value)}
                    className="w-full"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.appointment_date}
                  onChange={(e) => set("appointment_date", e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  Service advisor <span className="text-red-500">*</span>
                </label>
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                    <Loader2 size={14} className="animate-spin" />
                    Loading advisors...
                  </div>
                ) : (
                  <select
                    required
                    value={form.advisor_id}
                    onChange={(e) => set("advisor_id", e.target.value)}
                    className="w-full"
                  >
                    <option value="">Select advisor</option>
                    {advisors.map((a) => (
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

              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  Time slot (optional)
                </label>
                <select
                  value={form.time_slot}
                  onChange={(e) => set("time_slot", e.target.value)}
                  className="w-full"
                >
                  <option value="">No specific time</option>
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>
                      {formatTime(t)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
              className="w-full resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (!isEdit && (selectedAdvisor?.is_full ?? false))}
              className="btn btn-primary flex-1 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Create appointment"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
