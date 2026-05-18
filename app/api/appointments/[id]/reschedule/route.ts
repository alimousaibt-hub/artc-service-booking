import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await req.json();
  // body: { advisor_id, appointment_date, time_slot, reason }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role, status").eq("id", user.id).single();
  if (profile?.status !== "active") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["crm_agent","admin","super_admin"].includes(profile?.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Fetch original appointment
  const { data: orig } = await supabase
    .from("appointments").select("*").eq("id", id).single();
  if (!orig) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (orig.is_ghost) return NextResponse.json({ error: "Cannot reschedule a ghost record" }, { status: 400 });

  // Capacity check on new slot
  const { data: existingAppts } = await supabase
    .from("appointments")
    .select("id, time_slot")
    .eq("advisor_id", body.advisor_id)
    .eq("appointment_date", body.appointment_date)
    .eq("is_ghost", false)
    .in("status", ["booked","confirmed"]);

  const { data: advisor } = await supabase
    .from("service_advisors").select("daily_capacity").eq("id", body.advisor_id).single();
  const { data: override } = await supabase
    .from("capacity_overrides").select("capacity")
    .eq("advisor_id", body.advisor_id).eq("date", body.appointment_date).single();

  const capacity = override?.capacity ?? advisor?.daily_capacity ?? 10;
  if ((existingAppts?.length ?? 0) >= capacity)
    return NextResponse.json({ error: "Advisor is fully booked on that date" }, { status: 409 });

  if (body.time_slot) {
    const slotTaken = existingAppts?.some(a => a.time_slot === body.time_slot);
    if (slotTaken)
      return NextResponse.json({ error: `Time slot ${body.time_slot} already taken` }, { status: 409 });
  }

  const now = new Date().toISOString();

  // 1. Create new appointment
  const { data: newAppt, error: createErr } = await supabase
    .from("appointments")
    .insert({
      customer_name: orig.customer_name,
      customer_phone: orig.customer_phone,
      plate_number: orig.plate_number,
      branch_id: body.branch_id || orig.branch_id,
      advisor_id: body.advisor_id,
      appointment_date: body.appointment_date,
      time_slot: body.time_slot || null,
      notes: orig.notes,
      booked_by: orig.booked_by,
      status: "booked",
      rescheduled_from_id: orig.id,
    })
    .select("id")
    .single();

  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });

  // 2. Turn original into ghost
  const { error: ghostErr } = await supabase
    .from("appointments")
    .update({
      status: "rescheduled",
      is_ghost: true,
      ghost_reason: "rescheduled",
      rescheduled_to_id: newAppt.id,
      rescheduled_at: now,
      rescheduled_by: user.id,
      reschedule_reason: body.reason || null,
    })
    .eq("id", orig.id);

  if (ghostErr) return NextResponse.json({ error: ghostErr.message }, { status: 500 });

  // Notify original creator if someone else rescheduled
  if (orig.booked_by && orig.booked_by !== user.id) {
    await supabase.from("notifications").insert({
      user_id: orig.booked_by,
      type: "appointment_rescheduled",
      title: "Your appointment was rescheduled",
      body: `${orig.customer_name} was rescheduled to ${body.appointment_date}${body.reason ? ` — ${body.reason}` : ""}.`,
      appointment_id: newAppt.id,
    });
  }

  return NextResponse.json({ original_id: orig.id, new_id: newAppt.id }, { status: 201 });
}
