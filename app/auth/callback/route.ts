import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("status")
          .eq("id", user.id)
          .single();

        if (profile?.status === "active") {
          return NextResponse.redirect(`${origin}/dashboard`);
        } else {
          return NextResponse.redirect(`${origin}/pending`);
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}