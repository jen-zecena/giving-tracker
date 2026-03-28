import { createClient } from "@/lib/supabase/server";

export default async function TestSupabasePage() {
  const supabase = await createClient();

  // Test: validate auth token server-side (will be null if not logged in, but proves the connection works)
  const { error: authError } = await supabase.auth.getUser();

  // Test: try a simple query to verify DB connectivity
  const { error: dbError } = await supabase.from("profiles").select("id").limit(1);

  const authConnected = !authError;
  // Table may not exist yet — a "relation does not exist" error still proves the DB connection works
  const dbConnected = !dbError || dbError.message.includes("does not exist");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Supabase Connection Test</h1>
      <div className="grid gap-2 text-sm">
        <p>
          Auth API:{" "}
          <span className={authConnected ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
            {authConnected ? "Connected" : `Error: ${authError?.message}`}
          </span>
        </p>
        <p>
          Database:{" "}
          <span className={dbConnected ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
            {dbConnected ? "Connected" : `Error: ${dbError?.message}`}
          </span>
        </p>
      </div>
    </div>
  );
}
