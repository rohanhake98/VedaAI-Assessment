# VedaAI Assessment

AI Assessment Extraction & Answer Mapping application for evaluating handwritten student answer sheets against question papers.

<img width="1535" height="835" alt="Screenshot 2026-09-01 221253" src="https://github.com/user-attachments/assets/9d2cd74c-912d-415d-98b4-de075017ef30" />


## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI & Styling**: React 19, TypeScript, Tailwind CSS
- **AI / Vision**: Google Gemini Vision API (`gemini-1.5-flash` / `gemini-2.0-flash` via `@google/genai`)
- **Document Processing**: Pure-JS PDF Structure Parser, `sharp` (image processing & normalization)

---

## Current Implementation Status (Phase 5: Handwritten Answer & Region Extraction)

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
- **AI Handwritten Answer Extraction API**: `POST /api/assessment/extract-answers`
  - Detects distinct handwritten answer blocks across student answer sheet pages.
  - Detects student-written question references (`1`, `4`, `11(a)`, `Q5`, `Ans 2`) or records `null` if omitted.
  - Transcribes handwritten answers and visual/diagram content.
  - Extracts exact bounding box regions `{ x, y, width, height }` per answer block.
  - Handles multi-page answer continuations (e.g. Q7 spanning pages 1 and 2).
  - Supports multiple answers on the same page.
- **Interactive Review UI Flow**: The `/processing` route executes the live pipeline (Upload → Normalize → Question Extraction → Answer Extraction) and auto-navigates to `/assessment` with interactive candidate inspection tools.

### Not Implemented Yet (Future Phases)
- Answer-to-Question Semantic Mapping (Phase 6)
- Answer Region Bounding Box Highlighting on Student Sheets (Phase 7)
- Automated Evaluation & Grading (Phase 8)

---

## AI Architecture

### Model & Provider
- **Provider**: Google Gemini API (Free Tier compatible)
- **Default Model**: `gemini-1.5-flash` (or `gemini-2.0-flash`)
- **Configuration**:
  - `GEMINI_API_KEY` or `AI_API_KEY` in `.env.local`
  - `GEMINI_MODEL` (optional, defaults to `gemini-1.5-flash`)

### Handwritten Answer Extraction Schema
```json
{
  "assessmentId": "uuid",
  "status": "success",
  "totalAnswers": 6,
  "extractionTimeMs": 1820,
  "modelUsed": "gemini-1.5-flash",
  "answers": [
    {
      "id": "ans-4-1",
      "detectedQuestionNumber": "4",
      "text": "Xylem vessels have lignified walls which provide mechanical strength...",
      "regions": [
        {
          "id": "region-1-1-1",
          "page": 1,
          "boundingBox": { "x": 80, "y": 120, "width": 1080, "height": 220 }
        }
      ],
      "confidence": 0.95,
      "status": "candidate",
      "hasVisualContent": false
    },
    {
      "id": "ans-7-4",
      "detectedQuestionNumber": "7",
      "text": "Part 1 of cellular respiration...\n[Continuation]: Part 2 electron transport...",
      "regions": [
        {
          "id": "region-4-1-1",
          "page": 1,
          "boundingBox": { "x": 80, "y": 1200, "width": 1080, "height": 450 }
        },
        {
          "id": "region-4-2-2",
          "page": 2,
          "boundingBox": { "x": 80, "y": 100, "width": 1080, "height": 550 }
        }
      ],
      "confidence": 0.91,
      "status": "candidate",
      "hasVisualContent": true
    }
  ]
}
```

### Coordinate System & Bounding Boxes
- **Origin**: Top-left `(0, 0)`.
- **Axes**: `x` increases rightward, `y` increases downward.
- **Units**: Pixels relative to standard page dimensions (width ~1240, height ~1754 at 150 DPI).
- **Validation**: Strict boundary checks ensuring `x >= 0`, `y >= 0`, `x + width <= page.width`, `y + height <= page.height`.

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
