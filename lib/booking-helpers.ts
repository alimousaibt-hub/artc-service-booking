// ============================================================
// Booking Helpers
// ============================================================

// ── Time slots ──────────────────────────────────────────────

/** All possible slots 08:00–17:00 in 15-min increments */
export const ALL_TIME_SLOTS: string[] = [];
for (let h = 8; h <= 16; h++) {
  for (const m of [0, 15, 30, 45]) {
    if (h === 16 && m > 45) break;
    ALL_TIME_SLOTS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}
// Keep backward compat alias
export const TIME_SLOTS = ALL_TIME_SLOTS;

/** Cutoff time per role — last bookable slot (inclusive) */
export const ROLE_CUTOFF: Record<string, string> = {
  crm_agent:   "15:00",
  advisor:     "17:00",
  admin:       "17:00",
  super_admin: "17:00",
};

/** Filter slots available for a given role */
export function slotsForRole(role: string): string[] {
  const cutoff = ROLE_CUTOFF[role] || "15:00";
  return ALL_TIME_SLOTS.filter(s => s <= cutoff);
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


// ── UAE Phone validation ─────────────────────────────────────

const UAE_MOBILE_PREFIXES = ["050","052","054","055","056","058","045","048","056"];
const UAE_LANDLINE_PREFIXES = ["02","04","06","07","09"];

/** Returns true if string is a valid UAE phone number (9 or 10 digits, correct prefix) */
export function isValidUAEPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("971")) {
    // International without +: 9715XXXXXXXX (12 digits)
    const local = "0" + digits.slice(3);
    return isValidUAEPhone(local);
  }
  for (const p of UAE_MOBILE_PREFIXES) {
    if (digits.startsWith(p) && digits.length === 10) return true;
  }
  for (const p of UAE_LANDLINE_PREFIXES) {
    if (digits.startsWith(p) && digits.length === 9) return true;
  }
  return false;
}

/** Format phone for display: 0501234567 → 050 123 4567 */
export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return `${d.slice(0,3)} ${d.slice(3,6)} ${d.slice(6)}`;
  if (d.length === 9)  return `${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5)}`;
  return phone;
}

// ── UAE Plate codes per emirate ──────────────────────────────

// UAE plate code series per emirate
// Dubai: letter series (A, B … Z, then AA, AB …)
// Abu Dhabi: numeric category codes (1–100 range categories, stored as strings)
// Sharjah / Northern Emirates: letter series (shorter)
export const PLATE_CODES_BY_EMIRATE: Record<string, string[]> = {
  DXB: [
    "", "A","B","C","D","E","F","G","H","I","J","K","L","M",
    "N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
    "AA","AB","AC","AD","AE","AF","AG","AH","AI","AJ",
  ],
  // Abu Dhabi uses numeric category codes (no letter prefix)
  AUH: [
    "","1","2","3","4","5","6","7","8","9","10",
    "11","12","13","14","15","16","17","18","19","20",
    "21","22","23","24","25","26","27","28","29","30",
    "40","50","60","70","80","90","100",
  ],
  // Sharjah: letter series
  SHJ: ["","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R"],
  // RAK: letter series
  RAK: ["","A","B","C","D","E","F","G","H","I","J","K"],
  // Ajman: letter series
  AJM: ["","A","B","C","D","E","F","G","H","I"],
  // Fujairah: letter series
  FUJ: ["","A","B","C","D","E","F","G"],
  // Umm Al Quwain: letter series
  UAQ: ["","A","B","C","D","E","F"],
  OTH: [""],
};
