"use client";

import { useEffect, useState } from "react";
import { formatTime } from "@/lib/booking-helpers";
import { Loader2 } from "lucide-react";

interface SlotInfo {
  slot: string;
  taken: boolean;
}

interface TimeSlotGridProps {
  advisorId: string;
  date: string;
  selectedSlot: string;
  onSelect: (slot: string) => void;
  excludeId?: string;   // appointment being rescheduled
  disabled?: boolean;
}

export function TimeSlotGrid({
  advisorId,
  date,
  selectedSlot,
  onSelect,
  excludeId,
  disabled,
}: TimeSlotGridProps) {
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [cutoff, setCutoff] = useState<string>("15:00");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!advisorId || !date) { setSlots([]); return; }
    setLoading(true);
    const params = new URLSearchParams({ advisor_id: advisorId, date });
    if (excludeId) params.set("exclude_id", excludeId);

    fetch(`/api/slots?${params}`)
      .then(r => r.json())
      .then(data => {
        setSlots(data.slots || []);
        setCutoff(data.cutoff || "15:00");
        // Deselect if currently selected is now taken or beyond cutoff
        if (selectedSlot) {
          const found = (data.slots || []).find((s: SlotInfo) => s.slot === selectedSlot);
          if (!found || found.taken) onSelect("");
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advisorId, date, excludeId]);

  if (!advisorId || !date) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
        <Loader2 size={14} className="animate-spin" /> Loading slots...
      </div>
    );
  }

  if (slots.length === 0) return null;

  const freeCount = slots.filter(s => !s.taken).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {freeCount} of {slots.length} slots available · bookable until {formatTime(cutoff)}
        </span>
        {selectedSlot && (
          <button
            type="button"
            onClick={() => onSelect("")}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
        {slots.map(({ slot, taken }) => {
          const isSelected = selectedSlot === slot;
          return (
            <button
              key={slot}
              type="button"
              disabled={taken || disabled}
              onClick={() => onSelect(isSelected ? "" : slot)}
              className={`
                relative flex flex-col items-center justify-center rounded-lg px-1 py-2 text-xs font-medium transition-all
                ${taken
                  ? "cursor-not-allowed border border-red-200 bg-red-50 text-red-400 dark:border-red-900 dark:bg-red-900/20 dark:text-red-500"
                  : isSelected
                    ? "border-2 border-green-600 bg-green-600 text-white shadow-sm"
                    : "border border-green-200 bg-green-50 text-green-800 hover:border-green-400 hover:bg-green-100 dark:border-green-900 dark:bg-green-900/20 dark:text-green-400 dark:hover:border-green-600"
                }
              `}
            >
              {formatTime(slot)}
              {taken && (
                <span className="mt-0.5 text-[9px] text-red-400 dark:text-red-500 leading-none">
                  taken
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
