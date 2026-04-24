import Anthropic from '@anthropic-ai/sdk'

export interface Finding {
  box: { x: number; y: number; width: number; height: number }
  issue_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  suggested_service: string
  confidence: 'low' | 'medium' | 'high'
  quantity_estimate?: number
  quantity_unit?: string
  quantity_confidence?: 'low' | 'medium' | 'high'
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

const MODEL = 'claude-sonnet-4-20250514'

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
- Return ONLY valid JSON matching the schema below — no explanation, no markdown fences, no preamble

BOUNDING BOX FORMAT:
- x, y: percentage coordinates of the top-left corner (0 = left/top edge, 100 = right/bottom edge)
- width, height: dimensions as percentages of the full image width/height

SEVERITY GUIDE:
- critical: Active leak, structural compromise, or immediate safety hazard — repair within days
- high: Will cause damage soon if unaddressed; end-of-life materials — repair this season
- medium: Maintenance needed; will worsen over time — schedule soon
- low: Cosmetic or early-stage wear — monitor or address at next service visit

RESPONSE SCHEMA — output exactly this structure, nothing else:
{
  "findings": [
    {
      "box": { "x": number, "y": number, "width": number, "height": number },
      "issue_type": string,
      "severity": "low" | "medium" | "high" | "critical",
      "description": string,
      "suggested_service": string,
      "confidence": "low" | "medium" | "high",
      "quantity_estimate": number | null,
      "quantity_unit": string | null,
      "quantity_confidence": "low" | "medium" | "high" | null
    }
  ]
}`

function formatKnowledgeBase(kb: AccountKnowledgeBase): string {
  const lines: string[] = [`CONTRACTOR: ${kb.company_name}`]

  if (kb.materials?.length) {
    lines.push(`\nROOFING MATERIALS SERVICED:\n${kb.materials.join(', ')}`)
  }

  lines.push('\nSERVICE CATALOG (use exact service names in suggested_service):')
  for (const item of kb.service_catalog) {
    let line = `- ${item.name}`
    if (item.description) line += `: ${item.description}`
    if (item.unit) line += ` [unit: ${item.unit}]`
    if (item.issue_types?.length) line += ` [addresses: ${item.issue_types.join(', ')}]`
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
  const response = await client.messages.create({
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
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

  let parsed: { findings: Finding[] }
  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error(`AI returned non-JSON response: ${rawText.slice(0, 300)}`)
  }

  return {
    findings: Array.isArray(parsed.findings) ? parsed.findings : [],
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
  }
}
