# RoofEstimate AI - Eval Harness

## Overview
Phase 0 validates the prompt once against real photos. That is not enough. As the knowledge base grows, prompts change, and models update, accuracy needs to be measurable and regressions catchable before they reach the contractor.

The eval harness is a lightweight, repeatable script that runs a labeled photo set against the current prompt and scores the output.

---

## Labeled Dataset

### Target size
- MVP: 30-50 photos minimum
- Growth: expand as new issue types or roofing materials are added
- Source: real photos from the contractor with findings manually confirmed by them

### Dataset structure
```
/eval
  /photos
    photo_001.jpg
    photo_002.jpg
    ...
  expected.json
  run.js
  results/
    2024-01-15.json
    2024-01-22.json
```

### expected.json format
```json
[
  {
    "photo_id": "photo_001",
    "filename": "photo_001.jpg",
    "expected_findings": [
      {
        "issue_type": "improper_flashing",
        "severity": "high",
        "required": true
      },
      {
        "issue_type": "granule_loss",
        "severity": "medium",
        "required": false
      }
    ],
    "expected_finding_count_min": 1,
    "expected_finding_count_max": 3,
    "notes": "Chimney flashing clearly lifted, granule loss may or may not be caught"
  }
]
```

**required: true** - this finding must be present for the photo to pass
**required: false** - this finding is expected but its absence is not a failure

---

## Scoring

### Per photo
- **Pass** - all required findings detected, no severe hallucinations
- **Partial** - required findings detected but extras added that are clearly wrong
- **Fail** - one or more required findings missed

### Per run metrics
- **Recall** - percentage of required findings detected across all photos
- **Precision** - percentage of returned findings that are correct
- **Hallucination rate** - findings returned with no corresponding real issue
- **Severity accuracy** - correct finding detected but wrong severity assigned

### Acceptable thresholds (to define with contractor during Phase 0)
Set baseline thresholds from the first passing prompt. Flag any run that drops below:
- Recall < 85%
- Precision < 80%
- Hallucination rate > 10%

---

## The Script

`run.js` should:
1. Load each photo from `/eval/photos`
2. Load `expected.json`
3. Call the AI service module with the current prompt and knowledge base
4. Compare returned findings against expected
5. Score each photo
6. Output a dated results JSON to `/eval/results/`
7. Print a summary to stdout
8. Exit with code 1 if any threshold is breached (enables CI failure)

```javascript
// Pseudocode
const photos = loadPhotos('./eval/photos')
const expected = loadExpected('./eval/expected.json')

let results = []

for (const photo of photos) {
  const findings = await aiService.analyzePhoto(photo, accountKnowledgeBase)
  const score = scoreFindings(findings, expected[photo.id])
  results.push({ photo_id: photo.id, score, findings })
}

const summary = calculateMetrics(results)
saveResults(summary)
printSummary(summary)

if (summary.recall < THRESHOLD_RECALL || summary.precision < THRESHOLD_PRECISION) {
  process.exit(1)
}
```

---

## When to Run

- **Before merging any prompt change**
- **Before merging any knowledge base structural change**
- **After a Claude model version update**
- **When adding a new issue type to the service catalog**
- Optionally: as a scheduled weekly CI job to catch model drift from provider-side updates

---

## CI Integration

Add to your CI pipeline (GitHub Actions or equivalent):

```yaml
- name: Run AI eval harness
  run: node eval/run.js
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

A failed eval blocks the merge. This prevents prompt regressions from silently reaching production.

---

## Growing the Dataset

- When a contractor edits or rejects an AI finding, that photo + correction is a candidate for the eval set
- Periodically review rejected findings with the contractor and add confirmed corrections to expected.json
- When a new roofing material or issue type is added to the knowledge base, add representative photos before enabling it in production
- Aim to expand the dataset by 10-20 photos per quarter

---

## Important Notes

- The eval dataset must never be used to tune the prompt in a feedback loop without adding new photos - this leads to overfitting to the eval set
- Keep the dataset diverse: different roof types, materials, lighting conditions, photo angles, damage severities
- Store the dataset in version control alongside the codebase
- Eval runs cost real API tokens - budget accordingly (30-50 photos per run at current Claude pricing is minimal)
