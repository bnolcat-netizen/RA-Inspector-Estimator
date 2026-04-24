# RoofEstimate AI - AI Strategy & Tuning

## Model Choice
- **Primary:** Anthropic Claude (claude-sonnet) with vision
- **Fallback options:** GPT-4o, Gemini (all support vision, near drop-in replacements)
- All calls abstracted behind a single AI service module

## What the AI Does
1. Receives roof photos + account knowledge base as context
2. Identifies roofing issues, damage, and service needs in each image
3. Returns structured findings (issue type, severity, location, recommended service)
4. Findings are stored and editable - not treated as final output

## What the AI Does NOT Do
- Generate the final estimate directly
- Make pricing decisions
- Send anything to the client
- Operate without contractor review

## Knowledge Base Injection
Each API call includes the contractor's account-level knowledge base:
- Their service catalog (line items, descriptions, pricing)
- Roofing methods and materials they work with
- Custom issue types they commonly encounter
- Their terminology and language preferences

This means AI behavior is customized per account without any code changes.

## Tuning Options (in order of effort)

### 1. Prompt Tuning (lowest effort)
- Refine the system prompt with roofing-specific instructions
- "Look for these issue types first"
- "Here is what improper flashing looks like"
- Knowledge base updates automatically tune behavior
- Covers most underperformance issues

### 2. Multi-shot Examples (medium effort)
- Include example photo + correct finding pairs in the prompt
- Contractor's confirmed past findings become training examples over time
- Vision models respond well to this pattern

### 3. Model Switching (easy if abstracted)
- Swap providers for specific job types if one outperforms another
- Only possible because of the AI service abstraction layer

### 4. Fine-tuning (not recommended until significant scale)
- Requires large labeled dataset
- Expensive and slow
- Overkill until a very specific, repeatable failure pattern is identified at scale

## Image Quality Guidelines
Most AI underperformance comes from image quality, not the model.
Provide contractors with guidance:
- Take photos in good lighting
- Avoid blurry or motion-affected shots
- Capture multiple angles of problem areas
- Get close enough that damage is clearly visible

Build basic image quality feedback into the upload UI where possible.

## Machine Learning Consideration
Custom ML models are **not appropriate for MVP or near-term development.**

Reasons:
- No labeled training dataset exists yet
- Training, hosting, and maintaining a custom model is a significant engineering burden
- Modern vision LLMs already outperform custom models on edge cases
- Would delay MVP by months

**Future consideration:** If the app accumulates thousands of contractor-confirmed findings over time, that dataset becomes valuable for fine-tuning or a lightweight classifier. Revisit at scale.

## Cost Management
- Compress and resize images before sending to Claude
- Cache findings - do not re-call the API when regenerating a PDF
- Track per-account API consumption from day one (needed for future billing)
- Monitor cost per estimate as a key metric
