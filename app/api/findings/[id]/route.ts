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
    const { status, issue_type, severity, description, suggested_service } = body

    const allowed = ['confirmed', 'rejected', 'edited']
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data: existing } = await service
      .from('findings')
      .select('id')
      .eq('id', id)
      .eq('account_id', user.account_id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const update: Record<string, unknown> = { status }

    if (status === 'confirmed') {
      update.confirmed_at = new Date().toISOString()
      update.confirmed_by = user.id
    }

    if (status === 'edited') {
      update.edited_at = new Date().toISOString()
      update.confirmed_at = new Date().toISOString()
      update.confirmed_by = user.id
      if (issue_type !== undefined) update.issue_type = issue_type
      if (severity !== undefined) update.severity = severity
      if (description !== undefined) update.description = description
      if (suggested_service !== undefined) update.suggested_service = suggested_service
    }

    const { data: updated } = await service
      .from('findings')
      .update(update)
      .eq('id', id)
      .select('id, issue_type, severity, description, suggested_service, status')
      .single()

    return NextResponse.json({ finding: updated })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
