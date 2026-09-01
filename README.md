# VedaAI Assessment

AI Assessment Extraction & Answer Mapping application for evaluating handwritten student answer sheets against question papers.

<img width="1535" height="835" alt="Screenshot 2026-09-01 221253" src="https://github.com/user-attachments/assets/9d2cd74c-912d-415d-98b4-de075017ef30" />


## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI & Styling**: React 19, TypeScript, Tailwind CSS
- **AI / Vision**: Google Gemini Vision API (`gemini-1.5-flash` / `gemini-2.0-flash` via `@google/genai`)
- **Document Processing**: Pure-JS PDF Structure Parser, `sharp` (image processing & normalization)

---

## Current Implementation Status (Phase 7: Exact Answer-Region Highlighting & Review)

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
- **Interactive Teacher Review & Exact Region Highlighting** (Phase 7):
  - **Exact Bounding Box Overlay**: Renders scaled bounding boxes corresponding directly to AI coordinates.
  - **Proportional Coordinate Scaling**: Dynamically scales coordinates ($\text{scale} = \text{displayedWidth} / \text{originalWidth} = 558 / 1240 \approx 0.45$).
  - **Zoom & Transform Synchronization**: Highlights remain 100% aligned with handwriting across zoom levels (50% to 200%) and responsive viewport resize.
  - **Multi-Page Answer Viewer**: Direct page navigation buttons (`Page 3`, `Page 4`) for multi-page answers.
  - **Unanswered State**: Displays a clean notice for unanswered questions with zero fake bounding boxes.
  - **Unmatched Answers Inspection**: Clickable panel jumping to the answer sheet page with a distinctive purple highlight.
  - **Keyboard Navigation**: Arrow keys for page switching, `+`/`-` for zoom, and `Ctrl+0` for zoom reset.

### Not Implemented Yet (Future Phases)
- Automated Evaluation, Marks Calculation & AI Feedback (Phase 8)

---

## Answer Review & Highlighting Architecture

### Coordinate Scaling & Viewport Synchronization
```text
Original Normalized Image Dimensions: 1240 × 1754 px
Displayed Canvas Dimensions:         558 × 789 px
Base Scaling Factor:                 558 / 1240 = 0.45

Display Coordinates:
  displayX = originalX * 0.45
  displayY = originalY * 0.45
  displayWidth = originalWidth * 0.45
  displayHeight = originalHeight * 0.45
```

The canvas and overlay reside inside the same relative container. When zooming or resizing, CSS `transform: scale(...)` applies uniformly to both image and highlights, eliminating coordinate drift.

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
