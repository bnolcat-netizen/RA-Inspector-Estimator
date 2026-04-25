import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { DEFAULT_KNOWLEDGE_BASE } from '@/lib/ai/knowledge-base'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const service = createServiceClient()

    const jobId = request.nextUrl.searchParams.get('job_id')
    if (!jobId) return NextResponse.json({ error: 'Missing job_id' }, { status: 400 })

    const { data: estimate } = await service
      .from('estimates')
      .select('id, title, status, subtotal, discount, total, intro_text')
      .eq('job_id', jobId)
      .eq('account_id', user.account_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ estimate })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const service = createServiceClient()
    const { job_id } = await request.json()

    if (!job_id) return NextResponse.json({ error: 'Missing job_id' }, { status: 400 })

    // Return existing draft if present
    const { data: existing } = await service
      .from('estimates')
      .select('id')
      .eq('job_id', job_id)
      .eq('account_id', user.account_id)
      .eq('status', 'draft')
      .maybeSingle()

    if (existing) return NextResponse.json({ estimate_id: existing.id })

    // Lazy-seed service catalog if account has none yet
    const { count } = await service
      .from('service_catalog')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', user.account_id)

    if ((count ?? 0) === 0) {
      await service.from('service_catalog').insert(
        DEFAULT_KNOWLEDGE_BASE.service_catalog.map((item, i) => ({
          account_id: user.account_id,
          name: item.name,
          description: item.description,
          unit: item.unit,
          issue_types: item.issue_types,
          default_price: null,
          active: true,
          sort_order: i,
        }))
      )
    }

    // Fetch catalog and confirmed findings
    const [{ data: catalogItems }, { data: findings }, { data: job }] = await Promise.all([
      service
        .from('service_catalog')
        .select('id, name, description, unit, default_price, issue_types')
        .eq('account_id', user.account_id)
        .eq('active', true),
      service
        .from('findings')
        .select('id, issue_type, severity, description, suggested_service')
        .eq('job_id', job_id)
        .eq('account_id', user.account_id)
        .in('status', ['confirmed', 'edited'])
        .order('created_at', { ascending: true }),
      service
        .from('jobs')
        .select('client_name, address, city, state, zip')
        .eq('id', job_id)
        .eq('account_id', user.account_id)
        .single(),
    ])

    const addressLine = [job?.address, job?.city, job?.state].filter(Boolean).join(', ')
    const title = `Estimate – ${job?.client_name ?? ''} – ${addressLine}`

    // Create estimate
    const { data: estimate, error: estError } = await service
      .from('estimates')
      .insert({
        job_id,
        account_id: user.account_id,
        created_by: user.id,
        title,
        status: 'draft',
        discount: 0,
      })
      .select('id')
      .single()

    if (estError || !estimate) {
      return NextResponse.json({ error: 'Failed to create estimate' }, { status: 500 })
    }

    // Map findings → line items
    const lineItems = (findings ?? []).map((finding, i) => {
      const match = (catalogItems ?? []).find(
        (cat) => Array.isArray(cat.issue_types) && cat.issue_types.includes(finding.issue_type)
      )
      return {
        estimate_id: estimate.id,
        account_id: user.account_id,
        finding_id: finding.id,
        catalog_item_id: match?.id ?? null,
        name: match?.name ?? finding.suggested_service ?? finding.issue_type,
        description: match?.description ?? finding.description,
        unit: match?.unit ?? null,
        unit_price: match?.default_price ?? null,
        quantity: null,
        quantity_source: null,
        sort_order: i,
      }
    })

    if (lineItems.length > 0) {
      await service.from('line_items').insert(lineItems)
    }

    return NextResponse.json({ estimate_id: estimate.id })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
