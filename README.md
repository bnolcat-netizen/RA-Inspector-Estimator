# RoofEstimate AI

A mobile-friendly web app for roofing contractors that turns on-site roof photos into professional PDF estimates using Claude vision.

---

## What it does

- Snap or upload roof photos from your phone, on the job, in any browser.
- Claude vision automatically reviews each photo and suggests findings — what's wrong, how bad it is, and which service from your catalog fixes it.
- Confirm, edit, or reject each suggestion. Draw your own bounding boxes for things the AI missed.
- Auto-assemble a line-item estimate from confirmed findings, with quantities and prices pulled from your catalog.
- Download a branded PDF estimate ready to hand to the homeowner — cover page, annotated photos, line items, and signing page.

---

## The flow

```
   [ Take photos ]                [ AI reviews ]               [ You confirm ]
       on phone        ─────►     each photo       ─────►     edit / reject
                                  in seconds                  add manual boxes
                                                                     │
                                                                     ▼
                                                          [ Estimate assembles ]
                                                          line items + totals
                                                                     │
                                                                     ▼
                                                            [ Download PDF ]
                                                          branded, signing-ready
```

### Screen-by-screen walkthrough

| Screen | What you see |
|---|---|
| **Login / Sign up** | Email + password. Mobile-first form with branded violet button. |
| **Jobs list** | All your jobs, newest first, with status badge (`inspecting` / `reviewing` / `estimating` / `complete`). |
| **New Job** | Client name, street address, city, state, zip, optional notes. |
| **Job detail** | Job header, photo grid, "Add photos" button (camera or file picker). Each photo shows an analysis status badge (pending / processing / complete / failed). Buttons for "Review Findings" and "Build Estimate" appear once photos exist. |
| **Review Findings** | Annotated photo viewer with Konva.js bounding boxes. For each finding: severity, issue type, description, suggested service, confidence. Confirm / Edit / Reject buttons per finding. Toggle to show low-confidence findings (hidden by default). Draw mode lets you add boxes the AI missed. |
| **Build Estimate** | Line items auto-mapped from confirmed findings. Edit quantity, unit price, and notes inline. Live subtotal, discount, and total. Warnings for any line items missing a quantity. "Generate PDF" button at the bottom. |
| **Settings** | Service catalog editor — your knowledge base. Add, edit, deactivate services. Each service has a name, unit (each, linear_ft, sq_ft, hour, etc.), default price, and a list of `issue_types` it handles. Seeded from a sensible default catalog on your first visit. |
| **Feedback** | Analytics page showing confirmed / edited / rejected rates broken down by issue type. Use this to spot weak categories before tuning the prompt. |

---

## Getting started (self-hosting)

### Prerequisites

- **Node.js 20 or newer** (Next.js 16 + React 19)
- A **Supabase project** — free tier is fine. You need the project URL, anon key, and service-role key.
- An **Anthropic API key** with access to `claude-sonnet-4-6`.
- npm (bundled with Node).

### Clone and install

```bash
git clone https://github.com/bnolcat-netizen/RA-Inspector-Estimator.git
cd RA-Inspector-Estimator
npm install
```

### Environment variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

| Variable | Description | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL. Sent to the browser. | Supabase dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key. Sent to the browser. RLS enforces access. | Supabase dashboard → Project Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key. Bypasses RLS — never expose to the browser. | Supabase dashboard → Project Settings → API → `service_role` `secret` key |
| `ANTHROPIC_API_KEY` | Server-only API key for Claude. | console.anthropic.com → API Keys |

### Database setup

Run the SQL migrations in `supabase/migrations/` against your Supabase project, in numerical order, via Supabase's SQL editor:

1. `001_initial_schema.sql` — all tables, RLS policies, and the `auth_account_id()` helper.
2. `002_findings_notes.sql` — adds `notes` column to findings.
3. `003_findings_confidence.sql` — adds `confidence` column to findings.

Open the Supabase dashboard → SQL Editor → New query → paste the file contents → Run. Repeat for each migration.

You also need a Supabase storage bucket named **`photos`** for uploaded images. Create it under Storage → New bucket. It can be private — the app issues signed URLs.

### Run the dev server

```bash
npm run dev
```

App opens at http://localhost:3000. Sign up with any email and password.

### Build for production

```bash
npm run build
npm run start
```

---

## Usage guide (for contractors)

### 1. Sign up and set your branding

Go to `/signup`, enter an email and password. On first login you'll land on the empty Jobs list. Visit **Settings** to review your service catalog — it's pre-seeded with common roofing services. Edit names, prices, units, and the `issue_types` each service handles. The AI uses this catalog when it analyzes your photos, so the more accurate your services, the better the suggestions.

### 2. Create a job

From the Jobs list, tap **New Job**. Enter the client's name and address. The job starts in `inspecting` status.

### 3. Upload photos

