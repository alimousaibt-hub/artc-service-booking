import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AuthCallbackPage() {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Check if user has been approved
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .single();

    if (profile?.status === "active") {
      redirect("/dashboard"); // Matches app/(app)/dashboard
    } else {
      redirect("/pending"); // ✅ Fixed: Matches app/(auth)/pending
    }
  }

  redirect("/login"); // ✅ Fixed: Matches app/(auth)/login
}