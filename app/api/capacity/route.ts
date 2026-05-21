import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const advisorId = searchParams.get("advisor_id");
  const month = searchParams.get("month");

  let query = supabase
    .from("capacity_overrides")
    .select("id, advisor_id, date, capacity, reason, advisor:service_advisors(name, branch:branches(code))")
    .order("date");

  if (advisorId) query = query.eq("advisor_id", advisorId);
  if (month) {
    const [y, m] = month.split("-");
    query = query
      .gte("date", `${y}-${m}-01`)
      .lte("date", new Date(Number(y), Number(m), 0).toISOString().split("T")[0]);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin","super_admin"].includes(p?.role ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { data, error } = await supabase
    .from("capacity_overrides")
    .upsert(
      { advisor_id: body.advisor_id, date: body.date, capacity: body.capacity, reason: body.reason || null, created_by: user.id },
      { onConflict: "advisor_id,date" }
    )
    .select("id, advisor_id, date, capacity, reason")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin","super_admin"].includes(p?.role ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase.from("capacity_overrides").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
