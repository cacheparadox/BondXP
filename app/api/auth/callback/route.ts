import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = requestUrl.searchParams.get("redirectTo") || "/dashboard";

  if (code) {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if user has a profile in the users table
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("id, role, couple_session_id")
          .eq("id", user.id)
          .single();

        // If no profile, they need to select a role & pair up
        if (!profile) {
          const pairUrl = new URL(requestUrl.href);
          pairUrl.pathname = "/pairing";
          pairUrl.searchParams.delete("code");
          return NextResponse.redirect(pairUrl);
        }
      }

      const redirectUrl = new URL(requestUrl.href);
      redirectUrl.pathname = redirectTo;
      redirectUrl.searchParams.delete("code");
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Return the user to an error page or login page if auth fails
  const loginUrl = new URL(requestUrl.href);
  loginUrl.pathname = "/login";
  loginUrl.searchParams.delete("code");
  return NextResponse.redirect(loginUrl);
}
