import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const service = createServiceClient()

    const photoId = request.nextUrl.searchParams.get('photo_id')
    if (!photoId) return NextResponse.json({ error: 'Missing photo_id' }, { status: 400 })

    const { data: findings } = await service
      .from('findings')
      .select('id, issue_type, severity, description, suggested_service, status, box_x, box_y, box_width, box_height, notes')
      .eq('photo_id', photoId)
      .eq('account_id', user.account_id)
      .order('created_at', { ascending: true })

    return NextResponse.json({ findings: findings ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
