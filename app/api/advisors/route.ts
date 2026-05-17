import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase.from("profiles").select("role, status").eq("id", user.id).single();
  if (p?.status !== "active") return null;
  return p;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branch_id");
  const date = searchParams.get("date");
  const unassigned = searchParams.get("unassigned");

  if (unassigned === "true") {
    const { data: assignedProfiles } = await supabase
      .from("service_advisors").select("profile_id").not("profile_id", "is", null);
    const assignedIds = (assignedProfiles || []).map((a) => a.profile_id).filter(Boolean);
    let query = supabase.from("profiles").select("id, full_name, email")
      .eq("role", "advisor").eq("status", "active").order("full_name");
    if (assignedIds.length > 0) query = query.not("id", "in", `(${assignedIds.join(",")})`);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  let query = supabase.from("service_advisors")
    .select("*, profile:profiles!service_advisors_profile_id_fkey(id, full_name, email)")
    .eq("is_active", true).order("name");
  if (branchId) query = query.eq("branch_id", branchId);

  const { data: advisors, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (date && advisors) {
    const advisorIds = advisors.map((a) => a.id);
    const { data: counts } = await supabase.from("appointments").select("advisor_id")
      .in("advisor_id", advisorIds).eq("appointment_date", date)
      .eq("is_ghost", false).in("status", ["booked", "confirmed"]);
    const { data: overrides } = await supabase.from("capacity_overrides")
      .select("advisor_id, capacity").in("advisor_id", advisorIds).eq("date", date);
    const countMap: Record<string, number> = {};
    counts?.forEach((c) => { countMap[c.advisor_id] = (countMap[c.advisor_id] || 0) + 1; });
    const overrideMap: Record<string, number> = {};
    overrides?.forEach((o) => { overrideMap[o.advisor_id] = o.capacity; });
    return NextResponse.json(advisors.map((a) => ({
      ...a,
      booked_count: countMap[a.id] || 0,
      effective_capacity: overrideMap[a.id] ?? a.daily_capacity,
      is_full: (countMap[a.id] || 0) >= (overrideMap[a.id] ?? a.daily_capacity),
    })));
  }
  return NextResponse.json(advisors);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const p = await requireAdmin(supabase);
  if (!p || !["admin", "super_admin"].includes(p.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { profile_id, branch_id, daily_capacity } = body;
  const { data: user } = await supabase.from("profiles").select("full_name, email").eq("id", profile_id).single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const { data: existing } = await supabase.from("service_advisors").select("id").eq("profile_id", profile_id).maybeSingle();
  if (existing) return NextResponse.json({ error: "Advisor already assigned to a branch" }, { status: 409 });
  const { data, error } = await supabase.from("service_advisors")
    .insert({ profile_id, branch_id, name: user.full_name || user.email, daily_capacity: daily_capacity || 10, is_active: true })
    .select("*, profile:profiles!service_advisors_profile_id_fkey(id, full_name, email)").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const p = await requireAdmin(supabase);
  if (!p || !["admin", "super_admin"].includes(p.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { id, ...updates } = body;
  const { data, error } = await supabase.from("service_advisors").update(updates).eq("id", id)
    .select("*, profile:profiles!service_advisors_profile_id_fkey(id, full_name, email)").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const p = await requireAdmin(supabase);
  if (!p || !["admin", "super_admin"].includes(p.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await supabase.from("service_advisors").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

