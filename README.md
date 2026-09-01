# VedaAI Assessment

AI Assessment Extraction & Answer Mapping application for evaluating handwritten student answer sheets against question papers.

<img width="1535" height="835" alt="Screenshot 2026-09-01 221253" src="https://github.com/user-attachments/assets/9d2cd74c-912d-415d-98b4-de075017ef30" />


## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI & Styling**: React 19, TypeScript, Tailwind CSS
- **AI / Vision**: Google Gemini Vision API (`gemini-1.5-flash` / `gemini-2.0-flash` via `@google/genai`)
- **Document Processing**: Pure-JS PDF Structure Parser, `sharp` (image processing & normalization)

---

## Current Implementation Status (Phase 6: Answer-to-Question Mapping Engine)

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
- **Answer-to-Question Mapping Engine**: `POST /api/assessment/map-answers`
  - **Deterministic-First Multi-Signal Mapping**: Matches answers to questions using canonical normalization (`Q. 11 (a)` → `11(a)`), sub-part isolation (`11(a)` and `11(b)` remain strictly independent), and out-of-order resolution.
  - **Status Classification**: Categorizes questions into `answered`, `unanswered`, and `ambiguous`.
  - **Duplicate Answer Handling**: Identifies multiple answer attempts (e.g. Q5 answered on page 2 and page 6) and marks as `ambiguous` without silent overwriting.
  - **Unmatched Answers**: Preserves extraneous student answers (e.g. Q17 not present in QP) under an Unmatched Answers panel.
  - **Hybrid Semantic Fallback**: Uses keyword containment (Overlap Coefficient) and Jaccard similarity with optional AI reasoning fallback for unlabelled answers.
  - **Multi-page Answer Region Preservation**: Maps multi-page answers to their single parent question with all page bounding boxes intact.
  - **Interactive Teacher Review**: `QuestionList` and `AnswerViewer` render real bounding boxes, page jumping, and unanswered states.

### Not Implemented Yet (Future Phases)
- Automated Evaluation, Marks Calculation & AI Feedback (Phase 7 / Phase 8)

---

## Answer Mapping Architecture

### Mapping Pipeline & Priority
```text
Extracted Questions + Extracted Answers
                   ↓
1. Canonical Key Normalization (e.g. "Ans 11 a" → "11(a)")
                   ↓
2. Exact Question-Number & Sub-Part Matching (11(a) → 11(a), 11(b) → 11(b))
                   ↓
3. Duplicate Detection (Multiple attempts for same question → Ambiguous)
                   ↓
4. Unmatched Detection (Question references not present in paper)
                   ↓
5. Hybrid Semantic Fallback for Unlabelled Answers (Overlap + Jaccard)
                   ↓
6. Unanswered Assignment (Remaining questions marked unanswered)
                   ↓
7. Assembly & Sorting by Original Printed Question Order (1..N)
```

### Mapping Data Model
```json
{
  "assessmentId": "uuid",
  "status": "success",
  "totalQuestions": 14,
  "answeredCount": 11,
  "unansweredCount": 3,
  "ambiguousCount": 0,
  "unmatchedAnswerCount": 1,
  "mappedQuestions": [
    {
      "questionId": "q-1-1",
      "questionNumber": "1",
      "canonicalKey": "1",
      "order": 1,
      "text": "Which blood vessel carries blood away from the heart?",
      "mappingStatus": "answered",
      "answerId": "ans-1-2",
      "answerText": "Arteries carry oxygenated blood away from the heart...",
      "regions": [
        {
          "page": 1,
          "boundingBox": { "x": 80, "y": 120, "width": 1080, "height": 220 }
        }
      ],
      "confidence": 0.95,
      "matchMethod": "explicit_exact"
    },
    {
      "questionId": "q-2-2",
      "questionNumber": "2",
      "canonicalKey": "2",
      "order": 2,
      "text": "Explain photosynthesis chemical formula.",
      "mappingStatus": "unanswered",
      "answerId": null,
      "regions": [],
      "confidence": 1.0,
      "matchMethod": "none"
    }
  ],
  "unmatchedAnswers": [
    {
      "answerId": "ans-9-1",
      "detectedQuestionNumber": "9",
      "text": "Hydraulic lift principle based on Pascal law...",
      "regions": [
        { "page": 3, "boundingBox": { "x": 80, "y": 100, "width": 1080, "height": 250 } }
      ],
      "confidence": 0.92,
      "reason": "Question reference \"9\" does not exist in question paper."
    }
  ]
}
```

### Coordinate Scaling in AnswerViewer
- **Origin**: Top-left `(0, 0)`.
- **Canvas Scaling**: Normalized coordinates $\{ x, y, \text{width}, \text{height} \}$ dynamically scale with zoom and screen dimensions (`scaledX = originalX * scaleFactor`), preserving precise alignment with handwriting.

---

## File Specifications & Limits

- **Supported Formats**: PDF (`application/pdf`), PNG (`image/png`), JPEG (`image/jpeg`), WEBP (`image/webp`).
- **File Size Limit**: **20 MB** per file (client-side and server-side).

---

## Running the Project

```bash
# 1. Configure environment
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
