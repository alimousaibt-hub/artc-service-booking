// ============================================================
// Booking Helpers — time slots, capacity, date utilities
// ============================================================

export const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30",
];

export const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

/** Get all days in a given month as Date objects */
export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

/** Format a Date to YYYY-MM-DD string (uses local time, not UTC) */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Format a date string to display format e.g. "15 Jun 2026" */
export function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format time slot to 12-hour for display */
export function formatTime(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

/** Status color mapping */
export const STATUS_COLORS: Record<string, string> = {
  booked:      "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  confirmed:   "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  completed:   "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  no_show:     "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  cancelled:   "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  rescheduled: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

export const STATUS_LABELS: Record<string, string> = {
  booked:      "Booked",
  confirmed:   "Confirmed",
  completed:   "Completed",
  no_show:     "No Show",
  cancelled:   "Cancelled",
  rescheduled: "Rescheduled",
};
