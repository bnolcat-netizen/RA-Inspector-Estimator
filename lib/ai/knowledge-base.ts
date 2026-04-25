import type { AccountKnowledgeBase } from './service'

// Draft knowledge base — replace with contractor's actual catalog via Phase 5 settings UI.
export const DEFAULT_KNOWLEDGE_BASE: AccountKnowledgeBase = {
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
