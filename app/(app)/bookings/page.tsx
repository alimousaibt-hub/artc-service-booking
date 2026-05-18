"use client";

import { AppLayout } from "@/components/app-layout";
import { AppointmentForm } from "@/components/booking/appointment-form";
import { CancelModal } from "@/components/booking/cancel-modal";
import { RescheduleModal } from "@/components/booking/reschedule-modal";
import { AppointmentCard } from "@/components/booking/appointment-card";
import { CustomerSearch } from "@/components/booking/customer-search";
import { createClient } from "@/lib/supabase/client";
import {
  getDaysInMonth, toDateString, DAYS_OF_WEEK, MONTHS,
  formatDateDisplay, STATUS_COLORS,
} from "@/lib/booking-helpers";
import { Branch, Profile } from "@/types/database";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
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

export default function BookingsPage() {
  const supabase = createClient();
  const today = new Date();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string>(toDateString(today));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);

  // Load current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase.from("profiles").select("*").eq("id", data.user.id).single()
        .then(({ data: p }) => setProfile(p as Profile));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load branches
  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((data: Branch[]) => {
        setBranches(data);
        if (data.length > 0) setSelectedBranch(data[0]);
      });
  }, []);

  // Load appointments for selected month + branch
  const loadAppointments = useCallback(async () => {
    if (!selectedBranch) return;
    setLoadingAppts(true);
    try {
      const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
      const res = await fetch(
        `/api/appointments?month=${monthStr}&branch_id=${selectedBranch.id}`
      );
      if (!res.ok) {
        console.error("Appointments API error:", res.status, res.statusText);
        setAppointments([]);
        return;
      }
      const text = await res.text();
      if (!text) { setAppointments([]); return; }
      const data = JSON.parse(text);
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("loadAppointments failed:", err);
      setAppointments([]);
    } finally {
      setLoadingAppts(false);
    }
  }, [selectedBranch, year, month]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  // Calendar grid
  const days = getDaysInMonth(year, month);
  const firstDayOfWeek = days[0].getDay(); // 0=Sun

  // Appointment counts per date (for calendar dots)
  const countsByDate: Record<string, number> = {};
  appointments.forEach((a) => {
    if (!a.is_ghost) {
      countsByDate[a.appointment_date] = (countsByDate[a.appointment_date] || 0) + 1;
    }
  });

  // Selected day appointments
  const dayAppointments = appointments.filter(
    (a) => a.appointment_date === selectedDate
  );

  const canCreate = profile && ["crm_agent", "admin", "super_admin"].includes(profile.role);
  const canEdit = profile && ["crm_agent", "admin", "super_admin"].includes(profile.role);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const handleSearchNavigate = (date: string, branchId?: string) => {
    const d = new Date(date + "T00:00:00");
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelectedDate(date);
    // Switch to the correct branch so the appointment is visible
    if (branchId) {
      const target = branches.find((b) => b.id === branchId);
      if (target) setSelectedBranch(target);
    }
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-73px)] flex-col gap-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
              Bookings
            </h1>
            {/* Branch tabs */}
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBranch(b)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedBranch?.id === b.id
                      ? "bg-brand-600 text-white"
                      : "bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {b.code}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CustomerSearch onNavigate={handleSearchNavigate} />
            {canCreate && (
              <button
                onClick={() => { setEditingAppt(null); setShowForm(true); }}
                className="btn btn-primary flex items-center gap-2 whitespace-nowrap"
              >
                <Plus size={16} />
                New appointment
              </button>
            )}
          </div>
        </div>

        {/* Body: calendar + day panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: mini calendar */}
          <div className="hidden w-72 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 lg:flex">
            {/* Month navigator */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={prevMonth}
                className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                {MONTHS[month]} {year}
              </span>
              <button
                onClick={nextMonth}
                className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* DOW headers */}
            <div className="grid grid-cols-7 border-b border-slate-100 px-2 py-2 dark:border-slate-800">
              {DAYS_OF_WEEK.map((d) => (
                <div key={d} className="text-center text-[11px] font-medium text-slate-400">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-y-1 px-2 py-2">
              {/* Empty cells before first day */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {days.map((day) => {
                const ds = toDateString(day);
                const isToday = ds === toDateString(today);
                const isSelected = ds === selectedDate;
                const count = countsByDate[ds] || 0;
                return (
                  <button
                    key={ds}
                    onClick={() => setSelectedDate(ds)}
                    className={`relative flex h-9 w-full flex-col items-center justify-center rounded-lg text-sm transition-colors ${
                      isSelected
                        ? "bg-brand-600 text-white"
                        : isToday
                          ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-900/20 dark:text-brand-400"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {day.getDate()}
                    {count > 0 && (
                      <span
                        className={`mt-0.5 h-1 w-1 rounded-full ${
                          isSelected ? "bg-white/70" : "bg-brand-500"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-auto border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <p className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                Has appointments
              </p>
            </div>
          </div>

          {/* Right: day panel */}
          <div className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
            {/* Day header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-900">
              <div>
                <h2 className="font-semibold text-slate-950 dark:text-slate-50">
                  {formatDateDisplay(selectedDate)}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {dayAppointments.filter((a) => !a.is_ghost).length} appointment
                  {dayAppointments.filter((a) => !a.is_ghost).length !== 1 ? "s" : ""}
                  {loadingAppts && " · loading..."}
                </p>
              </div>
              {/* Mobile month nav */}
              <div className="flex items-center gap-1 lg:hidden">
                <button onClick={prevMonth} className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {MONTHS[month].slice(0, 3)} {year}
                </span>
                <button onClick={nextMonth} className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Appointments list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingAppts ? (
                <div className="flex h-32 items-center justify-center text-sm text-slate-400">
                  Loading...
                </div>
              ) : dayAppointments.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2 text-slate-400">
                  <div className="text-3xl">📋</div>
                  <p className="text-sm">No appointments for this day</p>
                  {canCreate && (
                    <button
                      onClick={() => { setEditingAppt(null); setShowForm(true); }}
                      className="mt-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                    >
                      + Add appointment
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Group by advisor */}
                  {(() => {
                    const grouped: Record<string, Appointment[]> = {};
                    dayAppointments.forEach((a) => {
                      const key = a.advisor?.name || "Unassigned";
                      if (!grouped[key]) grouped[key] = [];
                      grouped[key].push(a);
                    });

                    return Object.entries(grouped).map(([advisorName, appts]) => (
                      <div key={advisorName}>
                        <div className="mb-2 flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {advisorName}
                          </h3>
                          <span className="text-xs text-slate-400">
                            {appts.filter((a) => !a.is_ghost).length} appt
                            {appts.filter((a) => !a.is_ghost).length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="space-y-2 mb-4">
                          {appts.map((a) => (
                            <AppointmentCard
                              key={a.id}
                              appointment={a}
                              canEdit={!!canEdit}
                              canDeleteGhost={profile?.role === "admin" || profile?.role === "super_admin"}
                              onEdit={() => { setEditingAppt(a); setShowForm(true); }}
                              onCancel={() => setCancelAppt(a)}
                              onReschedule={() => setRescheduleAppt(a)}
                              onGoToRescheduled={(newId) => {
                                const target = appointments.find(ap => ap.id === newId);
                                if (target) setSelectedDate(target.appointment_date);
                              }}
                              onDeleteGhost={async () => {
                                if (!confirm("Permanently delete this ghost record?")) return;
                                const res = await fetch(`/api/appointments/${a.id}`, { method: "DELETE" });
                                if (res.ok) {
                                  loadAppointments();
                                } else {
                                  const d = await res.json().catch(() => ({}));
                                  alert("Delete failed: " + (d.error || res.status));
                                }
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel modal */}
      {cancelAppt && (
        <CancelModal
          appointment={cancelAppt}
          onClose={() => setCancelAppt(null)}
          onSuccess={() => { setCancelAppt(null); loadAppointments(); }}
        />
      )}

      {/* Reschedule modal */}
      {rescheduleAppt && (
        <RescheduleModal
          appointment={rescheduleAppt}
          branches={branches}
          onClose={() => setRescheduleAppt(null)}
          onSuccess={(newDate, newBranchId) => {
            setRescheduleAppt(null);
            // Switch to new branch if inter-branch reschedule
            if (newBranchId && newBranchId !== selectedBranch?.id) {
              const target = branches.find(b => b.id === newBranchId);
              if (target) setSelectedBranch(target);
            }
            const d = new Date(newDate + "T00:00:00");
            setYear(d.getFullYear());
            setMonth(d.getMonth());
            setSelectedDate(newDate);
            loadAppointments();
          }}
        />
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <AppointmentForm
          mode={editingAppt ? "edit" : "create"}
          initialDate={selectedDate}
          initialBranchId={selectedBranch?.id}
          branches={branches}
          existingAppointment={editingAppt ?? undefined}
          onClose={() => { setShowForm(false); setEditingAppt(null); }}
          onSuccess={() => {
            setShowForm(false);
            setEditingAppt(null);
            loadAppointments();
          }}
        />
      )}
    </AppLayout>
  );
}
