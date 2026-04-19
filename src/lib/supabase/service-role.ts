import "server-only";

import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

// We don't have generated Database types in this repo, so expose a
// permissive SupabaseClient to callers. Strict row typing is enforced at
// the call site by the emit helpers' own `NotificationRow` type.
let _client: SupabaseClient | null = null;

/**
 * Returns a Supabase client authenticated with the service-role key.
 *
 * This client bypasses RLS and **must never be exposed to the browser**.
 * The `server-only` import above makes bundling it into a client component
 * a build-time error.
 *
 * Current use case: the notification emit helpers (DP-024) need to insert
 * rows into `notifications` on behalf of another user, which the FORCE RLS
 * policy on that table disallows for the authenticated role.
 */
export function createServiceRoleClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not set — required by the service-role client."
    );
  }
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — required to emit notifications on behalf of other users."
    );
  }

  _client = createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _client;
}
