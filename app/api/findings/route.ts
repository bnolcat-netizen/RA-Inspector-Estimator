import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const service = createServiceClient()

    const photoId = request.nextUrl.searchParams.get('photo_id')
    const jobId = request.nextUrl.searchParams.get('job_id')

    if (!photoId && !jobId) return NextResponse.json({ error: 'Missing photo_id or job_id' }, { status: 400 })

    const query = service
      .from('findings')
      .select('id, issue_type, severity, description, suggested_service, status, box_x, box_y, box_width, box_height, notes')
      .eq('account_id', user.account_id)
      .order('created_at', { ascending: true })

    if (photoId) query.eq('photo_id', photoId)
    if (jobId) query.eq('job_id', jobId)

    const { data: findings } = await query

    return NextResponse.json({ findings: findings ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const service = createServiceClient()

    const body = await request.json()
    const { photo_id, job_id, box_x, box_y, box_width, box_height, issue_type, severity, description, suggested_service } = body

    if (!photo_id || !job_id || !issue_type || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: finding, error } = await service
      .from('findings')
      .insert({
        photo_id,
        job_id,
        account_id: user.account_id,
        box_x: box_x ?? null,
        box_y: box_y ?? null,
        box_width: box_width ?? null,
        box_height: box_height ?? null,
        issue_type,
        severity: severity ?? 'medium',
        description,
        suggested_service: suggested_service ?? '',
        status: 'confirmed',
        ai_raw: null,
        confirmed_at: new Date().toISOString(),
        confirmed_by: user.id,
      })
      .select('id, issue_type, severity, description, suggested_service, status, box_x, box_y, box_width, box_height, notes')
      .single()

    if (error) throw error

    return NextResponse.json({ finding })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
