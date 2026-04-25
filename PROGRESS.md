# RoofEstimate AI -- Progress Tracker

*Updated: 2026-04-24 (Phase 1 code complete). Used to orient Claude Code at session start.*

> **Spec:** See `docs/mvp-scope-and-build-plan.md` for full build plan.

---

## Completed

### Phase 0 scaffolding (in progress — running in parallel with Phase 1)
- 25 real roof photos collected in `eval/photos/`
- Eval harness (`eval/run.ts`) — scores recall, precision, hallucination rate against labeled ground truth
- Preview script (`eval/preview.ts`) — runs photos through Claude without labels; useful for prompt iteration
- AI service module (`lib/ai/service.ts`) with:
  - Structured outputs via `client.messages.parse` + Zod schema (grammar-enforced, not prompt-based)
  - `issue_type` and `suggested_service` enums built dynamically from the knowledge base at runtime
  - `'other'` escape hatch with required `notes` field for genuinely novel issue types
  - Prompt caching on system prompt
- Draft knowledge base for the contractor (inline in `eval/run.ts` and `eval/preview.ts`) — covers common slate and asphalt issue types, 12 service catalog entries
- `package.json`, `tsconfig.json`, `.env.example`, `.gitignore` in place
- `npm run preview` confirmed working end-to-end on 25 photos

### Project infrastructure
- All design docs written (`docs/`)
- `CLAUDE.md` fully populated with stack, schema, rules, and phase status

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

### Phase 1 — Foundation (code complete; awaiting manual steps)

**Code done (builds cleanly):**
- Next.js App Router skeleton with all routes
- Supabase clients: browser, server (SSR), service role
- Email/password auth: login page, signup page, middleware session guard
- Mobile-responsive shell layout: sticky header, bottom tab bar (mobile), sidebar (desktop)
- Migration SQL: `supabase/migrations/001_initial_schema.sql` (all tables + RLS)

**Manual steps remaining before gate:**
1. Run migration in Supabase dashboard → SQL Editor → paste `001_initial_schema.sql`
2. Supabase → Auth → Settings → disable "Confirm email" (for dev)
3. Supabase → Storage → create bucket named `photos` (private)
4. Push to GitHub, connect repo to Vercel, add env vars in Vercel dashboard
5. Verify contractor can log in on phone browser

Gate: do not start Phase 2 until contractor can log in on a phone browser.

---

## Decisions Already Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AI model | `claude-sonnet-4-6` | Current Sonnet; prior model deprecated June 2026 and lacked structured output support |
| Structured output | `client.messages.parse` + Zod v4 schema | Grammar-enforced at decode time; enums built from knowledge base |
| Issue type extensibility | Contractor-owned enum via knowledge base | AI constrained to known list; contractor adds types via service catalog |
| PDF library | `@react-pdf/renderer` | Puppeteer explicitly ruled out |
| Database / Auth / Storage | Supabase | Single platform for all three |
| Hosting | Vercel | CI/CD from day one |
| Image resize | `sharp` | Resize to max 1200px before sending to Claude |
| Phase 0 / Phase 1 sequencing | Running in parallel | Infrastructure is independent of prompt quality |

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
