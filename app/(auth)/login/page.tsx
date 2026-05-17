"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, Info } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check approval status before redirecting
      if (signInData.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("status")
          .eq("id", signInData.user.id)
          .single();

        if (profile?.status === "active") {
          router.push("/dashboard");
        } else {
          router.push("/pending");
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to sign in with email"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo: `${window.location.origin}/callback`,
        },
      });

      if (error) throw error;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to sign in with Microsoft"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-slate-100 px-4 sm:px-6 lg:px-8 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
      <div className="w-full max-w-md space-y-6">
        <div className="card">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-500/30">
              <Mail size={26} strokeWidth={2.5} />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Service Bookings
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Welcome back! Please enter your details.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Email login form */}
          <form onSubmit={handleEmailLogin} className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@alrostamani.ae"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                {/* Optional: Add a forgot password link here in the future */}
                <Link
                  href="#"
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary mt-2 w-full"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                Or continue with
              </span>
            </div>
          </div>

          {/* Microsoft OAuth button */}
          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={loading}
            className="btn btn-secondary w-full"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 21 21"
              fill="currentColor"
            >
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            Sign in with Microsoft
          </button>

          {/* Sign up link */}
          <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
            Don&apos;t have an account?{" "}
            <Link 
              href="/register"
              className="font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Create one
            </Link>
          </p>
        </div>

        {/* Info box - Updated to look more like a subtle tip than a warning */}
        <div className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-800 backdrop-blur-sm dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-200">
          <Info className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="font-semibold">New to the system?</p>
            <p className="mt-1 text-blue-700/80 dark:text-blue-200/80">
              After registration, your account will require approval from a super admin before you can sign in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}