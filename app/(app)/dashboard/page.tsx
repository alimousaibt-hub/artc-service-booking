"use client";

import { AppLayout } from "@/components/app-layout";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Profile } from "@/types/database";

export default function DashboardPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();
        setProfile(profileData as Profile);
      }
    };

    loadProfile();
  }, [supabase]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-950 dark:text-slate-50">
            Welcome back, {profile?.full_name || "User"}!
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Phase 1 foundation is ready. Phase 2 (booking calendar) coming next
            session.
          </p>
        </div>

        {/* Phase 1 Checklist */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
              ✓ Phase 1 Complete
            </h2>
            <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <p className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Authentication
                (Email + Microsoft)
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-600">✓</span> User approval workflow
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Role-based access
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Dark / light mode
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Responsive layout
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Admin user panel
              </p>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
              ✓ Phase 2 Complete
            </h2>
            <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <p className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Branch management
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Service advisors
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Booking calendar
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Create / edit appointments
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Customer search
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Ghost records
              </p>
            </div>
            <div className="mt-4">
              <a href="/bookings" className="btn btn-primary inline-flex text-sm">Open Bookings →</a>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
            Your account
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Email
              </p>
              <p className="font-medium text-slate-950 dark:text-slate-50">
                {profile?.email}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Role</p>
              <p className="font-medium text-slate-950 dark:text-slate-50">
                {profile?.role.replace("_", " ")}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Status
              </p>
              <p className="font-medium">
                <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-200">
                  {profile?.status}
                </span>
              </p>
            </div>
            {profile?.subscription_expires_at && (
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Subscription expires
                </p>
                <p className="font-medium text-slate-950 dark:text-slate-50">
                  {new Date(profile.subscription_expires_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
