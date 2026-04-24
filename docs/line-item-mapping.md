# RoofEstimate AI - Line Item Mapping

## Overview
Line item mapping is the process of converting confirmed findings into priced estimate line items. It is one of the three hardest problems in the MVP. This document defines the data design, mapping logic, quantity handling, and contractor assembly flow.

---

## Core Questions Answered

### Is it 1:1 finding to line item?
No. The relationship is flexible:
- One finding can map to one line item (most common)
- One finding can map to multiple line items (e.g. damaged flashing may require both removal and replacement as separate line items)
- Multiple findings can map to the same line item (e.g. granule loss across three areas rolls up into one "partial re-roof" line item)

The contractor controls the final assembly. The AI suggests, the contractor confirms.

### Who inputs quantities?
Split responsibility:
- **AI estimates where possible** - if the image provides enough context (visible ridge line, countable tiles, measurable area), Claude should attempt a quantity estimate and flag its confidence
- **Contractor confirms or overrides** - quantities are always editable before the estimate is finalised
- **Manual input as fallback** - for anything the AI cannot reliably estimate (linear feet of flashing, exact square footage), the UI prompts the contractor to enter the value

Quantities should never be silently assumed. If unknown, the field is blank and flagged for contractor input before the estimate can be generated.

### How does the service catalog map to findings?
Three-tier matching:
1. **Exact match** - finding issue type matches a catalog item directly
2. **AI-suggested match** - Claude suggests the closest catalog item based on the finding description and knowledge base context
3. **Contractor override** - contractor selects a different catalog item or types a custom line item

---

## Data Model

```sql
service_catalog (
  id              uuid primary key,
  account_id      uuid references accounts(id),
  name            text,           -- "Chimney flashing reseal"
  description     text,           -- shown in estimate
  unit            text,           -- each | linear_ft | sq_ft | sq_m | hour
  default_price   decimal(10,2),
  issue_types     text[],         -- finding issue_types this maps to
  active          boolean default true
)

line_items (
  id              uuid primary key,
  estimate_id     uuid references estimates(id),
  account_id      uuid references accounts(id),
  finding_id      uuid references findings(id) nullable, -- null if manually added
  catalog_item_id uuid references service_catalog(id) nullable,

  -- Editable fields
  name            text,
  description     text,
  unit            text,
  quantity        decimal(10,2),
  unit_price      decimal(10,2),
  total_price     decimal(10,2) generated always as (quantity * unit_price) stored,

  -- State
  quantity_source text,   -- ai_estimated | contractor_entered | default
  ai_quantity     decimal(10,2) nullable,  -- original AI estimate preserved
  sort_order      integer,
  notes           text
)
```

---

## Mapping Flow

```
Confirmed finding
      ↓
AI suggests catalog item + quantity estimate
      ↓
Contractor reviews suggested line item
      ↓
Confirm / edit catalog item / edit quantity / edit price
      ↓
Add to estimate
      ↓
Contractor can add manual line items not tied to findings
      ↓
Estimate totalled and sent to PDF
```

---

## Quantity Estimation by Issue Type

| Issue Type | Unit | AI Estimation Approach |
|---|---|---|
| Missing/damaged shingles | sq_ft | Estimate from bounding box relative to visible roof area |
| Flashing issues | linear_ft | Estimate from visible run length - flag low confidence |
| Ridge cap damage | linear_ft | Estimate from ridge visibility |
| Gutter issues | linear_ft | Estimate from visible gutter run |
| Flat roof membrane | sq_ft | Estimate from affected area bounding box |
| Puncture/impact damage | each | Count discrete instances |
| Skylight/vent issues | each | Count visible units |
| General re-roof | square (100 sq_ft) | Do not estimate - require contractor input |

AI quantity estimates must always include a confidence level (high / medium / low). Low confidence estimates are flagged visually in the review UI.

---

## Estimate Assembly UI

The estimate assembly screen is separate from the photo review screen. It shows:

1. **AI-suggested line items** - grouped by finding, with quantities and prices pre-filled where available
2. **Flagged items** - quantities marked unknown, requiring contractor input before proceeding
3. **Manual add** - contractor can add line items not tied to any finding (e.g. site cleanup, travel)
4. **Reorder** - drag to reorder line items for logical grouping in the PDF
5. **Subtotal / total** - live calculation as items are confirmed

The estimate cannot be sent to PDF generation while any quantity is flagged as unknown.

---

## Service Catalog Design for MVP

For the initial contractor, manually populate the service catalog before launch. Recommended starting structure:

- Work with the contractor to list their 20-30 most common services
- Record: name, description, unit, typical price range
- Record: which issue types each service applies to
- This becomes the seed data for their account

The self-serve catalog editor (Phase 5) allows them to maintain this independently going forward.

---

## Edge Cases

- **Finding has no matching catalog item** - show "unmatched" state, prompt contractor to select manually or add to catalog
- **Contractor adds a new issue type not in catalog** - capture it, flag for catalog addition, allow one-off custom line item
- **Quantity AI estimate is clearly wrong** - preserve ai_quantity in DB for model evaluation, contractor override is the source of truth
- **Same issue type found in multiple photos** - suggest rollup into single line item with combined quantity, contractor decides
- **Zero quantity** - not allowed, line item must have quantity > 0 to be included in estimate
