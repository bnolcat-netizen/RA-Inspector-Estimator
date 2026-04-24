# RoofEstimate AI - MVP Scope & Build Plan

## MVP Goal
Deliver a working end-to-end flow for one contractor:
**photo upload → AI analysis → contractor review → PDF estimate**

## In Scope

- Mobile-friendly web app (browser, iOS + Android)
- Job creation (address, client name, date)
- Photo upload from camera or gallery
- AI analysis of photos - identifies roofing issues and service needs
- Contractor review UI - confirm, edit, or add findings per photo
- Line item mapping from findings to service catalog
- PDF estimate generation with annotated photos + line items + branding
- Per-account knowledge base (service catalog, terminology, custom issue types)
- Basic auth (email/password)
- Usage logging per account (foundation for future billing)

## Out of Scope (Post-MVP)

- Native mobile app
- Payments and subscriptions
- Multi-user / staff accounts
- Automated client delivery
- Dashboard and analytics
- Drone/aerial integration
- Fine-tuned ML models

## Build Phases

### Phase 0: Validate AI Core (1-2 days)
**Do this before writing any app code.**
- Collect 15-20 real roof photos from the contractor
- Write a standalone script sending photos to Claude with a structured prompt
- Review findings with the contractor for accuracy
- Iterate on the prompt until both parties are satisfied
- Gate: Do not proceed to Phase 1 until findings are reliable on real photos

### Phase 1: Foundation (3-4 days)
- Next.js project setup + Vercel deployment (CI/CD from day one)
- Supabase setup: auth, database schema, storage bucket
- Basic email/password auth
- Mobile-responsive skeleton UI

Deliverable: Can log in on a phone browser

### Phase 2: Job + Photo Management (3-4 days)
- Create and view jobs
- Upload photos from phone camera or gallery
- Photos stored in Supabase, linked to job and account
- Simple job list view

Deliverable: Contractor can create a job and upload photos on-site

### Phase 3: AI Analysis Pipeline (4-5 days)
- Build the AI service module (abstracted Claude calls)
- Trigger analysis per photo after upload
- Store findings in database (editable, not locked AI output)
- Review UI: photo with AI findings, contractor can confirm/edit/add
- Knowledge base hardcoded for initial contractor (self-serve UI comes in Phase 5)

Deliverable: Contractor can review and approve AI findings per photo

### Phase 4: Estimate + PDF Generation (4-5 days)
- Map confirmed findings to service catalog line items
- Estimate review screen: line items, quantities, notes
- PDF generation: annotated photos + line items + contractor branding
- Download and share PDF

Deliverable: Full end-to-end flow working. Photo to PDF.

### Phase 5: Knowledge Base UI (2-3 days)
- Admin screen for contractor to manage service catalog
- Add/edit/remove line items, descriptions, pricing
- Custom issue types and terminology
- Replaces hardcoded knowledge base from Phase 3

Deliverable: Contractor is not dependent on developer for config changes

### Phase 6: Polish + Handoff (2-3 days)
- Mobile UX cleanup (used on a roof - must be simple and fast)
- Error handling and loading states
- Usage logging per account
- Onboard contractor, gather feedback

Deliverable: Production-ready MVP in hands of real user

## Total Estimate
**5-6 weeks** for one focused developer

## Success Criteria for MVP
- Contractor can complete full flow on-site on a phone
- AI findings are accurate enough that review/edit time is minimal
- PDF output is professional enough to send directly to a client
- Contractor no longer needs to manually annotate images or build estimate docs
