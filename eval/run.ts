import * as fs from 'fs'
import * as path from 'path'
import sharp from 'sharp'
import 'dotenv/config'
import { analyzePhoto, type AccountKnowledgeBase, type Finding } from '../lib/ai/service'

// --- Thresholds (from docs/eval-harness.md) ---
const THRESHOLD_RECALL = 0.85
const THRESHOLD_PRECISION = 0.80
const THRESHOLD_HALLUCINATION = 0.10

// --- Draft knowledge base — replace with the contractor's actual catalog before Phase 3 ---
// This draft is intentionally broad; iterate with the contractor during Phase 0 review.
const KNOWLEDGE_BASE: AccountKnowledgeBase = {
  company_name: 'Your Roofing Company',
  materials: [
    'Architectural asphalt shingles',
    '3-tab asphalt shingles',
    'Metal roofing (standing seam and corrugated)',
    'TPO / EPDM flat roofing',
    'Modified bitumen',
    'Wood shake',
  ],
  service_catalog: [
    {
      name: 'Shingle Replacement',
      description: 'Replace damaged, cracked, or missing shingles',
      unit: 'square (100 sq ft)',
      issue_types: ['cracked_shingle', 'missing_shingle', 'granule_loss', 'hail_damage', 'wind_damage', 'lifted_shingle'],
    },
    {
      name: 'Flashing Repair',
      description: 'Repair or reseal step flashing, drip edge, or counter flashing',
      unit: 'linear ft',
      issue_types: ['lifted_flashing', 'failed_sealant_at_flashing', 'separated_flashing'],
    },
    {
      name: 'Flashing Replacement',
      description: 'Full replacement of deteriorated or improperly installed flashing',
      unit: 'linear ft',
      issue_types: ['improper_flashing', 'rusted_flashing', 'corroded_flashing'],
    },
    {
      name: 'Valley Repair',
      description: 'Repair damaged or deteriorated roof valley',
      unit: 'linear ft',
      issue_types: ['damaged_valley', 'cracked_valley', 'open_valley'],
    },
    {
      name: 'Ridge Cap Replacement',
      description: 'Replace deteriorated or missing ridge cap shingles',
      unit: 'linear ft',
      issue_types: ['damaged_ridge_cap', 'missing_ridge_cap', 'cracked_ridge_cap'],
    },
    {
      name: 'Pipe Boot / Vent Flashing Replacement',
      description: 'Replace failed rubber boot or flashing around roof penetrations',
      unit: 'each',
      issue_types: ['pipe_boot_failure', 'cracked_pipe_boot', 'failed_vent_flashing'],
    },
    {
      name: 'Chimney Flashing Repair',
      description: 'Repair or replace chimney step flashing and counter flashing',
      unit: 'each',
      issue_types: ['improper_chimney_flashing', 'rusted_chimney_flashing', 'lifted_chimney_flashing'],
    },
    {
      name: 'Roof Cleaning',
      description: 'Soft wash removal of moss, algae, and lichen growth',
      unit: 'square (100 sq ft)',
      issue_types: ['moss_growth', 'algae_growth', 'lichen_growth'],
    },
    {
      name: 'Gutter Repair',
      description: 'Repair sagging, leaking, or damaged gutters and downspouts',
      unit: 'linear ft',
      issue_types: ['sagging_gutters', 'clogged_gutters', 'leaking_gutters', 'damaged_gutters'],
    },
    {
      name: 'Fascia / Soffit Repair',
      description: 'Replace rotted or damaged fascia or soffit boards',
      unit: 'linear ft',
      issue_types: ['rotted_fascia', 'rotted_soffit', 'damaged_fascia', 'damaged_soffit'],
    },
    {
      name: 'Sealant / Caulk Application',
      description: 'Apply or reapply roofing sealant at penetrations, seams, or exposed fasteners',
      unit: 'each',
      issue_types: ['exposed_nails', 'open_seam', 'failed_sealant'],
    },
    {
      name: 'Full Roof Replacement',
      description: 'Complete tear-off and replacement of roofing system',
      unit: 'square (100 sq ft)',
      issue_types: ['end_of_life', 'widespread_damage', 'multiple_layers', 'structural_damage'],
    },
  ],
  terminology:
    '"Square" means 100 square feet. Note if damage appears storm-related (hail, wind) — important for insurance documentation. Distinguish between "repair" (localized) and "replacement" (full section) in descriptions.',
}

