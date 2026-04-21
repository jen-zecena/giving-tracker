import { NextResponse, type NextRequest } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendWelcomeEmail } from "@/lib/email";

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
      .select("display_name, onboarding_completed, welcome_email_sent_at, email_notifications")
      .eq("id", user.id)
      .single();

    // Welcome email — fires once per profile, after email verification.
    // Best-effort: failures never block the redirect, and the
    // `welcome_email_sent_at` stamp prevents double-sends on subsequent
    // callback visits (OAuth re-auth, password reset, etc.).
    if (profile && !profile.welcome_email_sent_at && user.email) {
      await dispatchWelcomeEmail({
        userId: user.id,
        email: user.email,
        displayName: profile.display_name as string | null,
        emailOptedIn: profile.email_notifications !== false,
        origin,
      });
    }

    if (profile && !profile.onboarding_completed) {
      response.headers.set("Location", `${origin}/onboarding`);
      return response;
    }
  }

  response.headers.set("Location", `${origin}/dashboard`);
  return response;
}

type DispatchArgs = {
  userId: string;
  email: string;
  displayName: string | null;
  emailOptedIn: boolean;
  origin: string;
};

async function dispatchWelcomeEmail(args: DispatchArgs): Promise<void> {
  try {
    const result = await sendWelcomeEmail({
      to: args.email,
      displayName: args.displayName,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? args.origin,
      emailOptedIn: args.emailOptedIn,
    });

    // Stamp the profile in all non-error cases (sent, test_mode, opted_out).
    // That way a user who was opted out at signup doesn't get a surprise
    // welcome the next time they opt back in.
    if ("error" in result && result.error) {
      console.error("[welcome-email] send failed:", result.error);
      return;
    }

    const admin = createServiceRoleClient();
    await admin
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", args.userId);
  } catch (err) {
    console.error("[welcome-email] dispatch threw:", err);
  }
}
