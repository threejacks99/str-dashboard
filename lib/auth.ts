import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export type UserAccountInfo = {
  account_id: string
  role: 'admin' | 'member'
}

// Creates a Supabase client that reads the logged-in user's session from
// cookies. Use this in Server Components and Route Handlers only — never
// import it into client components.
export async function createAuthenticatedClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll is called from Server Components where cookie mutation
            // is not possible. Safe to ignore — the session is read-only here.
          }
        },
      },
    }
  )
}

// Returns the currently authenticated user, or null if not signed in.
export async function getCurrentUser() {
  const supabase = await createAuthenticatedClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
}

// Returns all account_users rows for the current user.
export async function getCurrentUserAccount(): Promise<UserAccountInfo[]> {
  const supabase = await createAuthenticatedClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('account_users')
    .select('account_id, role')
    .eq('user_id', user.id)

  return (data ?? []) as UserAccountInfo[]
}

// Returns every client ID belonging to any account the user is a member of.
// No role filtering — owners-only product, all account members see all clients.
export async function getAccessibleClientIds(
  userAccountInfo: UserAccountInfo[]
): Promise<string[]> {
  if (!userAccountInfo.length) return []

  const accountIds = userAccountInfo.map(au => au.account_id)

  const supabase = await createAuthenticatedClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .in('account_id', accountIds)

  return (clients ?? []).map((c: { id: string }) => c.id)
}
