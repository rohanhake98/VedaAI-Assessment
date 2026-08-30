# VedaAI Assessment

AI Assessment Extraction & Answer Mapping application for evaluating handwritten student answer sheets against question papers.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI & Styling**: React 19, TypeScript, Tailwind CSS
- **Document Processing**: `pdf-parse` (PDF structure & metadata), `sharp` (image processing & normalization)

---

## Current Implementation Status (Phase 3: File Upload & Document Normalization)

### Real Functionality Implemented
- **Browser File Selection**: Drag-and-drop & file picker support for both Question Paper and Student Answer Sheet.
- **Client & Server-Side Validation**:
  - Validates file presence, empty files, file extensions, and file sizes.
  - Server-side validation inspects magic bytes (file signatures) to verify actual MIME types and prevent spoofed uploads.
- **Multipart Upload Endpoint**: `POST /api/assessment/upload` handles concurrent question paper and answer sheet uploads.
- **Document Normalization**:
  - **PDF Documents**: Parsed with deterministic page counting and ordering, formatted into normalized `DocumentPage` structures.
  - **Image Documents (PNG, JPEG, WEBP)**: Normalized using `sharp` to standard dimensions (max 2048px aspect-ratio preserving) and consistent format.
- **Real Processing UI Flow**: The `/processing` route triggers real file upload and document normalization, dynamically progressing through stages and reporting actual errors.

### Not Implemented Yet (Future Phases)
- AI / OCR Question Extraction (Phase 4)
- Student Handwriting / Answer Detection
- Semantic Answer-to-Question Mapping
- Answer Region Bounding Box Detection on raw PDFs
- Automated Grading & AI Evaluation

---

## File Specifications & Limits

- **Supported Formats**:
  - PDF (`application/pdf`, `.pdf`)
  - PNG (`image/png`, `.png`)
  - JPEG / JPG (`image/jpeg`, `.jpg`, `.jpeg`)
  - WEBP (`image/webp`, `.webp`)
- **File Size Limit**: **20 MB** per file (enforced both client-side and server-side).

---

## Temporary Storage & Architecture

- Processed document representations are maintained in temporary in-memory storage (`Map<string, ProcessingResult>`) keyed by `assessmentId` with automatic LRU pruning (keeping the last 10 processed items).
- **Known Limitation**: In-memory storage is scoped to the Node.js server process and will not persist across server restarts or sync across multiple serverless/container instances. In production, this can be seamlessly replaced with object storage (S3, GCS, Cloudflare R2) and a shared cache (Redis) without altering the frontend API contract.

---

## Project Structure

```text
├── app/
│   ├── api/
│   │   └── assessment/
│   │       └── upload/
│   │           └── route.ts       # POST multipart upload & normalization API
│   ├── layout.tsx                 # Root layout with AssessmentProvider
│   ├── page.tsx                   # Upload Screen (Empty & Filled states)
│   ├── processing/
│   │   └── page.tsx               # Real upload & normalization progress screen
│   ├── assessment/
│   │   └── page.tsx               # Review & Mapping screen
│   └── login/
│       └── page.tsx               # Sign In / Sign Up screen
├── components/
│   ├── layout/                    # Sidebar, TopBar
│   ├── upload/                    # UploadCard (supports PDF & images)
│   ├── processing/                # LoadingScreen
│   ├── assessment/                # QuestionList, QuestionItem
│   ├── answer-viewer/             # AnswerViewer with zoom & page navigation
│   └── ui/                        # VedaAILogo brand component
├── lib/
│   ├── file-validation.ts         # Client/server file & magic-byte validation
│   ├── assessment-context.tsx     # React Context for upload state
│   ├── document-processing/       # PDF & image normalization pipeline
│   │   ├── types.ts               # Domain models for DocumentPage, ProcessedDocument
│   │   ├── pdf.ts                 # PDF page parsing
│   │   ├── image.ts               # Sharp image normalization
│   │   └── index.ts               # processAssessmentFiles pipeline entrypoint
│   ├── types.ts                   # Assessment application types
│   ├── mock-data.ts               # Mock data for assessment screen
│   └── utils.ts                   # Classnames (cn) helper
└── design-reference/              # Figma reference screens and components
```

---

## Running the Project

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run production build
npm run build

# Start production server
npm start
```
