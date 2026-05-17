import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const branchId = searchParams.get("branch_id");
    const month = searchParams.get("month");
    const advisorId = searchParams.get("advisor_id");

    let query = supabase
      .from("appointments")
      .select(`
        *,
        branch:branches(id, name, code),
        advisor:service_advisors(id, name),
        booker:profiles!appointments_booked_by_fkey(id, full_name, email)
      `)
      .order("appointment_date", { ascending: true })
      .order("time_slot", { ascending: true });

    if (date) query = query.eq("appointment_date", date);
    if (branchId) query = query.eq("branch_id", branchId);
    if (advisorId) query = query.eq("advisor_id", advisorId);
    if (month) {
      const [year, m] = month.split("-");
      const start = `${year}-${m}-01`;
      const lastDay = new Date(Number(year), Number(m), 0).getDate();
      const end = `${year}-${m}-${String(lastDay).padStart(2, "0")}`;
      query = query.gte("appointment_date", start).lte("appointment_date", end);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("GET /api/appointments error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role, status").eq("id", user.id).single();

    if (profile?.status !== "active")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!["crm_agent", "admin", "super_admin"].includes(profile?.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Capacity check
    const { data: existingAppts } = await supabase
      .from("appointments")
      .select("id, time_slot")
      .eq("advisor_id", body.advisor_id)
      .eq("appointment_date", body.appointment_date)
      .eq("is_ghost", false)
      .in("status", ["booked", "confirmed"]);

    const { data: advisor } = await supabase
      .from("service_advisors").select("daily_capacity").eq("id", body.advisor_id).single();
    const { data: override } = await supabase
      .from("capacity_overrides").select("capacity")
      .eq("advisor_id", body.advisor_id).eq("date", body.appointment_date).single();

    const capacity = override?.capacity ?? advisor?.daily_capacity ?? 10;
    if ((existingAppts?.length ?? 0) >= capacity)
      return NextResponse.json({ error: "Advisor is fully booked for this date" }, { status: 409 });

    if (body.time_slot) {
      const slotTaken = existingAppts?.some((a) => a.time_slot === body.time_slot);
      if (slotTaken)
        return NextResponse.json({ error: `Time slot ${body.time_slot} is already booked for this advisor` }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("appointments")
      .insert({
        customer_name: body.customer_name,
        customer_phone: body.customer_phone || null,
        plate_number: body.plate_number || null,
        branch_id: body.branch_id,
        advisor_id: body.advisor_id,
        appointment_date: body.appointment_date,
        time_slot: body.time_slot || null,
        notes: body.notes || null,
        booked_by: user.id,
        status: "booked",
      })
      .select(`
        *,
        branch:branches(id, name, code),
        advisor:service_advisors(id, name),
        booker:profiles!appointments_booked_by_fkey(id, full_name, email)
      `)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/appointments error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { id, fields, log_edits } = body;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: current } = await supabase
      .from("appointments").select("*").eq("id", id).single();
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data, error } = await supabase
      .from("appointments").update(fields).eq("id", id)
      .select(`
        *,
        branch:branches(id, name, code),
        advisor:service_advisors(id, name),
        booker:profiles!appointments_booked_by_fkey(id, full_name, email)
      `)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (log_edits && Array.isArray(log_edits)) {
      const editRows = log_edits
        .filter((e: { field: string; old: string; new: string }) =>
          String(current[e.field as keyof typeof current] ?? "") !== e.new
        )
        .map((e: { field: string; old: string; new: string }) => ({
          appointment_id: id,
          edited_by: user.id,
          field_changed: e.field,
          old_value: String(current[e.field as keyof typeof current] ?? ""),
          new_value: e.new,
        }));
      if (editRows.length > 0) await supabase.from("appointment_edits").insert(editRows);
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/appointments error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
