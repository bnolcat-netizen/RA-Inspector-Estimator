/**
 * Preview script — runs photos through Claude without requiring expected.json labels.
 * Use this to inspect raw AI output and iterate on the prompt during Phase 0.
 *
 * Usage:
 *   npm run preview                   # analyze all photos in eval/photos/
 *   npm run preview -- photo_001.jpg  # analyze a single photo
 */

import * as fs from 'fs'
import * as path from 'path'
import sharp from 'sharp'
import 'dotenv/config'
import { analyzePhoto, type AccountKnowledgeBase, type Finding } from '../lib/ai/service'

// Keep in sync with eval/run.ts
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

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

function severityLabel(s: string): string {
  return { critical: 'CRITICAL', high: 'HIGH    ', medium: 'MEDIUM  ', low: 'LOW     ' }[s] ?? s.toUpperCase()
}

function printFinding(f: Finding, index: number) {
  const qty = f.quantity_estimate != null
    ? ` (~${f.quantity_estimate} ${f.quantity_unit ?? ''}, ${f.quantity_confidence ?? '?'} confidence)`
    : ''
  const box = `x=${f.box.x.toFixed(0)}% y=${f.box.y.toFixed(0)}% ${f.box.width.toFixed(0)}%×${f.box.height.toFixed(0)}%`

  console.log(`  [${index}] ${severityLabel(f.severity)} ${f.issue_type}  (confidence: ${f.confidence})`)
  console.log(`       ${f.description}`)
  console.log(`       Service: ${f.suggested_service}${qty}`)
  console.log(`       Box:     ${box}`)
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

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set. Add it to .env or your environment.')
    process.exit(1)
  }

  const photosDir = path.join(__dirname, 'photos')
  const resultsDir = path.join(__dirname, 'results')

  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true })

  // Resolve which photos to process
  const arg = process.argv[2]
  let filenames: string[]

  if (arg) {
    if (!fs.existsSync(path.join(photosDir, arg))) {
      console.error(`Photo not found: eval/photos/${arg}`)
      process.exit(1)
    }
    filenames = [arg]
  } else {
    if (!fs.existsSync(photosDir)) {
      console.error('eval/photos/ directory not found.')
      process.exit(1)
    }
    filenames = fs.readdirSync(photosDir)
      .filter(f => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
      .sort()
  }

  if (filenames.length === 0) {
    console.log('No images found in eval/photos/. Drop some photos there and re-run.')
    process.exit(0)
  }

  console.log(`\nPreviewing ${filenames.length} photo(s) — no labels required\n`)

  const runResults: object[] = []
  let totalIn = 0
  let totalOut = 0

  for (let i = 0; i < filenames.length; i++) {
    const filename = filenames[i]
    const photoPath = path.join(photosDir, filename)

    console.log(`${'─'.repeat(60)}`)
    console.log(`Photo ${i + 1}/${filenames.length}: ${filename}`)
    console.log(`${'─'.repeat(60)}`)

    try {
      const { base64, mimeType } = await loadAndResizeImage(photoPath)
      const result = await analyzePhoto(base64, mimeType, KNOWLEDGE_BASE)

      totalIn += result.input_tokens
      totalOut += result.output_tokens

      if (result.findings.length === 0) {
        console.log('  (no findings returned)')
      } else {
        const sorted = [...result.findings].sort(
          (a, b) => (SEVERITY_ORDER[a.severity as keyof typeof SEVERITY_ORDER] ?? 9)
                  - (SEVERITY_ORDER[b.severity as keyof typeof SEVERITY_ORDER] ?? 9)
        )
        sorted.forEach((f, idx) => printFinding(f, idx + 1))
      }

      const cost = (result.input_tokens / 1_000_000) * 3 + (result.output_tokens / 1_000_000) * 15
      console.log(`\n  Tokens: ${result.input_tokens.toLocaleString()} in / ${result.output_tokens.toLocaleString()} out  (~$${cost.toFixed(4)})`)

      runResults.push({ filename, findings: result.findings, input_tokens: result.input_tokens, output_tokens: result.output_tokens })
    } catch (err) {
      console.log(`  ERROR: ${err}`)
      runResults.push({ filename, error: String(err) })
    }

    console.log()
  }

  // Summary
  const totalCost = (totalIn / 1_000_000) * 3 + (totalOut / 1_000_000) * 15
  console.log(`${'─'.repeat(60)}`)
  console.log(`Total tokens: ${totalIn.toLocaleString()} in / ${totalOut.toLocaleString()} out  (~$${totalCost.toFixed(4)})`)

  // Save results
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outFile = path.join(resultsDir, `preview-${ts}.json`)
  fs.writeFileSync(outFile, JSON.stringify({ run_at: new Date().toISOString(), photos: runResults }, null, 2))
  console.log(`Results saved: ${outFile}`)
  console.log()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
