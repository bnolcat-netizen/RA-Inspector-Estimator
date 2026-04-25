import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentUser } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const supabase = await createClient()
    const service = createServiceClient()

    const form = await request.formData()
    const file = form.get('file') as File | null
    const jobId = form.get('job_id') as string | null

    if (!file || !jobId) {
      return NextResponse.json({ error: 'Missing file or job_id' }, { status: 400 })
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .eq('account_id', user.account_id)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const storagePath = `${user.account_id}/${jobId}/${randomUUID()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await service.storage
      .from('photos')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
    }

    const { data: photoRecord, error: dbError } = await service
      .from('photos')
      .insert({
        job_id: jobId,
        account_id: user.account_id,
        storage_path: storagePath,
        filename: file.name,
        analysis_status: 'pending',
      })
      .select('id')
      .single()

    if (dbError || !photoRecord) {
      return NextResponse.json({ error: 'DB insert failed' }, { status: 500 })
    }

    const { data: signedUrl } = await service.storage
      .from('photos')
      .createSignedUrl(storagePath, 60 * 60)

    return NextResponse.json({
      id: photoRecord.id,
      signed_url: signedUrl?.signedUrl ?? '',
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
