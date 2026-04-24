# RoofEstimate AI - Product Decisions & Roadmap

## Core Product Decisions (Settled)

### Multi-tenancy from day one
Every piece of data is scoped to an account. Non-negotiable.
Retrofitting this later is a painful rewrite.

### Human review is mandatory
AI findings are suggestions, not final output.
Contractor confirms or edits before anything goes into an estimate.
This is a liability and trust decision, not just a UX one.

### Knowledge base is per-account and contractor-owned
Each contractor owns their service catalog, terminology, and parameters.
They can modify it without developer involvement.
This is both a product feature and the primary moat.

### Web app, not native mobile
Browser-based works on iOS and Android.
Faster to build, easier to maintain, sufficient for the use case.
Revisit native app only if specific device capabilities are needed.

### PDF is the output format
Contractors want something they can send directly to a client.
A professional, branded PDF is the deliverable.
Word doc editing is not needed for MVP.

### Estimate generation is integrated, not a separate tool
The inspect-to-quote pipeline is the product.
Inspection and estimate live in the same workflow, same app.

## Product Moat
The AI API is a commodity. The moat is:
- Per-account knowledge base accumulated over time
- Contractor-specific terminology and service catalog
- Workflow designed specifically for roofing contractors
- PDF template quality and branding

A competitor can copy the UI. They cannot copy a contractor's two years of accumulated knowledge base and confirmed findings.

## Initial Market
- Single roofing business owner (paid pilot / design partner)
- Validate and refine the product with one real user before expanding
- Word of mouth in the roofing industry is strong - one happy contractor is a meaningful distribution channel

## Future Product Expansion (Post-MVP)

### Near term
- Staff accounts (junior inspectors, estimators reviewing before owner)
- Automated client delivery (email PDF directly from app)
- Job history and dashboard

### Medium term
- Subscription/billing infrastructure
- Onboarding flow for new contractors
- Service catalog templates by region or roofing specialty

### Longer term
- Mobile app if browser limitations become a real problem
- Drone/aerial photo integration
- Analytics (common issues by season, job value trends)
- Marketplace of knowledge base templates

## Pricing Model Considerations (Not for MVP)
Options to evaluate:
- Per-report pricing (aligns cost with value)
- Monthly subscription with report limits per tier
- Flat monthly unlimited (simplest for contractors)

Key input: track cost-per-estimate during MVP to understand margin before setting prices.

## Risks

| Risk | Mitigation |
|---|---|
| AI accuracy on real photos | Phase 0 validation before building anything |
| Contractor adoption / UX complexity | Mobile-first, minimal steps, test on-site early |
| API cost at scale | Image compression, findings caching, usage tracking |
| AI provider changes | Abstracted service module, easy provider swap |
| Liability for missed findings | Mandatory contractor review step, never fully automated |
