import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client. Uses createBrowserClient from @supabase/ssr
// so the auth session is stored in cookies (not localStorage). This makes the
// session readable by the server-side createServerClient in lib/auth.ts,
// which is what allows RLS-protected queries to work in Server Components.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
