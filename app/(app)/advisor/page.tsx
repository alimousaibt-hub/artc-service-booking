"use client";

import { AppLayout } from "@/components/app-layout";
import { AppointmentCard } from "@/components/booking/appointment-card";
import { createClient } from "@/lib/supabase/client";
import { toDateString, formatDateDisplay, MONTHS, getDaysInMonth, DAYS_OF_WEEK, STATUS_COLORS } from "@/lib/booking-helpers";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  plate_number: string | null;
  appointment_date: string;
  time_slot: string | null;
  status: string;
  is_ghost: boolean;
  ghost_reason: string | null;
  rescheduled_to_id: string | null;
  notes: string | null;
  branch_id: string;
  advisor_id: string;
  branch: { id: string; name: string; code: string } | null;
  advisor: { id: string; name: string } | null;
  booker: { id: string; full_name: string | null; email: string } | null;
}

interface AdvisorSlot {
  id: string;
  name: string;
  branch: { name: string; code: string } | null;
}

export default function AdvisorDashboardPage() {
  const supabase = createClient();
  const today = new Date();

  const [advisorSlot, setAdvisorSlot] = useState<AdvisorSlot | null>(null);
  const [notLinked, setNotLinked] = useState(false);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(toDateString(today));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Load advisor slot for this user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase
        .from("service_advisors")
        .select("id, name, branch:branches(name, code)")
        .eq("profile_id", data.user.id)
        .eq("is_active", true)
        .single()
        .then(({ data: slot }) => {
          if (slot) {
            setAdvisorSlot(slot as AdvisorSlot);
          } else {
            setNotLinked(true);
            setLoading(false);
          }
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load appointments for this advisor for the selected month
  const loadAppointments = useCallback(async () => {
    if (!advisorSlot) return;
    setLoading(true);
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    const res = await fetch(
      `/api/appointments?month=${monthStr}&advisor_id=${advisorSlot.id}`
    );
    const data = await res.json();
    setAppointments(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [advisorSlot, year, month]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  const days = getDaysInMonth(year, month);
  const firstDayOfWeek = days[0].getDay();

  const countsByDate: Record<string, number> = {};
  appointments.forEach((a) => {
    if (!a.is_ghost) {
      countsByDate[a.appointment_date] = (countsByDate[a.appointment_date] || 0) + 1;
    }
  });

  const dayAppointments = appointments.filter((a) => a.appointment_date === selectedDate);

  // Today's stats
  const todayStr = toDateString(today);
  const todayAppts = appointments.filter((a) => a.appointment_date === todayStr && !a.is_ghost);
  const todayBooked = todayAppts.filter((a) => a.status === "booked").length;
  const todayConfirmed = todayAppts.filter((a) => a.status === "confirmed").length;
  const todayDone = todayAppts.filter((a) => a.status === "completed").length;

  if (notLinked) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
          <div className="text-4xl opacity-30">🔗</div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
            Account not linked to an advisor slot
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            Your account has the advisor role but hasn&apos;t been linked to a
            service advisor yet. Ask your admin to link you in{" "}
            <strong>Admin → Advisors</strong>.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-73px)] flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-xl font-bold text-slate-950 dark:text-slate-50">
                My appointments
              </h1>
              {advisorSlot && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {advisorSlot.name} · {advisorSlot.branch?.name || advisorSlot.branch?.code}
                </p>
              )}
            </div>

            {/* Today's quick stats */}
            <div className="flex gap-3">
              {[
                { label: "Booked", value: todayBooked, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
                { label: "Confirmed", value: todayConfirmed, color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
                { label: "Done", value: todayDone, color: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300" },
              ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-lg px-3 py-2 text-center ${color}`}>
                  <div className="text-lg font-bold leading-none">{value}</div>
                  <div className="text-xs mt-1">{label} today</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: calendar */}
          <div className="hidden w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 lg:flex">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={() => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); }}
                className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                {MONTHS[month]} {year}
              </span>
              <button
                onClick={() => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); }}
                className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 px-2 py-2">
              {DAYS_OF_WEEK.map((d) => (
                <div key={d} className="text-center text-[11px] font-medium text-slate-400">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1 px-2 py-1">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
              {days.map((day) => {
                const ds = toDateString(day);
                const isToday = ds === todayStr;
                const isSelected = ds === selectedDate;
                const count = countsByDate[ds] || 0;
                return (
                  <button key={ds} onClick={() => setSelectedDate(ds)}
                    className={`relative flex h-8 w-full flex-col items-center justify-center rounded-lg text-xs transition-colors ${
                      isSelected
                        ? "bg-brand-600 text-white"
                        : isToday
                          ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-900/20 dark:text-brand-400"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}>
                    {day.getDate()}
                    {count > 0 && (
                      <span className={`mt-0.5 h-1 w-1 rounded-full ${isSelected ? "bg-white/70" : "bg-brand-500"}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: day panel */}
          <div className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
            <div className="border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-900">
              <h2 className="font-semibold text-slate-950 dark:text-slate-50">
                {formatDateDisplay(selectedDate)}
              </h2>
              <p className="text-sm text-slate-500">
                {dayAppointments.filter((a) => !a.is_ghost).length} appointment
                {dayAppointments.filter((a) => !a.is_ghost).length !== 1 ? "s" : ""}
                {loading && " · loading..."}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex h-32 items-center justify-center text-sm text-slate-400">Loading...</div>
              ) : dayAppointments.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2 text-slate-400">
                  <div className="text-3xl">📋</div>
                  <p className="text-sm">No appointments for this day</p>
                </div>
              ) : (
                dayAppointments.map((a) => (
                  <AppointmentCard
                    key={a.id}
                    appointment={a}
                    canEdit={false}
                    onEdit={() => {}}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
