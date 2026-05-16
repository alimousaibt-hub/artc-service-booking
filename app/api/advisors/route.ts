import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branch_id");
  const date = searchParams.get("date"); // optional: get booking counts for this date

  let query = supabase
    .from("service_advisors")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (branchId) query = query.eq("branch_id", branchId);

  const { data: advisors, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If date provided, attach booking count per advisor for that date
  if (date && advisors) {
    const advisorIds = advisors.map((a) => a.id);

    const { data: counts } = await supabase
      .from("appointments")
      .select("advisor_id")
      .in("advisor_id", advisorIds)
      .eq("appointment_date", date)
      .eq("is_ghost", false)
      .in("status", ["booked", "confirmed"]);

    const { data: overrides } = await supabase
      .from("capacity_overrides")
      .select("advisor_id, capacity")
      .in("advisor_id", advisorIds)
      .eq("date", date);

    const countMap: Record<string, number> = {};
    counts?.forEach((c) => {
      countMap[c.advisor_id] = (countMap[c.advisor_id] || 0) + 1;
    });

    const overrideMap: Record<string, number> = {};
    overrides?.forEach((o) => { overrideMap[o.advisor_id] = o.capacity; });

    const enriched = advisors.map((a) => ({
      ...a,
      booked_count: countMap[a.id] || 0,
      effective_capacity: overrideMap[a.id] ?? a.daily_capacity,
      is_full: (countMap[a.id] || 0) >= (overrideMap[a.id] ?? a.daily_capacity),
    }));

    return NextResponse.json(enriched);
  }

  return NextResponse.json(advisors);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  if (!["admin", "super_admin"].includes(profile?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("service_advisors")
    .insert({
      branch_id: body.branch_id,
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      daily_capacity: body.daily_capacity || 10,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  if (!["admin", "super_admin"].includes(profile?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, ...updates } = body;
  const { data, error } = await supabase
    .from("service_advisors").update(updates).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
