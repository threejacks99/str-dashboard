import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export type UserAccountInfo = {
  account_id: string
  role: 'admin' | 'member'
  client_id: string | null
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
// Each row carries account_id, role, and an optional client_id (used for
// members restricted to a single client).
export async function getCurrentUserAccount(): Promise<UserAccountInfo[]> {
  const supabase = await createAuthenticatedClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('account_users')
    .select('account_id, role, client_id')
    .eq('user_id', user.id)

  return (data ?? []) as UserAccountInfo[]
}

// Returns the IDs of every client the user is allowed to see.
//   admin  → all clients belonging to their account(s)
//   member → only the specific client pinned to their account_users row
export async function getAccessibleClientIds(
  userAccountInfo: UserAccountInfo[]
): Promise<string[]> {
  if (!userAccountInfo.length) return []

  const memberClientIds = userAccountInfo
    .filter(au => au.role === 'member' && au.client_id)
    .map(au => au.client_id as string)

  const adminAccountIds = userAccountInfo
    .filter(au => au.role === 'admin')
    .map(au => au.account_id)

  if (!adminAccountIds.length) return memberClientIds

  const supabase = await createAuthenticatedClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .in('account_id', adminAccountIds)

  const adminClientIds = (clients ?? []).map((c: { id: string }) => c.id)

  // Deduplicate in case a user is both admin and pinned member of an account
  return [...new Set([...adminClientIds, ...memberClientIds])]
}
