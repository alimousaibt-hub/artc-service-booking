import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { ALL_TIME_SLOTS, ROLE_CUTOFF } from "@/lib/booking-helpers";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const advisorId = searchParams.get("advisor_id");
  const date = searchParams.get("date");
  const excludeId = searchParams.get("exclude_id"); // for reschedule: exclude current appt

  if (!advisorId || !date) {
    return NextResponse.json({ error: "advisor_id and date required" }, { status: 400 });
  }

  // Get current user's role for cutoff
  const { data: { user } } = await supabase.auth.getUser();
  let role = "crm_agent";
  if (user) {
    const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    role = p?.role || "crm_agent";
  }

  // Get taken slots
  let query = supabase
    .from("appointments")
    .select("time_slot")
    .eq("advisor_id", advisorId)
    .eq("appointment_date", date)
    .eq("is_ghost", false)
    .in("status", ["booked", "confirmed"]);

  if (excludeId) query = query.neq("id", excludeId);

  const { data: taken } = await query;
  const takenSlots = new Set((taken || []).map(a => a.time_slot).filter(Boolean));

  // Role-based cutoff
  const cutoff = ROLE_CUTOFF[role] || "15:00";

  const slots = ALL_TIME_SLOTS
    .filter(s => s <= cutoff)
    .map(s => ({
      slot: s,
      taken: takenSlots.has(s),
    }));

  return NextResponse.json({ slots, cutoff, role });
}
