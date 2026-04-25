# RoofEstimate AI - Claude Code Instructions

## Constraints
- Ask before creating any new files not established in the project structure below
- Ask before installing any new packages
- Make small, focused commits — one feature at a time
- Do not proceed to the next project phase without confirmation

## Context
- See PROGRESS.md for current state (if present)
- See `docs/` for full project specs and design documents (index at bottom of this file)

## File Reading Priority
Start each session by reading PROGRESS.md only. Consult docs and other files only when
you need specific implementation details. Do not ingest the full codebase on every
session start.

<!-- Model Routing and Session Health are defined in ~/.claude/CLAUDE.md -->

## CLAUDE.md Maintenance
Universal instructions (Model Routing, Session Health) live in `~/.claude/CLAUDE.md` and
apply to all projects automatically — do not duplicate them here.

This file contains only project-specific sections. When improving shared instructions,
edit `~/.claude/CLAUDE.md` only.

---

## What We Are Building

A mobile-friendly web app for roofing contractors that turns on-site roof photos into
professional PDF estimate documents using AI image analysis.

**Core flow:**
```
Contractor uploads photos → AI analyzes and suggests findings → Contractor reviews/edits → PDF estimate generated
```

**Initial user:** A single roofing contractor (contact details stored separately)
**Target:** Single-contractor MVP first, then multi-tenant SaaS product for roofing industry

---

## Stack (Do Not Deviate Without Discussion)

| Layer | Technology | Notes |
|---|---|---|
| Frontend + Backend | Next.js (App Router) | Single repo, API routes for backend |
| Database + Auth + Storage | Supabase | Postgres, email/password auth, photo storage |
| AI | Anthropic Claude API (claude-sonnet-4-6) | Vision, abstracted behind service module |
| PDF | React-PDF (@react-pdf/renderer) | Puppeteer is explicitly ruled out - see docs/architecture.md |
| Hosting | Vercel | Avoid Vercel-proprietary features for portability |

---

## Project Structure

```
/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Login, signup pages
│   ├── (app)/                  # Protected app routes
│   │   ├── jobs/               # Job list + creation
│   │   ├── jobs/[id]/          # Job detail, photo upload
│   │   ├── jobs/[id]/review/   # AI findings review per photo
│   │   ├── jobs/[id]/estimate/ # Line item assembly
│   │   └── settings/           # Knowledge base / service catalog editor
│   └── api/                    # API routes
│       ├── jobs/
│       ├── photos/
│       ├── findings/
│       ├── estimates/
│       └── ai/                 # AI analysis endpoint
├── lib/
│   ├── ai/
│   │   └── service.ts          # ALL Claude API calls live here and ONLY here
│   ├── pdf/
│   │   └── template.tsx        # React-PDF estimate template
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   └── utils/
│       └── image.ts            # Compression, resize, blur detection
├── components/
│   ├── annotation/             # Konva.js bounding box UI
│   ├── estimate/               # Line item assembly UI
│   └── ui/                     # Shared UI components
├── eval/                       # Phase 0 + ongoing AI eval harness
│   ├── photos/                 # Raw unannotated test photos
│   ├── expected.json           # Ground truth findings per photo
│   └── run.ts                  # Eval script
├── docs/                       # Supporting design documents (see index below)
├── supabase/
│   └── migrations/             # Database migrations
├── CLAUDE.md                   # This file
└── PROGRESS.md                 # Current build state (update as phases complete)
```

---

## Database Schema

Apply as Supabase migrations. Every table includes `account_id` - multi-tenancy is
non-negotiable from day one.

```sql
create table accounts (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text,
  phone         text,
  logo_url      text,
  primary_color text default '#7C3AED',
  created_at    timestamp default now()
);

create table users (
  id            uuid primary key references auth.users(id),
  account_id    uuid references accounts(id) not null,
  name          text,
  role          text default 'owner',
  created_at    timestamp default now()
);

create table jobs (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid references accounts(id) not null,
  created_by    uuid references users(id),
  client_name   text not null,
  address       text not null,
  city          text,
  state         text,
  zip           text,
  status        text default 'inspecting', -- inspecting | reviewing | estimating | complete
  notes         text,
  created_at    timestamp default now(),
  updated_at    timestamp default now()
);

create table photos (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid references jobs(id) not null,
  account_id      uuid references accounts(id) not null,
  storage_path    text not null,
  filename        text,
  width           integer,
  height          integer,
  analysis_status text default 'pending', -- pending | processing | complete | failed
  created_at      timestamp default now()
);

create table findings (
  id              uuid primary key default gen_random_uuid(),
  photo_id        uuid references photos(id) not null,
  job_id          uuid references jobs(id) not null,
  account_id      uuid references accounts(id) not null,
  box_x           float,   -- % of image width, left edge
  box_y           float,   -- % of image height, top edge
  box_width       float,
  box_height      float,
  issue_type      text,
  severity        text,    -- low | medium | high | critical
  description     text,
  suggested_service text,
  status          text default 'ai_suggested', -- ai_suggested | confirmed | rejected | edited
  confidence      text,    -- low | medium | high | null (null = contractor-added)
  ai_raw          jsonb,   -- original AI output, never modified
  edited_at       timestamp,
  confirmed_at    timestamp,
  confirmed_by    uuid references users(id),
  created_at      timestamp default now()
);

create table service_catalog (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid references accounts(id) not null,
  name            text not null,
  description     text,
  unit            text,    -- each | linear_ft | sq_ft | sq_m | hour
  default_price   decimal(10,2),
  issue_types     text[],
  active          boolean default true,
  sort_order      integer,
  created_at      timestamp default now()
);

create table estimates (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid references jobs(id) not null,
  account_id      uuid references accounts(id) not null,
  created_by      uuid references users(id),
  title           text,
  intro_text      text,
  status          text default 'draft', -- draft | final
  pdf_path        text,
  subtotal        decimal(10,2),
  discount        decimal(10,2) default 0,
  total           decimal(10,2),
  created_at      timestamp default now(),
  updated_at      timestamp default now()
);

create table line_items (
  id              uuid primary key default gen_random_uuid(),
  estimate_id     uuid references estimates(id) not null,
  account_id      uuid references accounts(id) not null,
  finding_id      uuid references findings(id),
  catalog_item_id uuid references service_catalog(id),
  name            text not null,
  description     text,
  unit            text,
  quantity        decimal(10,2),
  unit_price      decimal(10,2),
  quantity_source text,    -- ai_estimated | contractor_entered | default
  ai_quantity     decimal(10,2),
  sort_order      integer,
  notes           text,
  created_at      timestamp default now()
);

create table ai_usage_log (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid references accounts(id) not null,
  job_id          uuid references jobs(id),
  photo_id        uuid references photos(id),
  model           text,
  input_tokens    integer,
  output_tokens   integer,
  total_tokens    integer,
  estimated_cost  decimal(10,6),
  operation       text,    -- photo_analysis | other
  error           boolean default false,
  created_at      timestamp default now()
);
```

