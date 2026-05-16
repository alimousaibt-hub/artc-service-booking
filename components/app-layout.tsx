"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Menu, LogOut, Sun, Moon } from "lucide-react";
import { Profile } from "@/types/database";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileData?.status !== "active") {
        router.push("/pending");
        return;
      }

      setProfile(profileData as Profile);

      // Redirect advisors away from generic dashboard to their own view
      if (profileData.role === "advisor" && pathname === "/dashboard") {
        router.push("/advisor");
        return;
      }

      setLoading(false);
    };

    loadProfile();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-slate-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const isAdmin = ["admin", "super_admin"].includes(profile.role);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r border-slate-200 bg-white transition-transform dark:border-slate-700 dark:bg-slate-900 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:static md:translate-x-0`}
      >
        <nav className="space-y-1 p-4">
          <div className="mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">
              AB
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
              Service Bookings
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              v0.2 — Phase 2
            </p>
          </div>

          <NavLink href="/dashboard" active={pathname === "/dashboard"}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            Dashboard
          </NavLink>

          {profile?.role === "advisor" ? (
            <NavLink href="/advisor" active={pathname.startsWith("/advisor")}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              My appointments
            </NavLink>
          ) : (
            <NavLink href="/bookings" active={pathname.startsWith("/bookings")}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              Bookings
            </NavLink>
          )}

          {isAdmin && (
            <>
              <div className="pt-3 pb-1">
                <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Admin
                </p>
              </div>
              <NavLink href="/admin/users" active={pathname === "/admin/users"}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85"/></svg>
                Users
              </NavLink>
              <NavLink href="/admin/branches" active={pathname === "/admin/branches"}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                Branches
              </NavLink>
              <NavLink href="/admin/advisors" active={pathname === "/admin/advisors"}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                Advisors
              </NavLink>
            </>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4 dark:border-slate-700">
          <div className="rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-800">
            <p className="font-medium text-slate-900 dark:text-slate-50">
              {profile.full_name || "User"}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {profile.email}
            </p>
            <p className="mt-1 inline-block rounded px-2 py-1 text-xs font-medium text-white">
              <span
                className={`rounded px-2 py-1 ${
                  profile.role === "super_admin"
                    ? "bg-red-600"
                    : profile.role === "admin"
                      ? "bg-blue-600"
                      : profile.role === "crm_agent"
                        ? "bg-green-600"
                        : "bg-slate-600"
                }`}
              >
                {profile.role.replace("_", " ")}
              </span>
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900 sm:px-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-4">
              {/* Theme toggle */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {theme === "dark" ? (
                  <Sun size={20} />
                ) : (
                  <Moon size={20} />
                )}
              </button>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="btn btn-secondary flex items-center gap-2"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
        active
          ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      {children}
    </a>
  );
}
