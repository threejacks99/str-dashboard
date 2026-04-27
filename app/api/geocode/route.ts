import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedClient } from '../../../lib/auth'

export async function POST(req: NextRequest) {
  const supabase = await createAuthenticatedClient()

  let body: { propertyId?: string; address?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { propertyId, address } = body

  if (!propertyId) {
    return NextResponse.json({ error: 'propertyId is required.' }, { status: 400 })
  }
  if (!address?.trim()) {
    return NextResponse.json({ error: 'address is required.' }, { status: 400 })
  }

  // Verify the user can access this property — RLS returns no rows if not.
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .single()

  if (propError || !property) {
    return NextResponse.json({ error: 'Property not found or access denied.' }, { status: 403 })
  }

  // Call Nominatim. Rate limit: 1 req/s — callers are responsible for spacing
  // multiple requests. At 1-at-a-time (manual property creation), this is fine.
  const encoded = encodeURIComponent(address.trim())
  const nominatimUrl =
    `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`

  let geoResults: Array<{ lat: string; lon: string }>
  try {
    const geoRes = await fetch(nominatimUrl, {
      headers: {
        // Nominatim policy requires a descriptive User-Agent.
        'User-Agent': 'Hostics/1.0 (str-analytics)',
      },
    })
    if (!geoRes.ok) {
      return NextResponse.json(
        { error: `Nominatim returned HTTP ${geoRes.status}.` },
        { status: 502 }
      )
    }
    geoResults = await geoRes.json()
  } catch (err: any) {
    return NextResponse.json(
      { error: `Geocoding request failed: ${err.message}` },
      { status: 502 }
    )
  }

  if (!geoResults.length) {
    return NextResponse.json(
      { error: 'No results found for this address. Try a more specific address.' },
      { status: 404 }
    )
  }

  const latitude  = parseFloat(geoResults[0].lat)
  const longitude = parseFloat(geoResults[0].lon)

  const { error: updateError } = await supabase
    .from('properties')
    .update({ latitude, longitude, geocoded_at: new Date().toISOString() })
    .eq('id', propertyId)

  if (updateError) {
    return NextResponse.json(
      { error: `Coordinates found but failed to save: ${updateError.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ latitude, longitude })
}
