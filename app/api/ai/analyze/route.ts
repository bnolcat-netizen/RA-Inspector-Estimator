import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { analyzePhoto } from '@/lib/ai/service'
import { DEFAULT_KNOWLEDGE_BASE } from '@/lib/ai/knowledge-base'

export async function POST(request: NextRequest) {
  const service = createServiceClient()
  let photoId: string | undefined
  let jobId: string | undefined
  let accountId: string | undefined

  try {
    const user = await getCurrentUser()
    accountId = user.account_id

    const body = await request.json()
    photoId = body.photo_id as string
    if (!photoId) return NextResponse.json({ error: 'Missing photo_id' }, { status: 400 })

    const { data: photo } = await service
      .from('photos')
      .select('id, job_id, storage_path, analysis_status')
      .eq('id', photoId)
      .eq('account_id', accountId)
      .single()

    if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    if (photo.analysis_status === 'processing') {
      return NextResponse.json({ error: 'Already processing' }, { status: 409 })
    }

    jobId = photo.job_id

    await service
      .from('photos')
      .update({ analysis_status: 'processing' })
      .eq('id', photoId)

    const { data: imageBlob, error: downloadError } = await service.storage
      .from('photos')
      .download(photo.storage_path)

    if (downloadError || !imageBlob) {
      throw new Error(`Storage download failed: ${downloadError?.message}`)
    }

    const buffer = Buffer.from(await imageBlob.arrayBuffer())
    const imageBase64 = buffer.toString('base64')

    const result = await analyzePhoto(imageBase64, 'image/jpeg', DEFAULT_KNOWLEDGE_BASE)

    if (result.findings.length > 0) {
      const rows = result.findings.map((f) => ({
        photo_id: photoId,
        job_id: jobId,
        account_id: accountId,
        box_x: f.box.x,
        box_y: f.box.y,
        box_width: f.box.width,
        box_height: f.box.height,
        issue_type: f.issue_type,
        severity: f.severity,
        description: f.description,
        suggested_service: f.suggested_service,
        status: 'ai_suggested',
        ai_raw: f,
        notes: f.notes ?? null,
        confidence: f.confidence,
      }))

      await service.from('findings').insert(rows)
    }

    const estimatedCost =
      (result.input_tokens / 1_000_000) * 3 + (result.output_tokens / 1_000_000) * 15

    await service.from('ai_usage_log').insert({
      account_id: accountId,
      job_id: jobId,
      photo_id: photoId,
      model: 'claude-sonnet-4-6',
      input_tokens: result.input_tokens,
      output_tokens: result.output_tokens,
      total_tokens: result.input_tokens + result.output_tokens,
      estimated_cost: estimatedCost,
      operation: 'photo_analysis',
      error: false,
    })

    await service
      .from('photos')
      .update({ analysis_status: 'complete' })
      .eq('id', photoId)

    return NextResponse.json({ findings_count: result.findings.length })
  } catch (err) {
    if (photoId) {
      await service.from('photos').update({ analysis_status: 'failed' }).eq('id', photoId)
      if (accountId) {
        await service.from('ai_usage_log').insert({
          account_id: accountId,
          job_id: jobId ?? null,
          photo_id: photoId,
          model: 'claude-sonnet-4-6',
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0,
          estimated_cost: 0,
          operation: 'photo_analysis',
          error: true,
        })
      }
    }
    console.error('[analyze]', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
