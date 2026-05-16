import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const term = `%${q}%`;

  const { data, error } = await supabase
    .from("appointments")
    .select(`
      id,
      customer_name,
      customer_phone,
      plate_number,
      appointment_date,
      status,
      is_ghost,
      branch:branches(id, name, code),
      advisor:service_advisors(id, name)
    `)
    .or(`customer_name.ilike.${term},customer_phone.ilike.${term},plate_number.ilike.${term}`)
    .eq("is_ghost", false)
    .order("appointment_date", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
