"use client";

import { useState } from "react";
import { X, Loader2, AlertTriangle } from "lucide-react";

interface CancelModalProps {
  appointment: { id: string; customer_name: string; appointment_date: string };
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelModal({ appointment, onClose, onSuccess }: CancelModalProps) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50 flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-500" />
            Cancel appointment
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-lg bg-orange-50 px-4 py-3 text-sm text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
            <p className="font-medium">{appointment.customer_name}</p>
            <p className="text-xs mt-0.5">{appointment.appointment_date}</p>
            <p className="mt-2">A ghost record will be kept for reference. This cannot be undone by agents.</p>
          </div>
          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Reason for cancellation
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Customer request, vehicle not ready..."
              rows={3}
              className="w-full resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn btn-secondary flex-1">Keep appointment</button>
            <button onClick={handleCancel} disabled={saving}
              className="btn btn-danger flex-1 disabled:opacity-50">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Cancelling...</> : "Confirm cancel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
