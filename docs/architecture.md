# RoofEstimate AI - Technical Architecture

## Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Next.js (React) | Mobile browser support, fast to build, works on iOS + Android |
| Backend | Next.js API routes | No separate service needed for MVP, extract later if required |
| Database | PostgreSQL via Supabase | Standard SQL = no lock-in, includes auth + file storage |
| AI | Anthropic Claude API (claude-sonnet) | Vision capability, abstracted for easy provider swap |
| PDF | React-PDF | Pure JS, no headless browser, reliable on Vercel serverless |
| Hosting | Vercel | Zero-config Next.js deployment, free tier sufficient for MVP |

## Architecture Diagram

```
[Mobile Browser]
      ↓
[Next.js App - Vercel]
      ↓
[API Routes]
   ↓          ↓
[Supabase]  [Claude API]
[DB + Auth    [Vision +
+ Storage]    Analysis]
      ↓
[PDF Generator]
      ↓
[Download / Share]
```

## Data Model

```
accounts         - one per contractor business
users            - scoped to account (supports future staff)
jobs             - one per roof inspection, scoped to account
photos           - many per job, stored in Supabase storage
findings         - AI-generated per photo, editable by user
line_items       - estimate lines linked to findings
service_catalog  - per-account knowledge base
estimates        - generated PDF metadata, linked to job
```

## AI Service Module
- All Claude API calls live in a single abstracted service module
- Takes in: photos + account knowledge base
- Returns: structured findings
- Swapping AI providers = changing this one file only
- Never call the AI API directly from anywhere else in the codebase

## Key Architectural Decisions

### Multi-tenancy
Every piece of data is scoped to an `account`. This is non-negotiable from day one.
Do not build for a single user and retrofit later.

### Knowledge Base Injection
Each account has its own service catalog and parameters.
This is injected into the AI prompt at runtime - no code changes needed when contractor updates their catalog.

### AI Provider Abstraction
Wrap all AI calls in a single service layer so switching providers (Anthropic → OpenAI → Gemini) is a config change, not a rewrite.

### Image Handling
- Compress and resize images before storing and before sending to Claude
- Cache AI findings so re-generating a PDF does not re-call the API
- Do not send more photos per API call than necessary

### PDF Branding Layer
The PDF template must support per-account branding from day one:
- Contractor logo
- Business name
- Contact details
- Color scheme

### PDF Generation: React-PDF (settled)
Puppeteer is explicitly ruled out for this stack:
- Chromium binary exceeds Vercel's 50MB Lambda limit
- Cold starts are unacceptable for a contractor waiting on-site
- React-PDF is pure JS, no headless browser, works reliably in serverless

Revisit only if template complexity genuinely demands a browser rendering engine (unlikely for this use case).

### Cost Tracking
Per-account API consumption must be logged from day one. Easy to add now, painful to backfill.

**Table:**
```sql
ai_usage_log (
  id              uuid primary key,
  account_id      uuid references accounts(id),
  job_id          uuid references jobs(id) nullable,
  photo_id        uuid references photos(id) nullable,
  model           text,           -- e.g. claude-sonnet-4-20250514
  input_tokens    integer,
  output_tokens   integer,
  total_tokens    integer,
  estimated_cost  decimal(10,6),  -- calculated at log time from known pricing
  operation       text,           -- photo_analysis | pdf_generation | other
  created_at      timestamp default now()
)
```

**Logging point:**
Log immediately after every AI service module call returns, before processing the response. Never skip logging even on error - log the attempt with a null token count and an error flag.

**Key metric to track from day one:**
`cost_per_estimate` = sum of `estimated_cost` for all AI calls associated with a job.
This is the primary input for future pricing decisions.

## Scalability Notes
- Supabase is plain Postgres - migratable to any host via connection string change
- Next.js runs anywhere - avoid Vercel-proprietary features (edge functions, image optimization) to keep migration straightforward
- Biggest cost drivers at scale are Claude API calls and Supabase storage (photos), not hosting
