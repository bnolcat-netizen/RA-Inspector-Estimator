import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentUser } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const supabase = await createClient()
    const service = createServiceClient()

    const { data: photoRecords } = await supabase
      .from('photos')
      .select('id, storage_path, analysis_status')
      .eq('job_id', id)
      .eq('account_id', user.account_id)
      .order('created_at', { ascending: true })

    // Lightweight poll path — skip signed URL generation and job fetch
    if (request.nextUrl.searchParams.get('status_only') === 'true') {
      const photos = (photoRecords ?? []).map((p) => ({
        id: p.id,
        analysis_status: p.analysis_status,
      }))
      return NextResponse.json({ photos })
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('id, client_name, address, city, state, zip, status, notes')
      .eq('id', id)
      .eq('account_id', user.account_id)
      .single()

    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const photos = await Promise.all(
      (photoRecords ?? []).map(async (p) => {
        const { data } = await service.storage
          .from('photos')
          .createSignedUrl(p.storage_path, 60 * 60)
        return { id: p.id, signed_url: data?.signedUrl ?? '', analysis_status: p.analysis_status }
      })
    )

    return NextResponse.json({ job, photos })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