// --- Types ---

interface ExpectedFinding {
  issue_type: string
  severity?: string
  required: boolean
}

interface ExpectedPhoto {
  photo_id: string
  filename: string
  expected_findings: ExpectedFinding[]
  expected_finding_count_min?: number
  expected_finding_count_max?: number
  notes?: string
}

interface PhotoResult {
  photo_id: string
  filename: string
  status: 'pass' | 'partial' | 'fail' | 'error'
  findings_returned: number
  required_found: number
  required_total: number
  hallucinations: number
  input_tokens?: number
  output_tokens?: number
  error?: string
  findings?: Finding[]
}

// --- Helpers ---

function scorePhoto(
  findings: Finding[],
  expected: ExpectedPhoto
): Omit<PhotoResult, 'photo_id' | 'filename' | 'input_tokens' | 'output_tokens' | 'error'> {
  const required = expected.expected_findings.filter(e => e.required)

  const requiredFound = required.filter(req =>
    findings.some(f => f.issue_type === req.issue_type)
  ).length

  const hallucinations = findings.filter(
    f => !expected.expected_findings.some(e => e.issue_type === f.issue_type)
  ).length

  let status: 'pass' | 'partial' | 'fail'
  if (requiredFound < required.length) {
    status = 'fail'
  } else if (hallucinations > 0) {
    status = 'partial'
  } else {
    status = 'pass'
  }

  return {
    status,
    findings_returned: findings.length,
    required_found: requiredFound,
    required_total: required.length,
    hallucinations,
    findings,
  }
}

async function loadAndResizeImage(
  imagePath: string
): Promise<{ base64: string; mimeType: 'image/jpeg' | 'image/png' | 'image/webp' }> {
  const ext = path.extname(imagePath).toLowerCase()
  const mimeType: 'image/jpeg' | 'image/png' | 'image/webp' =
    ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'

  const resized = await sharp(imagePath)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .toBuffer()

  return { base64: resized.toString('base64'), mimeType }
}

// --- Main ---

