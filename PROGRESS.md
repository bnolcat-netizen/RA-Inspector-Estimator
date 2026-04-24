# RoofEstimate AI -- Progress Tracker

*Updated: 2026-04-24. Used to orient Claude Code at session start.*

> **Spec:** See `docs/mvp-scope-and-build-plan.md` for full build plan.

---

## Completed

### Project scaffolding
- All design docs written (`docs/`)
- Eval harness script (`eval/run.ts`) — ready to run once photos are added
- Draft AI prompt and service module (`lib/ai/service.ts`)
- Draft knowledge base for the initial contractor (inline in `eval/run.ts`)
- `package.json`, `tsconfig.json`, `.env.example`, `.gitignore` in place

---

## What's Next

### Phase 0 — Validate AI Core (blocked on photos)

#### To do
1. Get 15–20 real roof photos from the contractor
2. Drop photos into `eval/photos/`
3. Label each photo in `eval/expected.json` (see format in `docs/eval-harness.md`)
4. Run `npm install` then `npm run eval`
5. Review findings with the contractor — does the AI catch what they catch?
6. Iterate on prompt and/or knowledge base until recall ≥ 85%, precision ≥ 80%
7. Confirm with the contractor that output quality is acceptable

#### Also needed from the contractor
- Their actual service catalog, line items, and pricing (to replace the draft in `eval/run.ts`)
- Any specific materials, issue types, or terminology they want the AI to use

#### Gate
Do not start Phase 1 until findings pass on real photos and the contractor signs off.

---

## Decisions Already Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AI model | `claude-sonnet-4-20250514` | Best vision + cost balance |
| PDF library | `@react-pdf/renderer` | Puppeteer explicitly ruled out |
| Database / Auth / Storage | Supabase | Single platform for all three |
| Hosting | Vercel | CI/CD from day one |
| Image resize | `sharp` | Resize to max 1200px before sending to Claude |

---

## Open Questions

- What is the contractor's actual service catalog and pricing? (needed to refine knowledge base)
- Are there specific issue types they encounter most that the AI should prioritize?
- What accuracy bar does the contractor consider "good enough" to trust in the field?

---

## Reference

- Run eval: `npm run eval`
- Eval thresholds: Recall ≥ 85%, Precision ≥ 80%, Hallucination ≤ 10%