From the job detail screen, tap **Add photos**. On a phone you can shoot directly with the camera or pick from the gallery. Photos are resized to 1200px on the long edge before upload — fast even on cell signal. Each photo gets queued for AI analysis automatically; watch the badge change from `pending` → `processing` → `complete`.

### 4. Review AI findings

When at least one photo is complete, tap **Review Findings**. For each photo you'll see:

- The image with numbered bounding boxes drawn over each issue.
- A list of findings: severity (low / medium / high / critical), issue type, description, suggested service.
- A confidence indicator (low / medium / high).

For each finding, choose:

- **Confirm** — locks the finding in. It will be eligible for the estimate.
- **Edit** — change the description, severity, suggested service, or move/resize the box. Original AI output is preserved in `ai_raw` so you never lose the source.
- **Reject** — hides the finding from the estimate.

Don't see something the AI missed? Switch to **Draw mode**, drag a box on the photo, and add a manual finding. Manually-added findings have no confidence score (it's a contractor source of truth).

By default, **low-confidence findings are hidden** to keep the review focused. Toggle them on if you want to see everything Claude flagged.

### 5. Build the estimate

Once you've reviewed every photo, tap **Build Estimate**. Confirmed findings are auto-mapped to your service catalog and grouped into line items. For each line:

- Adjust the quantity if the AI estimate looks off (or fill it in if blank).
- Tweak the unit price — it pre-fills from your catalog default.
- Add per-line notes if needed.
- Discount and totals update live.

You'll see a warning on any line item with a missing quantity. The "Generate PDF" button is disabled until every line has a quantity.

### 6. Download the PDF

Tap **Generate PDF**. The app composites bounding boxes onto the photos server-side (using sharp), assembles a four-page document, and streams it down for download:

1. **Cover page** — your business name, logo, and the job address.
2. **Inspection** — annotated photos with numbered findings and descriptions.
3. **Estimate** — line items, quantities, unit prices, subtotal, discount, total.
4. **Signing page** — option checkboxes, client name and address, signature line, date.

Hand it to the homeowner. Done.

---

## AI findings explained

### Confidence levels

Every AI-generated finding carries a confidence rating:

| Level | Meaning |
|---|---|
| **high** | Claude is sure it sees the issue and the box is well-placed. Treat as a strong suggestion. |
| **medium** | Claude sees something consistent with the issue but conditions (lighting, angle, distance) leave room for doubt. Verify visually before confirming. |
| **low** | Best-guess. Likely a hallucination or speculative read. Hidden by default; review only if you want to dig. |

Manually-added findings (drawn by you) have no confidence — they're treated as ground truth.

### Why low-confidence is hidden by default

Low-confidence findings inflate the review queue with noise. Hiding them keeps you moving through the high-signal items quickly. The toggle is there if you want a complete audit, but most contractors won't need it.

### Feedback analytics

The **Feedback** page tracks how often you confirm, edit, or reject AI suggestions, broken down by issue type. Use it as a tuning signal:

- **High reject rate on a specific issue type** — the prompt or knowledge base needs work for that category, or the service catalog is mis-configured.
- **High edit rate** — the AI gets the right issue but wrong details (severity, service mapping). Worth tightening the catalog descriptions.
- **High confirm rate** — that category is dialed in.

This data feeds the next round of prompt iteration without requiring a labeled dataset.

---

## Eval harness (for developers)

For systematic quality measurement before shipping prompt or knowledge base changes, the project includes an offline eval harness in `eval/`.

### What it does

Runs every photo in `eval/photos/` through `analyzePhoto()` against ground truth in `eval/expected.json`, then computes:

- **Recall** — fraction of required findings the AI actually returned.
- **Precision** — fraction of returned findings that match an expected finding (i.e. not hallucinations).
- **Hallucination rate** — fraction of returned findings with no expected match.

Plus per-photo pass/partial/fail status, total token usage, and an estimated dollar cost at Sonnet pricing (~$3/M input, ~$15/M output).

### Thresholds

The harness exits with code 1 if any threshold is missed:

| Metric | Threshold |
|---|---|
| Recall | ≥ 85% |
| Precision | ≥ 80% |
| Hallucination rate | ≤ 10% |

Wire it into CI to gate prompt changes.

### Running it

```bash
# Full eval — needs eval/expected.json populated with labels
npm run eval

# Preview mode — runs photos through Claude and prints raw findings
# Use this while iterating on the prompt before you have labels
npm run preview

# Preview a single photo
npm run preview -- photo_001.jpg
```

Results are written to `eval/results/YYYY-MM-DD.json`. Photos go in `eval/photos/`. Labels live in `eval/expected.json` — see `docs/eval-harness.md` for the schema.

### Eval vs preview

- **`npm run preview`** — for fast prompt iteration. No labels required. Prints structured findings to the console. Use this when you're tuning the prompt and just want to eyeball what Claude returns.
- **`npm run eval`** — for measurement. Requires labeled ground truth. Use this before merging any prompt or knowledge base change to confirm you didn't regress.

