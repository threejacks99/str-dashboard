import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedClient } from '../../../lib/auth'
import { isAccountLocked, TIER_PROPERTY_CAPS, type BillingStatus, type Tier } from '../../../lib/billing'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createAuthenticatedClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = (await req.json()) as {
      name?: string
      address?: string | null
      bedrooms?: number | null
      bathrooms?: number | null
      total_nights_available?: number
      property_value?: number | null
    }

    if (typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json({ error: 'Property name is required.' }, { status: 400 })
    }

    const { data: auRow } = await supabase
      .from('account_users')
      .select('account_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!auRow) {
      return NextResponse.json({ error: 'No account found' }, { status: 404 })
    }

    const { data: account } = await supabase
      .from('accounts')
      .select('subscription_tier, subscription_status, billing_interval, trial_ends_at, current_period_end, stripe_customer_id, stripe_subscription_id')
      .eq('id', auRow.account_id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 500 })
    }

    const status: BillingStatus = {
      subscription_tier:      account.subscription_tier      as Tier | null,
      subscription_status:    account.subscription_status    as BillingStatus['subscription_status'],
      billing_interval:       account.billing_interval       as BillingStatus['billing_interval'],
      trial_ends_at:          account.trial_ends_at          as string | null,
      current_period_end:     account.current_period_end     as string | null,
      stripe_customer_id:     account.stripe_customer_id     as string | null,
      stripe_subscription_id: account.stripe_subscription_id as string | null,
    }

    if (isAccountLocked(status)) {
      return NextResponse.json({ error: 'Account locked', code: 'LOCKED' }, { status: 403 })
    }

    // isAccountLocked already returns true when tier is null, so this is a
    // belt-and-suspenders fallback rather than a real path.
    if (!status.subscription_tier) {
      return NextResponse.json({ error: 'Tier not set' }, { status: 500 })
    }
    const tier: Tier = status.subscription_tier
    const cap = TIER_PROPERTY_CAPS[tier]

    const { count } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })

    const currentCount = count ?? 0
    if (currentCount >= cap) {
      return NextResponse.json(
        {
          error: `You have reached your plan's property limit (${cap}). Upgrade to add more properties.`,
          code: 'CAP_EXCEEDED',
          currentCount,
          cap,
          tier,
        },
        { status: 403 }
      )
    }

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('account_id', auRow.account_id)
      .limit(1)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'No client found for account' }, { status: 404 })
    }

    const { data: newProp, error: insertErr } = await supabase
      .from('properties')
      .insert({
        name: body.name.trim(),
        address: body.address?.trim() || null,
        bedrooms: body.bedrooms ?? null,
        bathrooms: body.bathrooms ?? null,
        total_nights_available: body.total_nights_available ?? 365,
        property_value: body.property_value ?? null,
        client_id: client.id,
      })
      .select('id, name')
      .single()

    if (insertErr || !newProp) {
      return NextResponse.json(
        { error: insertErr?.message ?? 'Failed to create property' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      id:   newProp.id   as string,
      name: newProp.name as string,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create property'
    console.error('[api/properties POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
