import { NextRequest, NextResponse } from 'next/server'
import { requireUnlockedAccount } from '../../../../lib/apiAuth'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id || id.trim() === '') {
      return NextResponse.json({ error: 'Reservation id is required.' }, { status: 400 })
    }

    const auth = await requireUnlockedAccount()
    if (!auth.ok) return auth.response
    const { supabase } = auth

    // Hard delete — RLS scopes by account; reservations have no soft-delete column
    // and no Stripe side effects (overage math is property-count-driven only).
    const { error: deleteErr } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id)

    if (deleteErr) {
      return NextResponse.json({ error: 'Failed to delete reservation' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete reservation'
    console.error('[api/reservations/[id] DELETE]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