---

## Project structure

```
/
├── app/                           Next.js App Router
│   ├── (auth)/                    Login + signup pages (server actions)
│   ├── (app)/                     Auth-gated app routes
│   │   ├── jobs/                  Job list + creation
│   │   ├── jobs/[id]/             Job detail, photo upload
│   │   ├── jobs/[id]/review/      AI findings review (Konva.js viewer)
│   │   ├── jobs/[id]/estimate/    Line item assembly + PDF download
│   │   ├── settings/              Service catalog editor
│   │   └── feedback/              AI feedback analytics
│   └── api/                       API routes
│       ├── jobs/                  Job CRUD
│       ├── photos/upload/         Photo upload + storage
│       ├── ai/analyze/            Triggers analyzePhoto and persists findings
│       ├── findings/              Finding CRUD (confirm / edit / reject)
│       ├── estimates/             Estimate CRUD
│       ├── line-items/            Line item CRUD
│       ├── catalog/               Service catalog CRUD
│       └── pdf/[id]/              PDF generation endpoint
├── lib/
│   ├── ai/
│   │   ├── service.ts             ALL Claude API calls live here, nowhere else
│   │   └── knowledge-base.ts      Default service catalog seed
│   ├── pdf/                       React-PDF estimate template
│   ├── supabase/                  Browser + server Supabase clients
│   └── utils/                     Image compression, helpers
├── components/
│   ├── annotation/                Konva.js bounding box UI
│   ├── estimate/                  Line item assembly UI
│   └── ui/                        Shared UI primitives
├── eval/
│   ├── photos/                    Raw test photos (gitignored payload)
│   ├── expected.json              Ground truth labels
│   ├── results/                   Per-run JSON output
│   ├── run.ts                     Scoring harness
│   └── preview.ts                 Label-free preview script
├── supabase/
│   └── migrations/                SQL migrations (run in numerical order)
├── docs/                          Design documents (architecture, AI strategy, eval, etc.)
├── CLAUDE.md                      Instructions for Claude Code contributors
├── PROGRESS.md                    Current build state
└── README.md                      You are here
```

---

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Single repo, server actions for mutations, API routes for AI and PDF endpoints |
| UI | React 19 + Tailwind CSS 4 | Mobile-first; bottom tab bar on mobile, sidebar on desktop |
| Auth | Supabase Auth | Email + password, server-side session via `@supabase/ssr` |
| Database | Supabase Postgres | Multi-tenant from day one — every table filters by `account_id` via RLS |
| Storage | Supabase Storage | Private `photos` bucket, signed URLs |
| AI | Anthropic Claude (`claude-sonnet-4-6`) vision | Structured outputs via Zod schema, prompt caching enabled, abstracted behind `lib/ai/service.ts` |
| Image processing | sharp | Server-side resize and bounding-box compositing for PDF |
| PDF | @react-pdf/renderer | Pure JS; explicitly NOT Puppeteer (see `docs/architecture.md`) |
| Annotation UI | Konva.js | Bounding box draw / move / resize on photos |
| Validation | Zod | Schema for AI structured outputs and API payloads |
| Hosting | Vercel | CI/CD on `main`. No edge functions, no Vercel image optimization — keep portable |

---

## Deployment

The app deploys to Vercel with CI/CD on the `main` branch. Live at `ra-inspector-estimator.vercel.app`.

### One-time Vercel setup

1. Connect the GitHub repo to Vercel.
2. Set the framework preset to **Next.js**.
3. Add the four environment variables under **Project Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
4. Make sure each variable is enabled for Production (and Preview, if you want PR previews to work).
5. Trigger a deploy.

### Constraints to preserve portability

- Do **not** use Vercel edge functions, Vercel image optimization, or any Vercel-proprietary API. The app must run on any Node host.
- Do **not** call the Anthropic SDK anywhere except `lib/ai/service.ts`.
- Every database query must include `account_id` — RLS enforces this, but write code as if it didn't.

---

## Known limitations / deferred items

- **Blur detection** — client-side Laplacian-variance blur detection on upload is planned but not yet wired up. Sharp or out-of-focus photos currently upload without warning.
- **Bounding box drag-to-resize** — the annotation viewer supports drawing new boxes and moving them, but resize handles on existing boxes are deferred. Workaround: delete and redraw.
- **Eval ground-truth labels** — `eval/expected.json` is collected but not yet fully labeled across all 25 sample photos. Until that's done, `npm run eval` runs against the partial set; `npm run preview` is the recommended iteration tool.
- **Mobile camera UX polish** — capture works, but in-app review of just-shot photos before upload could be smoother on small screens.
- **Single-contractor MVP** — the schema is multi-tenant from day one, but onboarding flows for additional accounts (invites, team roles beyond `owner`) are not yet built.
- **No re-analysis from the UI** — if a photo's analysis fails, you currently need to delete and re-upload. A retry button is planned.
