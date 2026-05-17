// ============================================================
// Booking Helpers
// ============================================================

// 15-minute slots 08:00 – 18:00
export const TIME_SLOTS: string[] = [];
for (let h = 8; h < 18; h++) {
  for (const m of [0, 15, 30, 45]) {
    TIME_SLOTS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

export const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

/** Local-time YYYY-MM-DD — never uses UTC to avoid timezone shift */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatTime(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ── Plate number helpers ────────────────────────────────────

export const UAE_EMIRATES = [
  { code: "DXB", label: "Dubai" },
  { code: "AUH", label: "Abu Dhabi" },
  { code: "SHJ", label: "Sharjah" },
  { code: "RAK", label: "Ras Al Khaimah" },
  { code: "AJM", label: "Ajman" },
  { code: "FUJ", label: "Fujairah" },
  { code: "UAQ", label: "Umm Al Quwain" },
  { code: "OTH", label: "Other / Non-UAE" },
];

/** Build stored plate string: emirate + code + number, no spaces. e.g. DXBAA29999 */
export function buildPlate(emirate: string, code: string, num: string): string {
  return `${emirate}${code.toUpperCase().replace(/\s/g, "")}${num.replace(/\s/g, "")}`;
}

/** Parse stored plate back into parts for display */
export function parsePlate(plate: string | null): { emirate: string; code: string; num: string } {
  if (!plate) return { emirate: "DXB", code: "", num: "" };
  const emirateMatch = UAE_EMIRATES.find((e) => plate.startsWith(e.code));
  if (!emirateMatch) return { emirate: "OTH", code: "", num: plate };
  const rest = plate.slice(emirateMatch.code.length);
  // Letters = code, digits = number
  const match = rest.match(/^([A-Z]*)(\d+)$/);
  if (match) return { emirate: emirateMatch.code, code: match[1], num: match[2] };
  return { emirate: emirateMatch.code, code: "", num: rest };
}

/** Format plate for display: DXBAA29999 → DXB AA 29999 */
export function displayPlate(plate: string | null): string {
  if (!plate) return "";
  const { emirate, code, num } = parsePlate(plate);
  return [emirate, code, num].filter(Boolean).join(" ");
}

// ── Status helpers ──────────────────────────────────────────

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
