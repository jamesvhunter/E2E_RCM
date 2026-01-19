import { createBrowserClient } from "@supabase/ssr";

// Note: Once Supabase is deployed, regenerate types with:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
// Then import and use: createBrowserClient<Database>(...)

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
