"use client";

import { STATUS_COLORS, STATUS_LABELS, formatTime, displayPlate, formatDateDisplay } from "@/lib/booking-helpers";
import { Edit2, Clock, Car, Phone, ArrowRight, CheckCircle, UserX, Ban, Trash2 } from "lucide-react";

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  plate_number: string | null;
  time_slot: string | null;
  status: string;
  is_ghost: boolean;
  ghost_reason: string | null;
  rescheduled_to_id: string | null;
  rescheduled_to_date?: string | null;  // joined from new appt
  cancel_reason?: string | null;
  reschedule_reason?: string | null;
  notes: string | null;
  advisor?: { name: string } | null;
  booker?: { full_name: string | null; email: string } | null;
}

interface AppointmentCardProps {
  appointment: Appointment;
  canEdit: boolean;        // CRM agent / admin
  isAdvisor?: boolean;     // logged-in user is the assigned advisor
  onEdit?: () => void;
  onCancel?: () => void;
  onReschedule?: () => void;
  onAction?: (action: "confirm" | "complete" | "no_show") => void;
  onGoToRescheduled?: (id: string) => void;
  canDeleteGhost?: boolean;
  onDeleteGhost?: () => void;
}

export function AppointmentCard({
  appointment: a,
  canEdit,
  isAdvisor,
  onEdit,
  onCancel,
  onReschedule,
  onAction,
  onGoToRescheduled,
  canDeleteGhost,
  onDeleteGhost,
}: AppointmentCardProps) {
  const isGhost = a.is_ghost;
  const isActive = ["booked", "confirmed"].includes(a.status);

  return (
    <div className={`rounded-lg border p-4 transition-all ${
      isGhost
        ? "border-dashed border-slate-300 bg-slate-50/80 dark:border-slate-600 dark:bg-slate-800/20"
        : "border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Name + status */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-slate-950 dark:text-slate-50 ${isGhost ? "line-through opacity-50" : ""}`}>
              {a.customer_name}
            </span>
            <span className={`badge text-xs ${STATUS_COLORS[a.status] || "bg-slate-100 text-slate-700"}`}>
              {STATUS_LABELS[a.status] || a.status}
            </span>
            {isGhost && (
              <span className="badge text-xs bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                {a.ghost_reason === "rescheduled" ? "↻ Ghost" : "✕ Ghost"}
              </span>
            )}
          </div>

          {/* Details row */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
            {a.time_slot && (
              <span className="flex items-center gap-1"><Clock size={13} />{formatTime(a.time_slot)}</span>
            )}
            {a.customer_phone && (
              <span className="flex items-center gap-1"><Phone size={13} />{a.customer_phone}</span>
            )}
            {a.plate_number && (
              <span className="flex items-center gap-1 font-mono text-xs"><Car size={13} />{displayPlate(a.plate_number)}</span>
            )}
          </div>

          {/* Ghost reason */}
          {isGhost && a.ghost_reason === "rescheduled" && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-purple-600 dark:text-purple-400">
                ↻ Rescheduled{a.rescheduled_to_date ? ` to ${formatDateDisplay(a.rescheduled_to_date)}` : ""}
              </span>
              {a.rescheduled_to_id && onGoToRescheduled && (
                <button
                  onClick={() => onGoToRescheduled(a.rescheduled_to_id!)}
                  className="flex items-center gap-1 text-xs font-medium text-purple-600 underline hover:text-purple-800 dark:text-purple-400"
                >
                  <ArrowRight size={12} /> Go to appointment
                </button>
              )}
              {a.reschedule_reason && (
                <span className="text-xs text-slate-400">— {a.reschedule_reason}</span>
              )}
            </div>
          )}
          {isGhost && a.ghost_reason === "cancelled" && a.cancel_reason && (
            <p className="mt-1 text-xs text-slate-400">Reason: {a.cancel_reason}</p>
          )}

          {/* Booked by */}
          {a.booker && (
            <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              Booked by {a.booker.full_name || a.booker.email}
            </div>
          )}

          {/* Notes */}
          {a.notes && (
            <div className="mt-2 rounded bg-slate-50 px-2 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {a.notes}
            </div>
          )}

          {/* Advisor actions */}
          {isAdvisor && !isGhost && isActive && onAction && (
            <div className="mt-3 flex flex-wrap gap-2">
              {a.status === "booked" && (
                <button
                  onClick={() => onAction("confirm")}
                  className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"
                >
                  <CheckCircle size={13} /> Confirm arrival
                </button>
              )}
              {["booked","confirmed"].includes(a.status) && (
                <button
                  onClick={() => onAction("complete")}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                >
                  <CheckCircle size={13} /> Mark done
                </button>
              )}
              <button
                onClick={() => onAction("no_show")}
                className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
              >
                <UserX size={13} /> No show
              </button>
            </div>
          )}
        </div>

        {/* Ghost delete — admin/super_admin only */}
        {isGhost && canDeleteGhost && onDeleteGhost && (
          <button
            onClick={onDeleteGhost}
            className="shrink-0 rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600 dark:text-slate-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            title="Delete ghost record"
          >
            <Trash2 size={14} />
          </button>
        )}

        {/* Right-side agent actions */}
        {!isGhost && (
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {canEdit && onEdit && (
              <button
                onClick={onEdit}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                title="Edit customer info"
              >
                <Edit2 size={14} />
              </button>
            )}
            {canEdit && isActive && onReschedule && (
              <button
                onClick={onReschedule}
                className="rounded-lg p-1.5 text-purple-400 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-900/30"
                title="Reschedule"
              >
                <ArrowRight size={14} />
              </button>
            )}
            {canEdit && isActive && onCancel && (
              <button
                onClick={onCancel}
                className="rounded-lg p-1.5 text-orange-400 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-900/30"
                title="Cancel appointment"
              >
                <Ban size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
