import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role, status").eq("id", user.id).single();
  if (!["admin", "super_admin"].includes(profile?.role ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);
  const branchId = searchParams.get("branch_id");

  const [year, m] = month.split("-");
  const startDate = `${year}-${m}-01`;
  const endDate = new Date(Number(year), Number(m), 0).toISOString().split("T")[0];

  let query = supabase
    .from("appointments")
    .select(`
      id, customer_name, customer_phone, plate_number,
      appointment_date, time_slot, status, is_ghost, ghost_reason,
      cancel_reason, reschedule_reason, notes, created_at,
      branch:branches(name, code),
      advisor:service_advisors(name),
      booker:profiles!appointments_booked_by_fkey(full_name, email)
    `)
    .gte("appointment_date", startDate)
    .lte("appointment_date", endDate)
    .order("appointment_date")
    .order("time_slot");

  if (branchId) query = query.eq("branch_id", branchId);

  const { data: appts, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build CSV
  const headers = [
    "Date","Time","Customer Name","Phone","Plate","Branch","Advisor",
    "Status","Ghost","Ghost Reason","Cancel Reason","Reschedule Reason",
    "Notes","Booked By","Created At"
  ];

  const escape = (v: string | null | undefined) => {
    if (v == null) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const rows = (appts || []).map((a) => {
    const branch = a.branch as { name: string; code: string } | null;
    const advisor = a.advisor as { name: string } | null;
    const booker = a.booker as { full_name: string | null; email: string } | null;
    return [
      escape(a.appointment_date),
      escape(a.time_slot),
      escape(a.customer_name),
      escape(a.customer_phone),
      escape(a.plate_number),
      escape(branch?.name),
      escape(advisor?.name),
      escape(a.status),
      a.is_ghost ? "Yes" : "No",
      escape(a.ghost_reason),
      escape(a.cancel_reason),
      escape(a.reschedule_reason),
      escape(a.notes),
      escape(booker?.full_name || booker?.email),
      escape(a.created_at?.slice(0, 10)),
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const filename = `bookings-${month}${branchId ? "-branch" : ""}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
