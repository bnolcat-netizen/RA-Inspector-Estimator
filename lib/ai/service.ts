import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod/v4'

export interface Finding {
  box: { x: number; y: number; width: number; height: number }
  issue_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  suggested_service: string
  confidence: 'low' | 'medium' | 'high'
  quantity_estimate: number | null
  quantity_unit: string | null
  quantity_confidence: 'low' | 'medium' | 'high' | null
  notes?: string
}

export interface AnalysisResult {
  findings: Finding[]
  input_tokens: number
  output_tokens: number
}

export interface ServiceCatalogItem {
  name: string
  description?: string
  unit?: string
  issue_types?: string[]
}

export interface AccountKnowledgeBase {
  company_name: string
  materials?: string[]
  terminology?: string
  service_catalog: ServiceCatalogItem[]
}

const MODEL = 'claude-sonnet-4-6'

const client = new Anthropic({
  defaultHeaders: {
    'anthropic-beta': 'prompt-caching-2024-07-31',
  },
})

const SYSTEM_PROMPT = `You are an expert roofing inspector AI assistant. Your job is to analyze roof photos and identify issues, damage, and maintenance needs for a professional roofing contractor.

INSTRUCTIONS:
- Examine the photo carefully for all visible roofing issues, damage, wear, and maintenance needs
- Identify the location of each issue using a bounding box
- Assess severity based on risk to the building and urgency of repair
- Suggest the most appropriate service from the contractor's service catalog
- Estimate quantities where clearly visible (e.g., approximate square footage of damage, linear feet of flashing)
- Be conservative: report only what you can clearly see; do not speculate about hidden or non-visible areas
- If the photo is too blurry, dark, or unclear to reliably analyze, return an empty findings array
- Use issue_type "other" only for genuine issues that do not match any listed type; always populate notes when using "other"

BOUNDING BOX FORMAT:
- x, y: percentage coordinates of the top-left corner (0 = left/top edge, 100 = right/bottom edge)
- width, height: dimensions as percentages of the full image width/height

SEVERITY GUIDE:
- critical: Active leak, structural compromise, or immediate safety hazard — repair within days
- high: Will cause damage soon if unaddressed; end-of-life materials — repair this season
- medium: Maintenance needed; will worsen over time — schedule soon
- low: Cosmetic or early-stage wear — monitor or address at next service visit`

function buildAnalysisSchema(kb: AccountKnowledgeBase) {
  const issueTypeSet = new Set<string>()
  for (const item of kb.service_catalog) {
    for (const type of item.issue_types ?? []) {
      issueTypeSet.add(type)
    }
  }
  issueTypeSet.add('other')

  const issueTypes = [...issueTypeSet] as [string, ...string[]]
  const serviceNames = kb.service_catalog.map(item => item.name) as [string, ...string[]]

  return z.object({
    findings: z.array(
      z.object({
        box: z.object({
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
        }),
        issue_type: z.enum(issueTypes),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        description: z.string(),
        suggested_service: z.enum(serviceNames),
        confidence: z.enum(['low', 'medium', 'high']),
        quantity_estimate: z.number().nullable(),
        quantity_unit: z.string().nullable(),
        quantity_confidence: z.enum(['low', 'medium', 'high']).nullable(),
        notes: z.string().optional(),
      })
    ),
  })
}

function formatKnowledgeBase(kb: AccountKnowledgeBase): string {
  const lines: string[] = [`CONTRACTOR: ${kb.company_name}`]

  if (kb.materials?.length) {
    lines.push(`\nROOFING MATERIALS SERVICED:\n${kb.materials.join(', ')}`)
  }

  lines.push('\nSERVICE CATALOG AND VALID ISSUE TYPES:')
  for (const item of kb.service_catalog) {
    let line = `- ${item.name}`
    if (item.description) line += `: ${item.description}`
    if (item.unit) line += ` [unit: ${item.unit}]`
    if (item.issue_types?.length) line += `\n  Valid issue types: ${item.issue_types.join(', ')}`
    lines.push(line)
  }

  if (kb.terminology) {
    lines.push(`\nTERMINOLOGY AND PREFERENCES:\n${kb.terminology}`)
  }

  return lines.join('\n')
}

export async function analyzePhoto(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
  knowledgeBase: AccountKnowledgeBase
): Promise<AnalysisResult> {
  const schema = buildAnalysisSchema(knowledgeBase)

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        // @ts-ignore — cache_control is a valid beta field
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: formatKnowledgeBase(knowledgeBase),
          },
        ],
      },
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    output_config: { format: zodOutputFormat(schema as any) },
  })

  if (!response.parsed_output) {
    throw new Error('AI returned no structured output (possible refusal)')
  }

  return {
    findings: response.parsed_output.findings,
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
  }
}
