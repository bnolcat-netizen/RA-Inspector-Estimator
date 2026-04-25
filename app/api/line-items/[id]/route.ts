import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const service = createServiceClient()
    const body = await request.json()

    const allowed = ['name', 'description', 'unit', 'quantity', 'unit_price', 'notes']
    const patch: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) patch[key] = body[key]
    }

    if ('quantity' in patch && patch.quantity != null) {
      patch.quantity_source = 'contractor_entered'
    }

    const { data: lineItem } = await service
      .from('line_items')
      .update(patch)
      .eq('id', id)
      .eq('account_id', user.account_id)
      .select('id, finding_id, catalog_item_id, name, description, unit, quantity, unit_price, quantity_source, notes, sort_order')
      .single()

    return NextResponse.json({ line_item: lineItem })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const service = createServiceClient()

    await service
      .from('line_items')
      .delete()
      .eq('id', id)
      .eq('account_id', user.account_id)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
