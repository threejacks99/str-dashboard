import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Server misconfiguration: missing Supabase env vars.' },
      { status: 500 }
    )
  }

  // Service role client — never shared with the browser.
  // Bypasses RLS so we can create records atomically during signup.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let userId: string | null = null
  let accountId: string | null = null

  try {
    const body = await req.json()
    const { email, password, accountName } = body as {
      email: string
      password: string
      accountName?: string
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    // ── Step 1: Create the auth user ────────────────────────────────────────
    // email_confirm: true skips the confirmation email so the user can sign
    // in immediately after this route returns successfully.
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 })
    }
    userId = userData.user.id

    // ── Step 2: Create the account record ───────────────────────────────────
    const { data: account, error: accountError } = await admin
      .from('accounts')
      .insert({
        name: accountName?.trim() || email,
        billing_email: email,
        plan: 'trial',
        subscription_status: 'trialing',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()
    if (accountError) throw new Error(`Could not create account: ${accountError.message}`)
    accountId = account.id

    // ── Step 3: Link user as account admin ──────────────────────────────────
    const { error: auError } = await admin
      .from('account_users')
      .insert({ account_id: accountId, user_id: userId, role: 'admin' })
    if (auError) throw new Error(`Could not link user to account: ${auError.message}`)

    // ── Step 4: Create default client record ────────────────────────────────
    const { error: clientError } = await admin
      .from('clients')
      .insert({ account_id: accountId, name: accountName?.trim() || 'My Property', email })
    if (clientError) throw new Error(`Could not create default client: ${clientError.message}`)

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err: any) {
    // ── Cleanup: undo anything that succeeded before the failure ─────────────
    // Deleting the account cascades to account_users and clients rows.
    if (accountId) {
      await admin.from('accounts').delete().eq('id', accountId)
    }
    if (userId) {
      await admin.auth.admin.deleteUser(userId)
    }

    return NextResponse.json(
      { error: err.message ?? 'Signup failed. Please try again.' },
      { status: 500 }
    )
  }
}
