"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export default function PendingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    const checkApprovalStatus = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", data.user.id)
        .single();

      if (profile?.status === "active") {
        router.push("/dashboard");
      }

      setCheckingStatus(false);
    };

    checkApprovalStatus();
    const interval = setInterval(checkApprovalStatus, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [router, supabase]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md">
        <div className="card text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-950 dark:text-slate-50">
            Pending approval
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Your account has been created and is awaiting approval by a super
            admin.
          </p>

          <div className="mt-6 space-y-3 text-left rounded-lg bg-blue-50 p-4 text-sm dark:bg-blue-900/30">
            <p className="font-medium text-blue-900 dark:text-blue-200">
              What happens next:
            </p>
            <ul className="space-y-2 text-blue-800 dark:text-blue-300">
              <li className="flex gap-2">
                <span>1.</span>
                <span>A super admin will review your account</span>
              </li>
              <li className="flex gap-2">
                <span>2.</span>
                <span>They will assign you a role and subscription dates</span>
              </li>
              <li className="flex gap-2">
                <span>3.</span>
                <span>Your account status will change to "active"</span>
              </li>
              <li className="flex gap-2">
                <span>4.</span>
                <span>You'll see this message update automatically</span>
              </li>
            </ul>
          </div>

          {checkingStatus && (
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
              Checking status...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