---

## AI Service Module

All Claude API calls must go through `lib/ai/service.ts`. Never call the API directly
anywhere else in the codebase.

```typescript
// lib/ai/service.ts — the ONLY file that imports from @anthropic-ai/sdk

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

export async function analyzePhoto(
  imageBase64: string,
  knowledgeBase: AccountKnowledgeBase
): Promise<AnalysisResult>
```

Rules:
- Log to `ai_usage_log` immediately after every call, even on error
- Prompt must enforce JSON-only response
- Inject account knowledge base on every call
- Compress images to max 1200px long edge before sending

---

## Key Implementation Rules

### Never break these:
1. Every DB query must filter by `account_id` - no exceptions
2. AI findings are suggestions only - never write to an estimate without contractor confirmation
3. Store `ai_raw` on every finding before any editing occurs
4. Bounding boxes stored as percentages (0-100), not pixels
5. Log every AI call to `ai_usage_log` - including failed calls
6. Do not use Vercel edge functions, image optimization, or any Vercel-proprietary APIs

### Image handling:
- Compress and resize to max 1200px long edge before storing and before sending to Claude
- Use the same compressed version for both storage and AI analysis
- Detect blur client-side via Laplacian variance before upload - warn but do not block
- Never re-call the AI API when regenerating a PDF - use cached findings

### PDF:
- Use `@react-pdf/renderer` only
- Template must support per-account branding: logo, business name, contact details, primary color
- Composite bounding boxes onto images server-side using `sharp` before embedding in PDF
- Estimate cannot be generated while any line item has a null quantity

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

---

## Current Build Phase

**Phases 1–4 complete.** End-to-end flow working: photo upload → AI analysis → findings review (with bounding box annotations) → estimate assembly → PDF download.

**Phase 0 (parallel track — still open)**
- Eval harness and preview script working; 25 photos collected
- Remaining: label `eval/expected.json`, run eval, iterate until thresholds pass
- Run eval: `npm run eval` (Recall ≥ 85%, Precision ≥ 80%, Hallucination ≤ 10%)

**Currently: Phase 6 — Polish + Handoff**
- PDF template visual polish (fonts, spacing, layout)
- Mobile UX cleanup
- Error handling and loading states

See `PROGRESS.md` for full detail on completed work and known issues.
See `docs/mvp-scope-and-build-plan.md` for all phases and deliverables.

---

## PDF Template Reference

Modelled on a real contractor estimate. Structure:
1. Cover page - contractor logo, job address, date
2. Introduction - narrative describing findings and options
3. Inspection section - annotated photos with numbered findings
4. Estimate section - line items, quantities, unit prices, totals, discount
5. Signing page - option checkboxes, client name/address, signature line, date

---

## Eval Harness

Run before any prompt or knowledge base change:

```bash
npx tsx eval/run.ts
```

Exits with code 1 if recall < 85% or precision < 80%. Must pass before merging.
See `docs/eval-harness.md` for full details.

---

## Supporting Docs Index

| File | Contents |
|---|---|
| docs/project-overview.md | Problem, user, value proposition |
| docs/architecture.md | Stack decisions, cost tracking, scalability |
| docs/annotation.md | Bounding box design, Konva.js UI, sharp PDF rendering |
| docs/line-item-mapping.md | Finding to line item logic, quantity estimation, assembly UI |
| docs/ai-strategy.md | Prompt tuning, model switching, ML considerations |
| docs/eval-harness.md | Labeled dataset, scoring, CI integration |
| docs/mvp-scope-and-build-plan.md | Phase breakdown, deliverables, success criteria |
| docs/product-decisions-and-roadmap.md | Settled decisions, moat, future roadmap |
