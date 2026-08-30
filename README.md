# VedaAI Assessment

AI Assessment Extraction & Answer Mapping application for evaluating handwritten student answer sheets against question papers.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI & Styling**: React 19, TypeScript, Tailwind CSS
- **AI / Vision**: Google Gemini API (`gemini-1.5-flash` / `gemini-2.0-flash` via `@google/genai`)
- **Document Processing**: Pure-JS PDF Structure Parser, `sharp` (image processing & normalization)

---

## Current Implementation Status (Phase 4: AI Question Extraction)

### Real Functionality Implemented
- **Browser File Selection**: Drag-and-drop & file picker support for Question Paper and Student Answer Sheet.
- **Client & Server-Side Validation**:
  - File presence, empty file, extension, and 20MB file size checks.
  - Server-side magic-byte inspection (PDF, PNG, JPEG, WEBP).
- **Multipart Upload API**: `POST /api/assessment/upload` handles concurrent uploads and normalizes document pages.
- **AI Question Extraction API**: `POST /api/assessment/extract-questions`
  - Extracts printed questions from question paper pages using Google Gemini Vision.
  - Preserves exact printed numbering strings (e.g., `1`, `2`, `10`, `11(a)`, `11(b)`, `Q4(i)`).
  - Preserves original printed order (`order` integer sequence).
  - Separates sub-questions into distinct entries with `parentNumber` and `partLabel`.
  - Merges multi-page question continuations into single items with `sourcePages: [1, 2]`.
  - Captures maximum marks where indicated (e.g. `[2 Marks]`).
  - Generates approximate bounding regions for each printed question.
- **Live Review UI Flow**: The `/processing` route executes real document normalization followed by live AI question extraction, populating `/assessment` with real extracted questions.

### Not Implemented Yet (Future Phases)
- Student Handwritten Answer Extraction & OCR (Phase 5)
- Answer-to-Question Semantic Mapping (Phase 6)
- Answer Region Bounding Box Highlighting on Student Sheets (Phase 7)
- Automated Evaluation & Grading (Phase 8)

---

## AI Question Extraction Architecture

### Model & Provider
- **Provider**: Google Gemini API (Free Tier compatible)
- **Default Model**: `gemini-1.5-flash` (or `gemini-2.0-flash`)
- **Why Selected**:
  - Native multimodal vision handling multi-page documents seamlessly.
  - Fast response times (<2s on free tier).
  - High accuracy on complex document layouts, sub-parts, tables, and mixed alphanumeric numbering.
  - Native structured JSON output enforcement.
- **Configuration**:
  - `GEMINI_API_KEY` or `AI_API_KEY` in `.env.local`
  - `GEMINI_MODEL` (optional, defaults to `gemini-1.5-flash`)

### Structured Output Schema
```json
{
  "assessmentId": "uuid",
  "status": "success",
  "totalQuestions": 14,
  "extractionTimeMs": 1450,
  "modelUsed": "gemini-1.5-flash",
  "questions": [
    {
      "id": "q-1-1",
      "number": "1",
      "text": "Which blood vessel carries blood away from the heart?",
      "order": 1,
      "parentNumber": null,
      "partLabel": null,
      "maxMarks": 2,
      "sourcePages": [1],
      "region": {
        "page": 1,
        "boundingBox": { "x": 100, "y": 150, "width": 1040, "height": 120 }
      },
      "confidence": 0.98
    },
    {
      "id": "q-11-a-11",
      "number": "11(a)",
      "text": "Compare the leaf morphology of Plant A and Plant B.",
      "order": 11,
      "parentNumber": "11",
      "partLabel": "a",
      "maxMarks": 2,
      "sourcePages": [2],
      "region": {
        "page": 2,
        "boundingBox": { "x": 100, "y": 300, "width": 1040, "height": 160 }
      },
      "confidence": 0.96
    }
  ]
}
```

### Server-Side Validation & Resilience
- **Schema Validation**: Guarantees all items have valid question numbers, non-empty text, positive orders, and valid page references.
- **Sub-part Normalization**: Automatically extracts and links parent/part relationships (e.g. `11(a)` → parent `"11"`, part `"a"`).
- **Continuation Deduplication**: Resolves question continuations spanning page boundaries.
- **Controlled Error States**: If no questions are found or API credentials are unconfigured, returns a clean `needs_review` response without crashing.

---

## File Specifications & Limits

- **Supported Formats**:
  - PDF (`application/pdf`, `.pdf`)
  - PNG (`image/png`, `.png`)
  - JPEG / JPG (`image/jpeg`, `.jpg`, `.jpeg`)
  - WEBP (`image/webp`, `.webp`)
- **File Size Limit**: **20 MB** per file (enforced client-side and server-side).

---

## Temporary Storage & Architecture

- Stored in an in-memory `assessmentStore` (`Map<string, StoredAssessment>`) with automatic LRU pruning (retaining last 25 assessments).
- **Known Limitation**: In-memory storage is per server process. In production, this can be swapped with Redis / Object Storage (S3 / GCS) without altering the frontend contract.

---

## Running the Project

```bash
# 1. Copy environment template and add your Gemini API key
cp .env.example .env.local
# Edit .env.local and set: GEMINI_API_KEY=your_key_here

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Or build & run production server
npm run build
npm start
```
