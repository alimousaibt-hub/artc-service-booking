"use client";

import { AppLayout } from "@/components/app-layout";
import { useEffect, useState } from "react";
import { MONTHS } from "@/lib/booking-helpers";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

interface Totals {
  total: number; booked: number; confirmed: number; completed: number;
  no_show: number; cancelled: number; rescheduled: number;
}
interface BranchStat { name: string; code: string; total: number; completed: number; no_show: number; cancelled: number; }
interface AdvisorStat { name: string; total: number; completed: number; no_show: number; }
interface DayStat { date: string; count: number; }

export default function AnalyticsPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-indexed
  const [totals, setTotals] = useState<Totals | null>(null);
  const [byBranch, setByBranch] = useState<BranchStat[]>([]);
  const [byAdvisor, setByAdvisor] = useState<AdvisorStat[]>([]);
  const [byDay, setByDay] = useState<DayStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?month=${monthStr}`)
      .then(r => r.json())
      .then(data => {
        setTotals(data.totals);
        setByBranch(data.byBranch || []);
        setByAdvisor(data.byAdvisor || []);
        setByDay(data.byDay || []);
        setLoading(false);
      });
  }, [monthStr]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const handleExport = async () => {
    setExporting(true);
    const res = await fetch(`/api/export?month=${monthStr}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bookings-${monthStr}.csv`; a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  const maxDay = Math.max(...byDay.map(d => d.count), 1);

  const statCard = (label: string, value: number, color: string) => (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm mt-1 opacity-80">{label}</p>
    </div>
  );

  const pct = (a: number, b: number) => b === 0 ? "0%" : `${Math.round(a / b * 100)}%`;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">Analytics</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Booking performance overview</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Month navigator */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button onClick={prevMonth} className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-2 text-sm font-medium text-slate-950 dark:text-slate-50 min-w-[130px] text-center">
                {MONTHS[month - 1]} {year}
              </span>
              <button onClick={nextMonth} className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                <ChevronRight size={16} />
              </button>
            </div>
            <button onClick={handleExport} disabled={exporting}
              className="btn btn-primary flex items-center gap-2">
              <Download size={16} />
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="card p-12 text-center text-slate-500">Loading analytics...</div>
        ) : totals ? (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statCard("Total bookings", totals.total, "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 text-slate-950 dark:text-slate-50")}
              {statCard("Completed", totals.completed, "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 text-green-900 dark:text-green-200")}
              {statCard("No shows", totals.no_show, "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 text-red-900 dark:text-red-200")}
              {statCard("Cancelled", totals.cancelled, "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20 text-orange-900 dark:text-orange-200")}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statCard("Booked", totals.booked, "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200")}
              {statCard("Confirmed", totals.confirmed, "border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-900/20 text-teal-900 dark:text-teal-200")}
              {statCard("Rescheduled", totals.rescheduled, "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20 text-purple-900 dark:text-purple-200")}
              {statCard("No-show rate", 0, "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-slate-950 dark:text-slate-50")}
            </div>

            {/* Daily chart */}
            {byDay.length > 0 && (
              <div className="card">
                <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50 mb-4">
                  Daily bookings — {MONTHS[month - 1]} {year}
                </h2>
                <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2">
                  {byDay.map(({ date, count }) => (
                    <div key={date} className="flex flex-col items-center gap-1 flex-1 min-w-[20px]">
                      <span className="text-[10px] text-slate-500">{count}</span>
                      <div
                        className="w-full rounded-t bg-brand-500 dark:bg-brand-600 transition-all"
                        style={{ height: `${(count / maxDay) * 100}%`, minHeight: 4 }}
                        title={`${date}: ${count}`}
                      />
                      <span className="text-[9px] text-slate-400">{Number(date.split("-")[2])}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              {/* By branch */}
              <div className="card">
                <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50 mb-4">By branch</h2>
                {byBranch.length === 0 ? (
                  <p className="text-sm text-slate-500">No data</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="text-left py-2 font-medium text-slate-600 dark:text-slate-400">Branch</th>
                        <th className="text-right py-2 font-medium text-slate-600 dark:text-slate-400">Total</th>
                        <th className="text-right py-2 font-medium text-slate-600 dark:text-slate-400">Done</th>
                        <th className="text-right py-2 font-medium text-slate-600 dark:text-slate-400">No-show</th>
                        <th className="text-right py-2 font-medium text-slate-600 dark:text-slate-400">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {byBranch.map(b => (
                        <tr key={b.code}>
                          <td className="py-2 font-medium text-slate-950 dark:text-slate-50">
                            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mr-2">{b.code}</span>
                            {b.name}
                          </td>
                          <td className="py-2 text-right">{b.total}</td>
                          <td className="py-2 text-right text-green-700 dark:text-green-400">{b.completed}</td>
                          <td className="py-2 text-right text-red-600 dark:text-red-400">{b.no_show}</td>
                          <td className="py-2 text-right text-xs text-slate-500">{pct(b.no_show, b.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* By advisor */}
              <div className="card">
                <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50 mb-4">By advisor</h2>
                {byAdvisor.length === 0 ? (
                  <p className="text-sm text-slate-500">No data</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="text-left py-2 font-medium text-slate-600 dark:text-slate-400">Advisor</th>
                        <th className="text-right py-2 font-medium text-slate-600 dark:text-slate-400">Total</th>
                        <th className="text-right py-2 font-medium text-slate-600 dark:text-slate-400">Done</th>
                        <th className="text-right py-2 font-medium text-slate-600 dark:text-slate-400">No-show</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {byAdvisor.map(a => (
                        <tr key={a.name}>
                          <td className="py-2 font-medium text-slate-950 dark:text-slate-50">{a.name}</td>
                          <td className="py-2 text-right">{a.total}</td>
                          <td className="py-2 text-right text-green-700 dark:text-green-400">{a.completed}</td>
                          <td className="py-2 text-right text-red-600 dark:text-red-400">{a.no_show}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="card p-12 text-center text-slate-500">No data for this month</div>
        )}
      </div>
    </AppLayout>
  );
}
