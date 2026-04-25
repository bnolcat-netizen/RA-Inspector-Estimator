import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import sharp from 'sharp'
import { getCurrentUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { EstimatePDF, type PdfEstimateData, type PdfPhoto } from '@/lib/pdf/template'
import React from 'react'

const SEVERITY_COLOR: Record<string, string> = {
  low: '#6b7280',
  medium: '#d97706',
  high: '#ea580c',
  critical: '#dc2626',
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

async function compositeAnnotations(
  imageBuffer: Buffer,
  findings: Array<{ box_x: number; box_y: number; box_width: number; box_height: number; severity: string }>
): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata()
  const w = meta.width ?? 800
  const h = meta.height ?? 600

  // Build SVG overlay with bounding boxes
  const rects = findings
    .filter((f) => f.box_x != null && f.box_y != null && f.box_width != null && f.box_height != null)
    .map((f, i) => {
      const x = Math.round((f.box_x / 100) * w)
      const y = Math.round((f.box_y / 100) * h)
      const bw = Math.round((f.box_width / 100) * w)
      const bh = Math.round((f.box_height / 100) * h)
      const color = SEVERITY_COLOR[f.severity] ?? '#6b7280'
      const [r, g, b] = hexToRgb(color)
      return `
        <rect x="${x}" y="${y}" width="${bw}" height="${bh}"
          fill="rgba(${r},${g},${b},0.15)" stroke="${color}" stroke-width="3" rx="2"/>
        <rect x="${x}" y="${Math.max(0, y - 22)}" width="22" height="22" fill="${color}" rx="11"/>
        <text x="${x + 11}" y="${Math.max(0, y - 6)}"
          text-anchor="middle" font-family="Arial" font-size="13" font-weight="bold" fill="white">${i + 1}</text>
      `
    })
    .join('')

  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${rects}</svg>`
  )

  return sharp(imageBuffer)
    .composite([{ input: svg, blend: 'over' }])
    .jpeg({ quality: 85 })
    .toBuffer()
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: estimateId } = await params
    const user = await getCurrentUser()
    const service = createServiceClient()

    // Fetch estimate
    const { data: estimate } = await service
      .from('estimates')
      .select('id, title, intro_text, status, subtotal, discount, total, job_id')
      .eq('id', estimateId)
      .eq('account_id', user.account_id)
      .single()

    if (!estimate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Fetch line items, job, account, photos+findings in parallel
    const [
      { data: lineItems },
      { data: job },
      { data: account },
      { data: photos },
    ] = await Promise.all([
      service
        .from('line_items')
        .select('id, name, description, unit, quantity, unit_price')
        .eq('estimate_id', estimateId)
        .eq('account_id', user.account_id)
        .order('sort_order', { ascending: true }),
      service
        .from('jobs')
        .select('client_name, address, city, state, zip')
        .eq('id', estimate.job_id)
        .single(),
      service
        .from('accounts')
        .select('name, email, phone, logo_url, primary_color')
        .eq('id', user.account_id)
        .single(),
      service
        .from('photos')
        .select('id, storage_path')
        .eq('job_id', estimate.job_id)
        .eq('account_id', user.account_id)
        .eq('analysis_status', 'complete'),
    ])

    // For each photo, fetch its confirmed findings and composite annotations
    const pdfPhotos: PdfPhoto[] = []

    for (const photo of photos ?? []) {
      const { data: findings } = await service
        .from('findings')
        .select('id, issue_type, severity, description, suggested_service, box_x, box_y, box_width, box_height')
        .eq('photo_id', photo.id)
        .eq('account_id', user.account_id)
        .in('status', ['confirmed', 'edited'])
        .order('created_at', { ascending: true })

      if (!findings?.length) continue

      // Download photo from storage
      const { data: fileData } = await service.storage
        .from('photos')
        .download(photo.storage_path)

      if (!fileData) continue

      const imageBuffer = Buffer.from(await fileData.arrayBuffer())
      const annotated = await compositeAnnotations(imageBuffer, findings)

      pdfPhotos.push({
        id: photo.id,
        annotatedImageBase64: annotated.toString('base64'),
        findings: findings.map((f) => ({
          id: f.id,
          issue_type: f.issue_type,
          severity: f.severity,
          description: f.description,
          suggested_service: f.suggested_service,
        })),
      })
    }

    // Fetch logo if present
    let logoBase64: string | null = null
    if (account?.logo_url) {
      try {
        const logoRes = await fetch(account.logo_url)
        if (logoRes.ok) {
          logoBase64 = Buffer.from(await logoRes.arrayBuffer()).toString('base64')
        }
      } catch {
        // Logo fetch failure is non-fatal
      }
    }

    const data: PdfEstimateData = {
      title: estimate.title ?? 'Estimate',
      intro_text: estimate.intro_text,
      client_name: job?.client_name ?? '',
      address: job?.address ?? '',
      city: job?.city ?? null,
      state: job?.state ?? null,
      zip: job?.zip ?? null,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      company_name: account?.name ?? 'Your Roofing Company',
      company_email: account?.email ?? null,
      company_phone: account?.phone ?? null,
      primary_color: account?.primary_color ?? '#7C3AED',
      logo_base64: logoBase64,
      photos: pdfPhotos,
      line_items: lineItems ?? [],
      subtotal: estimate.subtotal ?? 0,
      discount: estimate.discount ?? 0,
      total: estimate.total ?? 0,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(React.createElement(EstimatePDF, { data }) as any)

    const slug = (job?.client_name ?? 'estimate').replace(/\s+/g, '-').toLowerCase()
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="estimate-${slug}.pdf"`,
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
