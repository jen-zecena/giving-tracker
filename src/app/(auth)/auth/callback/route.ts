import { NextResponse, type NextRequest } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const type = searchParams.get("type");

  // Default redirect — will be updated based on auth state
  let redirectTo = `${origin}/login`;

  if (!code) {
    return NextResponse.redirect(redirectTo);
  }

  const response = NextResponse.redirect(redirectTo);
  const supabase = createRouteHandlerClient(request, response);

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    response.headers.set(
      "Location",
      `${origin}/login?error=${encodeURIComponent("Could not confirm your account. Please try again.")}`
    );
    return response;
  }

  // Password recovery flow
  if (type === "recovery") {
    response.headers.set("Location", `${origin}/settings`);
    return response;
  }

  // Check onboarding status
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    if (profile && !profile.onboarding_completed) {
      response.headers.set("Location", `${origin}/onboarding`);
      return response;
    }
  }

  response.headers.set("Location", `${origin}/dashboard`);
  return response;
}
