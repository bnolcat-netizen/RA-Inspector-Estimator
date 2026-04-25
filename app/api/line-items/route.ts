import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const service = createServiceClient()
    const { estimate_id, name, description, unit, quantity, unit_price, notes } = await request.json()

    if (!estimate_id || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify estimate belongs to this account
    const { data: estimate } = await service
      .from('estimates')
      .select('id')
      .eq('id', estimate_id)
      .eq('account_id', user.account_id)
      .maybeSingle()

    if (!estimate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Get next sort_order
    const { count } = await service
      .from('line_items')
      .select('id', { count: 'exact', head: true })
      .eq('estimate_id', estimate_id)

    const { data: lineItem } = await service
      .from('line_items')
      .insert({
        estimate_id,
        account_id: user.account_id,
        name,
        description: description ?? null,
        unit: unit ?? null,
        quantity: quantity ?? null,
        unit_price: unit_price ?? null,
        quantity_source: quantity != null ? 'contractor_entered' : null,
        notes: notes ?? null,
        sort_order: count ?? 0,
      })
      .select('id, finding_id, catalog_item_id, name, description, unit, quantity, unit_price, quantity_source, notes, sort_order')
      .single()

    return NextResponse.json({ line_item: lineItem })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
