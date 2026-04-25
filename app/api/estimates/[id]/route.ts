import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const service = createServiceClient()

    const { data: estimate } = await service
      .from('estimates')
      .select('id, title, intro_text, status, subtotal, discount, total, job_id')
      .eq('id', id)
      .eq('account_id', user.account_id)
      .single()

    if (!estimate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: lineItems } = await service
      .from('line_items')
      .select('id, finding_id, catalog_item_id, name, description, unit, quantity, unit_price, quantity_source, notes, sort_order')
      .eq('estimate_id', id)
      .eq('account_id', user.account_id)
      .order('sort_order', { ascending: true })

    return NextResponse.json({ estimate, line_items: lineItems ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const service = createServiceClient()
    const body = await request.json()

    const allowed = ['title', 'intro_text', 'discount', 'status', 'subtotal', 'total']
    const patch: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) patch[key] = body[key]
    }

    const { data: estimate } = await service
      .from('estimates')
      .update(patch)
      .eq('id', id)
      .eq('account_id', user.account_id)
      .select('id, title, intro_text, status, subtotal, discount, total')
      .single()

    return NextResponse.json({ estimate })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
