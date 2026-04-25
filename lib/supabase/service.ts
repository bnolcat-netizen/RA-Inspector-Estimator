import { createClient } from '@supabase/supabase-js'

// Bypasses RLS — only for server-side operations that require elevated privileges.
// Never expose the service role key to the browser.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
