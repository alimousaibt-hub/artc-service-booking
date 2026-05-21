import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branch_id");
  const month = searchParams.get("month");

  let query = supabase
    .from("holidays")
    .select("id, date, name, branch_id, branch:branches(name, code)")
    .order("date");

  if (branchId) query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
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
    .from("holidays")
    .insert({ date: body.date, name: body.name, branch_id: body.branch_id || null, created_by: user.id })
    .select("id, date, name, branch_id, branch:branches(name, code)")
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

  const { error } = await supabase.from("holidays").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
