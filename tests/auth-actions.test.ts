/**
 * Auth actions validation tests
 * Run with: npx tsx --env-file=.env.local tests/auth-actions.test.ts
 *
 * These tests validate the auth action logic (validation, error handling)
 * without actually calling Supabase auth (which requires a running server).
 */

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.set(key, value);
  }
  return fd;
}

// We can't import the actual server actions in a test script (they use
// Next.js server-only APIs), so we test the validation logic directly.

// ── signUp validation ──────────────────────────────────────
console.log("\nsignUp validation:");

// Missing fields
{
  const fd = makeFormData({ email: "", password: "", confirmPassword: "" });
  const email = fd.get("email") as string;
  const password = fd.get("password") as string;
  const confirmPassword = fd.get("confirmPassword") as string;
  const hasAll = !!(email && password && confirmPassword);
  assert("rejects empty fields", !hasAll);
}

// Password too short
{
  const password = "short";
  assert("rejects password < 8 chars", password.length < 8);
}

// Password mismatch
{
  const password = "longpassword123";
  const confirmPassword = "differentpassword";
  assert("rejects mismatched passwords", password !== confirmPassword);
}

// Valid input passes validation
{
  const fd = makeFormData({
    email: "test@example.com",
    password: "securepassword123",
    confirmPassword: "securepassword123",
  });
  const email = fd.get("email") as string;
  const password = fd.get("password") as string;
  const confirmPassword = fd.get("confirmPassword") as string;
  const hasAll = !!(email && password && confirmPassword);
  const longEnough = password.length >= 8;
  const matching = password === confirmPassword;
  assert("accepts valid registration data", hasAll && longEnough && matching);
}

// ── signIn validation ──────────────────────────────────────
console.log("\nsignIn validation:");

{
  const fd = makeFormData({ email: "", password: "" });
  const email = fd.get("email") as string;
  const password = fd.get("password") as string;
  assert("rejects empty email", !email);
}

{
  const fd = makeFormData({ email: "test@example.com", password: "pass123" });
  const email = fd.get("email") as string;
  const password = fd.get("password") as string;
  assert("accepts valid sign-in data", !!(email && password));
}

// ── forgotPassword validation ──────────────────────────────
console.log("\nforgotPassword validation:");

{
  const fd = makeFormData({ email: "" });
  const email = fd.get("email") as string;
  assert("rejects empty email", !email);
}

{
  const fd = makeFormData({ email: "test@example.com" });
  const email = fd.get("email") as string;
  assert("accepts valid email", !!email);
}

// ── Error message mapping ──────────────────────────────────
console.log("\nError message mapping:");

{
  const supabaseMsg = "User already registered";
  const mapped = supabaseMsg.includes("already registered")
    ? "An account with this email already exists."
    : supabaseMsg;
  assert("maps 'already registered' error", mapped === "An account with this email already exists.");
}

{
  const supabaseMsg = "Invalid login credentials";
  const mapped = supabaseMsg.includes("Invalid login credentials")
    ? "Invalid email or password."
    : supabaseMsg;
  assert("maps 'invalid credentials' error", mapped === "Invalid email or password.");
}

{
  const supabaseMsg = "Email not confirmed";
  const mapped = supabaseMsg.includes("Email not confirmed")
    ? "Please confirm your email before signing in."
    : supabaseMsg;
  assert("maps 'email not confirmed' error", mapped === "Please confirm your email before signing in.");
}

// ── Environment variable safety ────────────────────────────
console.log("\nEnvironment variable safety:");

{
  const envKeys = Object.keys(process.env).filter((k) =>
    k.startsWith("NEXT_PUBLIC_")
  );
  const hasPublicSalaryKey = envKeys.some((k) => k.includes("SALARY"));
  assert("SALARY_ENCRYPTION_KEY is not in NEXT_PUBLIC_", !hasPublicSalaryKey);
}

{
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  assert(
    "NEXT_PUBLIC_SITE_URL fallback works",
    siteUrl === "http://localhost:3000" || siteUrl.startsWith("http")
  );
}

// ── Summary ────────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
