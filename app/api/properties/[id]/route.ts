import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAuthenticatedClient } from '../../../../lib/auth'
import {
  isAccountLocked,
  calculateOverage,
  getPortfolioOveragePriceId,
  type BillingStatus,
  type Tier,
} from '../../../../lib/billing'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id || id.trim() === '') {
      return NextResponse.json({ error: 'Property id is required.' }, { status: 400 })
    }

    const supabase = await createAuthenticatedClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
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

    // Ownership verification — RLS scopes by account. Filtering deleted_at IS NULL
    // also prevents double-deletes (a soft-deleted row 404s here too).
    const { data: target } = await supabase
      .from('properties')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (!target) {
      return NextResponse.json({ error: 'Property not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Count BEFORE soft-delete — includes the row about to be deleted.
    const { count } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)

    const currentCount = count ?? 0
    const newCount = currentCount - 1

    // Soft-delete the property.
    const deletedAt = new Date().toISOString()
    const { error: deleteErr } = await supabase
      .from('properties')
      .update({ deleted_at: deletedAt })
      .eq('id', id)

    if (deleteErr) {
      return NextResponse.json({ error: 'Failed to delete property' }, { status: 500 })
    }

    let overageAdjusted = false
    const tier: Tier | null = status.subscription_tier

    if (tier === 'portfolio') {
      // Defensive checks — roll back the soft-delete if subscription state is broken.
      if (!status.stripe_subscription_id || !status.billing_interval) {
        await supabase
          .from('properties')
          .update({ deleted_at: null })
          .eq('id', id)
        return NextResponse.json(
          { error: 'Subscription not configured for overage' },
          { status: 500 }
        )
      }

      try {
        const { units: newQty } = calculateOverage('portfolio', status.billing_interval, newCount)
        const sub = await stripe.subscriptions.retrieve(status.stripe_subscription_id)
        const overagePriceId = getPortfolioOveragePriceId(status.billing_interval)
        const overageItem = sub.items.data.find(item => item.price.id === overagePriceId)

        if (!overageItem && newQty === 0) {
          // Case 1 — nothing to do. Pre-overage delete (e.g. 10 → 9 with no overage attached).
        } else if (overageItem && newQty === 0) {
          // Case 2 — remove the overage item entirely.
          await stripe.subscriptions.update(status.stripe_subscription_id, {
            items: [{ id: overageItem.id, deleted: true }],
            proration_behavior: 'none',
          })
          overageAdjusted = true
        } else if (overageItem && newQty > 0) {
          // Case 3 — decrement the overage quantity.
          await stripe.subscriptions.update(status.stripe_subscription_id, {
            items: [{ id: overageItem.id, quantity: newQty }],
            proration_behavior: 'none',
          })
          overageAdjusted = true
        } else {
          // Case 4 — out-of-sync state: > 10 properties but no overage item attached.
          // Should be impossible given Phase 8's add-side guarantees; logging without
          // failing the delete so the reconciliation job (deferred) can repair later.
          console.error(
            `[api/properties/[id] DELETE] out-of-sync: subscription ${status.stripe_subscription_id} ` +
            `has no overage item but newQty=${newQty} (newCount=${newCount})`
          )
        }
      } catch (err) {
        // Roll back the soft-delete so the property doesn't vanish without the Stripe adjustment.
        await supabase
          .from('properties')
          .update({ deleted_at: null })
          .eq('id', id)
        const msg = err instanceof Error ? err.message : 'Failed to update subscription'
        console.error('[api/properties/[id] DELETE overage]', msg)
        return NextResponse.json(
          { error: `Couldn't update subscription: ${msg}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      status: 'deleted',
      id,
      overageAdjusted,
      newPropertyCount: newCount,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete property'
    console.error('[api/properties/[id] DELETE]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
