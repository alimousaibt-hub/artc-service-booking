"use client";

import { AppLayout } from "@/components/app-layout";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ToggleLeft, ToggleRight, Link2, Unlink } from "lucide-react";

interface Branch { id: string; name: string; code: string; }
interface Profile { id: string; full_name: string | null; email: string; }
interface Advisor {
  id: string;
  branch_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  daily_capacity: number;
  is_active: boolean;
  profile_id: string | null;
  linked_profile?: Profile | null;
}

export default function AdvisorsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [advisorUsers, setAdvisorUsers] = useState<Profile[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      supabase.from("profiles").select("role").eq("id", data.user.id).single()
        .then(({ data: p }) => {
          if (!["admin", "super_admin"].includes(p?.role)) router.push("/dashboard");
        });
    });

    fetch("/api/branches")
      .then((r) => r.json())
      .then((data: Branch[]) => {
        setBranches(data);
        if (data.length > 0) setSelectedBranch(data[0].id);
      });

    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "advisor")
      .eq("status", "active")
      .then(({ data }) => setAdvisorUsers((data || []) as Profile[]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedBranch) return;
    setLoading(true);
    supabase
      .from("service_advisors")
      .select("*, linked_profile:profiles!service_advisors_profile_id_fkey(id, full_name, email)")
      .eq("branch_id", selectedBranch)
      .order("name")
      .then(({ data }) => {
        setAdvisors((data || []) as Advisor[]);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch]);

  const linkProfile = async (advisorId: string, profileId: string | null) => {
    setError(null);
    const { error: err } = await supabase
      .from("service_advisors")
      .update({ profile_id: profileId })
      .eq("id", advisorId);
    if (err) { setError(err.message); return; }
    const profile = profileId ? advisorUsers.find((u) => u.id === profileId) ?? null : null;
    setAdvisors((prev) =>
      prev.map((a) =>
        a.id === advisorId ? { ...a, profile_id: profileId, linked_profile: profile } : a
      )
    );
  };

  const toggleActive = async (advisor: Advisor) => {
    const { error: err } = await supabase
      .from("service_advisors")
      .update({ is_active: !advisor.is_active })
      .eq("id", advisor.id);
    if (err) { setError(err.message); return; }
    setAdvisors((prev) =>
      prev.map((a) => a.id === advisor.id ? { ...a, is_active: !a.is_active } : a)
    );
  };

  const linkedProfileIds = new Set(advisors.filter((a) => a.profile_id).map((a) => a.profile_id!));
  const unlinkedAdvisorUsers = advisorUsers.filter((u) => !linkedProfileIds.has(u.id));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">Service Advisors</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Link each advisor slot to a user account with the{" "}
            <span className="font-medium text-brand-600">advisor</span> role.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{error}</div>
        )}

        <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
          <p className="font-medium mb-1">How to set up a new advisor</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>Advisor registers at <span className="font-mono">/register</span></li>
            <li>Approve in <strong>Admin → Users</strong> and set role to <strong>Advisor</strong></li>
            <li>Come back here and use the "Link account" dropdown</li>
          </ol>
        </div>

        <div className="flex flex-wrap gap-2">
          {branches.map((b) => (
            <button key={b.id} onClick={() => setSelectedBranch(b.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedBranch === b.id
                  ? "bg-brand-600 text-white"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
              }`}>
              {b.name || b.code}
            </button>
          ))}
        </div>

        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
          ) : advisors.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No advisors. Run the migration SQL first.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-5 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Advisor</th>
                  <th className="px-5 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Linked account</th>
                  <th className="px-5 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-5 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {advisors.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-3 font-medium text-slate-950 dark:text-slate-50">{a.name}</td>
                    <td className="px-5 py-3">
                      {a.linked_profile ? (
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-semibold dark:bg-brand-900/30 dark:text-brand-400">
                            {(a.linked_profile.full_name || a.linked_profile.email)[0].toUpperCase()}
                          </span>
                          <div>
                            <p className="font-medium text-slate-950 dark:text-slate-50 text-xs">{a.linked_profile.full_name || "—"}</p>
                            <p className="text-slate-500 text-xs">{a.linked_profile.email}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Not linked</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`badge ${a.is_active ? "badge-success" : "bg-slate-100 text-slate-600"}`}>
                        {a.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        {a.linked_profile ? (
                          <button onClick={() => linkProfile(a.id, null)}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600">
                            <Unlink size={13} /> Unlink
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Link2 size={13} className="text-slate-400" />
                            <select defaultValue=""
                              onChange={(e) => { if (e.target.value) linkProfile(a.id, e.target.value); }}
                              className="text-xs py-1 px-2 border border-slate-200 rounded dark:border-slate-700 dark:bg-slate-900">
                              <option value="">Link account…</option>
                              {unlinkedAdvisorUsers.map((u) => (
                                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <button onClick={() => toggleActive(a)}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
                          {a.is_active
                            ? <><ToggleRight size={15} className="text-green-600" /> Deactivate</>
                            : <><ToggleLeft size={15} /> Activate</>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {unlinkedAdvisorUsers.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
              {unlinkedAdvisorUsers.length} advisor account{unlinkedAdvisorUsers.length > 1 ? "s" : ""} waiting to be linked
            </p>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-0.5">
              {unlinkedAdvisorUsers.map((u) => (
                <li key={u.id}>· {u.full_name || u.email}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
