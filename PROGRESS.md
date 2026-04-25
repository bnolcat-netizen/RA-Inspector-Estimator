# RoofEstimate AI -- Progress Tracker

*Updated: 2026-04-24 (Phase 2 code complete). Used to orient Claude Code at session start.*

> **Spec:** See `docs/mvp-scope-and-build-plan.md` for full build plan.

---

## Completed

### Phase 0 scaffolding (in progress — running in parallel)
- 25 real roof photos collected in `eval/photos/`
- Eval harness (`eval/run.ts`) — scores recall, precision, hallucination rate against labeled ground truth
- Preview script (`eval/preview.ts`) — runs photos through Claude without labels; useful for prompt iteration
- AI service module (`lib/ai/service.ts`) with:
  - Structured outputs via `client.messages.parse` + Zod schema (grammar-enforced, not prompt-based)
  - `issue_type` and `suggested_service` enums built dynamically from the knowledge base at runtime
  - `'other'` escape hatch with required `notes` field for genuinely novel issue types
  - Prompt caching on system prompt
- Draft knowledge base for the contractor (inline in `eval/run.ts` and `eval/preview.ts`) — covers common slate and asphalt issue types, 12 service catalog entries
- `npm run preview` confirmed working end-to-end on 25 photos

### Phase 1 — Foundation (complete)
- Next.js App Router skeleton with all routes
- Supabase clients: browser, server (SSR), service role
- Email/password auth: login page, signup page, middleware session guard
- Mobile-responsive shell layout: sticky header, bottom tab bar (mobile), sidebar (desktop)
- Migration SQL applied: `supabase/migrations/001_initial_schema.sql` (all tables + RLS)
- Deployed to Vercel with CI/CD on main branch
- Phase 1 gate passed: contractor can log in on phone browser

### Phase 3 — AI Analysis Pipeline (complete)
- `lib/ai/knowledge-base.ts`: shared knowledge base module (eval scripts updated to import from it)
- `/api/ai/analyze`: fetches photo from Supabase storage, calls `analyzePhoto()`, stores findings with `ai_raw`, logs to `ai_usage_log`, updates `analysis_status`
- `/api/findings`: GET findings by photo (account-scoped), PATCH to confirm/edit/reject
- `PhotoUploader`: triggers analysis after upload, shows Uploading → Analyzing → idle states
- Job detail page: per-photo status badges (Pending/Analyzing/Ready/Failed), "Review Findings" button appears when photos are ready
- `/jobs/[id]/review`: photo strip, full-size photo view, findings list with confirm/edit/reject and inline edit form
- Migration `002_findings_notes.sql`: added `notes` column to findings (was missing from initial schema)

### Phase 2 — Job + Photo Management (complete)
- Jobs list page: real DB query, status badges, empty state
- New job form (`/jobs/new`): client name, address, city/state/zip, notes — Server Action inserts to DB
- Job detail page (`/jobs/[id]`): photo grid, signed URLs, fetched via `/api/jobs/[id]`
- Photo upload flow:
  - Client-side resize to max 1200px using Canvas API (`lib/utils/image.ts`)
  - POST to `/api/photos/upload` — uploads to Supabase Storage, writes `photos` record, returns signed URL
  - `PhotoUploader` client component handles file selection, camera capture, and optimistic UI
- `getCurrentUser()` helper added to `lib/supabase/server.ts` — looks up `account_id` from `users` table

### Project infrastructure
- All design docs written (`docs/`)
- `CLAUDE.md` fully populated with stack, schema, rules, and phase status
- GitHub repo: `github.com/bnolcat-netizen/RA-Inspector-Estimator`
- Vercel project: `ra-inspector-estimator.vercel.app`

---

## What's Next

### Phase 0 — Remaining (parallel track)
1. Label `eval/expected.json` — review each photo, mark required vs. optional findings
2. Run `npm run eval` — see where recall/precision land against thresholds
3. Iterate on prompt and/or knowledge base for systematic misses
4. Get the contractor's actual service catalog to replace the draft knowledge base
5. Contractor signs off on output quality

Run eval: `npm run eval`
Thresholds: Recall ≥ 85%, Precision ≥ 80%, Hallucination ≤ 10%

### Phase 4 — Estimate + PDF Generation
- Map confirmed findings to service catalog line items
- Estimate review screen: line items, quantities, notes
- PDF generation: annotated photos + line items + contractor branding
- Download and share PDF

---

## Known Issues / Deferred Items
- `middleware.ts` deprecation warning in Next.js 16 — needs rename to `proxy.ts` (non-breaking, fix in polish phase)
- Client-side blur detection (`lib/utils/image.ts`) — deferred to Phase 6 polish
- Image resize decision: client-side Canvas API used for upload; `sharp` used server-side for PDF annotation

---

## Decisions Already Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AI model | `claude-sonnet-4-6` | Current Sonnet; structured output support |
| Structured output | `client.messages.parse` + Zod v4 schema | Grammar-enforced at decode time; enums built from knowledge base |
| Issue type extensibility | Contractor-owned enum via knowledge base | AI constrained to known list; contractor adds types via service catalog |
| PDF library | `@react-pdf/renderer` | Puppeteer explicitly ruled out |
| Database / Auth / Storage | Supabase | Single platform for all three |
| Hosting | Vercel | CI/CD from day one |
| Image resize (upload) | Canvas API (client-side) | Resize before upload, no server round-trip |
| Image resize (PDF) | `sharp` (server-side) | Composite bounding boxes onto photos for PDF |
| Photo upload path | `{account_id}/{job_id}/{uuid}.jpg` | Natural account isolation in storage |
| Photo storage access | Service role key in API route | Avoids need for storage RLS policies |
| Phase 0 / Phase 1-2 sequencing | Running in parallel | Infrastructure is independent of prompt quality |

---

## Open Questions

- What is the contractor's actual service catalog and pricing? (needed to replace draft knowledge base)
- Are there specific issue types or materials they want the AI to prioritize?
- What accuracy bar does the contractor consider "good enough" to trust in the field?

---

## Reference

- Run preview (no labels needed): `npm run preview`
- Run eval (requires labeled `expected.json`): `npm run eval`
- Eval thresholds: Recall ≥ 85%, Precision ≥ 80%, Hallucination ≤ 10%
- Issue types are defined per-service in the knowledge base (`eval/run.ts` and `eval/preview.ts`)
- GitHub: `github.com/bnolcat-netizen/RA-Inspector-Estimator`
- Vercel: `ra-inspector-estimator.vercel.app`
