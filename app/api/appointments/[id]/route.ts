import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";


export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await req.json();
  const { action, reason } = body; // action: confirm | complete | no_show | cancel

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role, status, full_name").eq("id", user.id).single();
  if (profile?.status !== "active") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: appt } = await supabase
    .from("appointments").select("*").eq("id", id).single();
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date().toISOString();
  let updates: Record<string, unknown> = {};

  if (action === "confirm") {
    updates = { status: "confirmed", confirmed_by: user.id, confirmed_at: now };
  } else if (action === "complete") {
    updates = { status: "completed", completed_at: now };
  } else if (action === "no_show") {
    updates = { status: "no_show", no_showed_at: now };
    // Insert into no_shows table
    await supabase.from("no_shows").insert({
      appointment_id: id,
      customer_name: appt.customer_name,
      customer_phone: appt.customer_phone,
      plate_number: appt.plate_number,
      branch_id: appt.branch_id,
      no_show_date: appt.appointment_date,
      marked_by: user.id,
    });
  } else if (action === "cancel") {
    updates = {
      status: "cancelled",
      cancelled_at: now,
      cancelled_by: user.id,
      cancel_reason: reason || null,
      is_ghost: true,
      ghost_reason: "cancelled",
    };
    // Notify original creator if someone else cancelled
    if (appt.booked_by && appt.booked_by !== user.id) {
      await supabase.from("notifications").insert({
        user_id: appt.booked_by,
        type: "appointment_cancelled",
        title: "Your appointment was cancelled",
        body: `${appt.customer_name} on ${appt.appointment_date} was cancelled${reason ? ` — ${reason}` : ""}.`,
        appointment_id: id,
      });
    }
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("appointments").update(updates).eq("id", id)
    .select(`*, branch:branches(id,name,code), advisor:service_advisors(id,name),
             booker:profiles!appointments_booked_by_fkey(id,full_name,email)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}


export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!["admin","super_admin"].includes(profile?.role))
    return NextResponse.json({ error: "Only admins can delete ghost records" }, { status: 403 });

  // Only allow deleting ghost records
  const { data: appt } = await supabase
    .from("appointments").select("is_ghost").eq("id", id).single();
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!appt.is_ghost)
    return NextResponse.json({ error: "Only ghost records can be deleted" }, { status: 400 });

  // Null out any foreign key references pointing to this record
  // before deleting — otherwise Postgres blocks it
  await supabase
    .from("appointments")
    .update({ rescheduled_from_id: null })
    .eq("rescheduled_from_id", id);

  await supabase
    .from("appointments")
    .update({ rescheduled_to_id: null })
    .eq("rescheduled_to_id", id);

  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
