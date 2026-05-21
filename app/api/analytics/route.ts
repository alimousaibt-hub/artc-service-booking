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
  const [year, m] = month.split("-");
  const startDate = `${year}-${m}-01`;
  const endDate = new Date(Number(year), Number(m), 0).toISOString().split("T")[0];

  const { data: appts } = await supabase
    .from("appointments")
    .select("id, status, appointment_date, is_ghost, branch:branches(id,name,code), advisor:service_advisors(id,name)")
    .gte("appointment_date", startDate)
    .lte("appointment_date", endDate);

  const all = appts || [];
  const real = all.filter((a: {is_ghost: boolean}) => !a.is_ghost);

  const totals = {
    total:       real.length,
    booked:      real.filter((a: {status: string}) => a.status === "booked").length,
    confirmed:   real.filter((a: {status: string}) => a.status === "confirmed").length,
    completed:   real.filter((a: {status: string}) => a.status === "completed").length,
    no_show:     real.filter((a: {status: string}) => a.status === "no_show").length,
    cancelled:   all.filter((a: {is_ghost: boolean; status: string}) => a.is_ghost && a.status === "cancelled").length,
    rescheduled: all.filter((a: {is_ghost: boolean; status: string}) => a.is_ghost && a.status === "rescheduled").length,
  };

  type BranchStat = { name: string; code: string; total: number; completed: number; no_show: number; cancelled: number };
  const branchMap: Record<string, BranchStat> = {};
  real.forEach((a: {status: string; branch: {id: string; name: string; code: string} | null}) => {
    const b = a.branch; if (!b) return;
    if (!branchMap[b.id]) branchMap[b.id] = { name: b.name, code: b.code, total: 0, completed: 0, no_show: 0, cancelled: 0 };
    branchMap[b.id].total++;
    if (a.status === "completed") branchMap[b.id].completed++;
    if (a.status === "no_show")   branchMap[b.id].no_show++;
  });
  all.filter((a: {is_ghost: boolean; status: string}) => a.is_ghost && a.status === "cancelled").forEach((a: {branch: {id: string} | null}) => {
    const b = a.branch; if (b && branchMap[b.id]) branchMap[b.id].cancelled++;
  });
  const byBranch = Object.values(branchMap).sort((a, b) => b.total - a.total);

  type AdvisorStat = { name: string; total: number; completed: number; no_show: number };
  const advisorMap: Record<string, AdvisorStat> = {};
  real.forEach((a: {status: string; advisor: {id: string; name: string} | null}) => {
    const adv = a.advisor; if (!adv) return;
    if (!advisorMap[adv.id]) advisorMap[adv.id] = { name: adv.name, total: 0, completed: 0, no_show: 0 };
    advisorMap[adv.id].total++;
    if (a.status === "completed") advisorMap[adv.id].completed++;
    if (a.status === "no_show")   advisorMap[adv.id].no_show++;
  });
  const byAdvisor = Object.values(advisorMap).sort((a, b) => b.total - a.total).slice(0, 15);

  const dayMap: Record<string, number> = {};
  real.forEach((a: {appointment_date: string}) => { dayMap[a.appointment_date] = (dayMap[a.appointment_date] || 0) + 1; });
  const byDay = Object.entries(dayMap).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({ totals, byBranch, byAdvisor, byDay, month });
}
