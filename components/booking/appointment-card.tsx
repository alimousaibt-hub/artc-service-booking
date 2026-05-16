"use client";

import { STATUS_COLORS, STATUS_LABELS, formatTime } from "@/lib/booking-helpers";
import { Edit2, Clock, Car, Phone, Calendar, ArrowRight } from "lucide-react";

interface AppointmentCardProps {
  appointment: {
    id: string;
    customer_name: string;
    customer_phone: string | null;
    plate_number: string | null;
    time_slot: string | null;
    status: string;
    is_ghost: boolean;
    ghost_reason: string | null;
    rescheduled_to_id: string | null;
    notes: string | null;
    advisor?: { name: string } | null;
    booker?: { full_name: string | null; email: string } | null;
  };
  canEdit: boolean;
  onEdit: () => void;
}

export function AppointmentCard({ appointment: a, canEdit, onEdit }: AppointmentCardProps) {
  const isGhost = a.is_ghost;

  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        isGhost
          ? "border-dashed border-slate-300 bg-slate-50 opacity-70 dark:border-slate-600 dark:bg-slate-800/30"
          : "border-slate-200 bg-white shadow-sm hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Name + status */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-slate-950 dark:text-slate-50 ${isGhost ? "line-through opacity-60" : ""}`}>
              {a.customer_name}
            </span>
            <span className={`badge ${STATUS_COLORS[a.status] || "bg-slate-100 text-slate-700"}`}>
              {STATUS_LABELS[a.status] || a.status}
            </span>
            {isGhost && (
              <span className="badge bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                {a.ghost_reason === "rescheduled" ? "↻ Rescheduled" : "✕ Cancelled"}
              </span>
            )}
          </div>

          {/* Details */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
            {a.time_slot && (
              <span className="flex items-center gap-1">
                <Clock size={13} />
                {formatTime(a.time_slot)}
              </span>
            )}
            {a.customer_phone && (
              <span className="flex items-center gap-1">
                <Phone size={13} />
                {a.customer_phone}
              </span>
            )}
            {a.plate_number && (
              <span className="flex items-center gap-1">
                <Car size={13} />
                {a.plate_number}
              </span>
            )}
          </div>

          {/* Rescheduled link */}
          {a.ghost_reason === "rescheduled" && a.rescheduled_to_id && (
            <div className="mt-2 flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
              <ArrowRight size={12} />
              Rescheduled — see new appointment
            </div>
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
        </div>

        {/* Edit button */}
        {canEdit && !isGhost && (
          <button
            onClick={onEdit}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <Edit2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