async function main() {
  const photosDir = path.join(__dirname, 'photos')
  const expectedPath = path.join(__dirname, 'expected.json')
  const resultsDir = path.join(__dirname, 'results')

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set. Add it to .env or your environment.')
    process.exit(1)
  }

  if (!fs.existsSync(expectedPath)) {
    console.error('eval/expected.json not found.')
    process.exit(1)
  }

  const expected: ExpectedPhoto[] = JSON.parse(fs.readFileSync(expectedPath, 'utf-8'))

  if (expected.length === 0) {
    console.log('eval/expected.json is empty — nothing to evaluate.')
    console.log('Add photos to eval/photos/ and label them in eval/expected.json to run the harness.')
    process.exit(0)
  }

  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true })
  if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true })

  const results: PhotoResult[] = []
  let totalRequired = 0
  let totalRequiredFound = 0
  let totalFindings = 0
  let totalHallucinations = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0

  console.log(`Running eval on ${expected.length} photo(s)...\n`)

  for (const photo of expected) {
    const photoPath = path.join(photosDir, photo.filename)
    process.stdout.write(`  ${photo.filename}... `)

    if (!fs.existsSync(photoPath)) {
      console.log('MISSING FILE')
      results.push({
        photo_id: photo.photo_id,
        filename: photo.filename,
        status: 'error',
        findings_returned: 0,
        required_found: 0,
        required_total: photo.expected_findings.filter(e => e.required).length,
        hallucinations: 0,
        error: 'Photo file not found in eval/photos/',
      })
      continue
    }

    try {
      const { base64, mimeType } = await loadAndResizeImage(photoPath)
      const analysis = await analyzePhoto(base64, mimeType, KNOWLEDGE_BASE)
      const score = scorePhoto(analysis.findings, photo)

      results.push({
        photo_id: photo.photo_id,
        filename: photo.filename,
        input_tokens: analysis.input_tokens,
        output_tokens: analysis.output_tokens,
        ...score,
      })

      totalRequired += score.required_total
      totalRequiredFound += score.required_found
      totalFindings += score.findings_returned
      totalHallucinations += score.hallucinations
      totalInputTokens += analysis.input_tokens
      totalOutputTokens += analysis.output_tokens

      const label = score.status.toUpperCase().padEnd(7)
      const detail = `${score.required_found}/${score.required_total} required found, ${score.hallucinations} hallucination(s)`
      console.log(`${label} ${detail}`)

      if (photo.notes) {
        console.log(`         note: ${photo.notes}`)
      }
    } catch (err) {
      console.log('ERROR')
      console.error(`         ${err}`)
      results.push({
        photo_id: photo.photo_id,
        filename: photo.filename,
        status: 'error',
        findings_returned: 0,
        required_found: 0,
        required_total: photo.expected_findings.filter(e => e.required).length,
        hallucinations: 0,
        error: String(err),
      })
    }
  }

  // Metrics
  const recall = totalRequired > 0 ? totalRequiredFound / totalRequired : 1
  const precision = totalFindings > 0 ? (totalFindings - totalHallucinations) / totalFindings : 1
  const hallucinationRate = totalFindings > 0 ? totalHallucinations / totalFindings : 0

  const passed = results.filter(r => r.status === 'pass').length
  const partial = results.filter(r => r.status === 'partial').length
  const failed = results.filter(r => r.status === 'fail').length
  const errors = results.filter(r => r.status === 'error').length

  // Approximate cost at Sonnet pricing: ~$3/M input, ~$15/M output
  const estimatedCost = (totalInputTokens / 1_000_000) * 3 + (totalOutputTokens / 1_000_000) * 15

  const summary = {
    run_at: new Date().toISOString(),
    photo_count: expected.length,
    pass: passed,
    partial,
    fail: failed,
    error: errors,
    recall: Math.round(recall * 1000) / 1000,
    precision: Math.round(precision * 1000) / 1000,
    hallucination_rate: Math.round(hallucinationRate * 1000) / 1000,
    thresholds: {
      recall: THRESHOLD_RECALL,
      precision: THRESHOLD_PRECISION,
      hallucination: THRESHOLD_HALLUCINATION,
    },
    tokens: { input: totalInputTokens, output: totalOutputTokens },
    estimated_cost_usd: Math.round(estimatedCost * 10000) / 10000,
    photos: results,
  }

  const dateStr = new Date().toISOString().split('T')[0]
  const resultsFile = path.join(resultsDir, `${dateStr}.json`)
  fs.writeFileSync(resultsFile, JSON.stringify(summary, null, 2))

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`
  const check = (pass: boolean) => (pass ? '✓' : '✗ BELOW THRESHOLD')

  console.log('\n─── RESULTS ──────────────────────────────────────')
  console.log(`Photos:        ${expected.length}  |  Pass: ${passed}  Partial: ${partial}  Fail: ${failed}  Error: ${errors}`)
  console.log(`Recall:        ${pct(recall).padEnd(7)} (threshold ${pct(THRESHOLD_RECALL)})  ${check(recall >= THRESHOLD_RECALL)}`)
  console.log(`Precision:     ${pct(precision).padEnd(7)} (threshold ${pct(THRESHOLD_PRECISION)})  ${check(precision >= THRESHOLD_PRECISION)}`)
  console.log(`Hallucination: ${pct(hallucinationRate).padEnd(7)} (threshold ${pct(THRESHOLD_HALLUCINATION)})  ${hallucinationRate <= THRESHOLD_HALLUCINATION ? '✓' : '✗ ABOVE THRESHOLD'}`)
  console.log(`Tokens:        ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out  (~$${estimatedCost.toFixed(4)})`)
  console.log(`Results:       ${resultsFile}`)
  console.log('──────────────────────────────────────────────────')

  const thresholdsFailed =
    recall < THRESHOLD_RECALL ||
    precision < THRESHOLD_PRECISION ||
    hallucinationRate > THRESHOLD_HALLUCINATION

  if (thresholdsFailed) {
    console.log('\nEval FAILED — one or more thresholds not met.\n')
    process.exit(1)
  }

  console.log('\nAll thresholds met.\n')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
