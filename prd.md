# PRD — AI Assessment Extraction & Answer Mapping

## 1. Product Overview

**Product:** AI Assessment Extraction & Answer Mapping  
**Primary User:** Teacher / evaluator  
**Platform:** Web application  
**Purpose:** Help teachers quickly review a student's handwritten answer sheet by automatically extracting questions, identifying corresponding answers, and showing the exact answer location on the original answer sheet.

The product's core promise is:

> **Upload a question paper and one student answer sheet → extract questions and answers → map them correctly → show exactly where each answer appears.**

Grading and AI-generated feedback are optional enhancements and are not the primary objective.

---

## 2. Problem Statement

Manually checking a handwritten answer sheet requires a teacher to repeatedly search through pages to find where each question was answered. This becomes harder when:

- Questions are answered out of order.
- Some questions are unanswered.
- A question contains labelled sub-parts such as 11(a) and 11(b).
- An answer continues onto another page.
- A student writes an answer that cannot be matched to a question.
- The handwriting is difficult for conventional OCR systems.

The application should reduce this manual effort by creating a question-to-answer map and providing visual location context.

---

## 3. Goals

### Primary Goals

1. Allow the teacher to upload a question paper.
2. Allow the teacher to upload one student's handwritten answer sheet.
3. Show clear upload and processing progress.
4. Extract every question in the correct printed order.
5. Preserve original question numbering.
6. Treat labelled sub-parts as independent questions.
7. Extract handwritten answers from the answer sheet.
8. Map answers to the correct questions even when answered out of order.
9. Identify unanswered questions.
10. Identify answers that cannot be matched to any question.
11. Highlight the exact answer region on the answer sheet.
12. Support answers that continue across multiple pages.
13. Present the results in a clear teacher-friendly review interface.

### Secondary Goals

1. Optionally provide marks/scores.
2. Optionally provide per-question AI feedback.
3. Optionally provide an overall grading summary.
4. Provide enough processing transparency that the teacher understands what the system is doing.

---

## 4. Non-Goals

The first version does not require:

- User authentication.
- User accounts.
- Persistent database storage.
- Multi-student batch processing.
- Classroom/course management.
- Advanced analytics dashboards.
- Full learning-management-system functionality.
- Human-like handwriting generation.
- Guaranteed perfect OCR on all handwriting styles.

Grading should remain secondary to accurate extraction, mapping, and highlighting.

---

## 5. Target User

### Teacher / Evaluator

The primary user is a teacher who wants to review a student's paper quickly.

The user should not need technical knowledge.

The expected workflow is:

1. Open application.
2. Upload question paper.
3. Upload student answer sheet.
4. Start processing.
5. Wait while extraction and mapping occur.
6. Review extracted questions.
7. Click a question.
8. See the corresponding answer.
9. See the exact answer region highlighted on the original answer sheet.
10. Identify unanswered and unmatched items.
11. Optionally review marks and AI feedback.

---

## 6. Core User Flow

```text
Upload Question Paper
          +
Upload Student Answer Sheet
          |
          v
     Start Processing
          |
          v
    Question Extraction
          |
          v
     Answer Extraction
          |
          v
      Answer Mapping
          |
          v
 Answer Region Detection
          |
          v
      Review Results
          |
          +--------------------+
          |                    |
          v                    v
    Optional Grading     AI Feedback
```

---

## 7. Functional Requirements

### 7.1 File Upload

The application must provide two separate upload inputs:

#### Question Paper

Accepted formats:

- PDF
- Images

#### Student Answer Sheet

Accepted formats:

- PDF
- Images

The UI should clearly distinguish the two uploads.

The application should provide:

- Drag-and-drop support where practical.
- File picker support.
- Selected filename.
- File type/size validation.
- Ability to remove or replace a selected file.
- Clear validation errors.

The processing action should not proceed until both required files are available.

---

### 7.2 Processing Progress

After both files are uploaded, the user starts processing.

The interface should communicate progress through meaningful stages.

Suggested stages:

1. Uploading files
2. Reading question paper
3. Extracting questions
4. Reading answer sheet
5. Detecting handwritten answers
6. Mapping answers to questions
7. Detecting answer regions
8. Preparing review

Progress should not claim a stage is complete unless the application actually completed it.

Errors should identify the failed stage and provide a retry path.

---

### 7.3 Question Extraction

The system must extract every printed question from the question paper.

Requirements:

- Preserve printed order.
- Preserve original numbering.
- Extract question text.
- Detect labelled sub-parts separately.
- Maintain parent/part relationships when useful.

Example input:

```text
11 (a) Explain photosynthesis.
11 (b) Give two examples.
```

Expected question entries:

```text
11(a) Explain photosynthesis.
11(b) Give two examples.
```

The system must not collapse them into a single `11` entry.

Questions should have stable internal IDs that do not depend solely on their printed number.

---

### 7.4 Answer Extraction

The system should inspect the student's handwritten answer sheet and identify answer regions.

For each detected answer, the system should attempt to extract:

- Student-written question number/reference.
- Transcribed answer text when confidence permits.
- Page number.
- Bounding box / polygon / region coordinates.
- Mapping confidence.
- Continuation relationship when the answer spans pages.

A useful conceptual answer object:

```json
{
  "id": "answer-17",
  "detectedQuestionNumber": "11(a)",
  "text": "...",
  "regions": [
    {
      "page": 3,
      "boundingBox": {
        "x": 120,
        "y": 420,
        "width": 700,
        "height": 260
      }
    }
  ],
  "confidence": 0.94
}
```

The final schema may differ based on the selected AI/OCR provider.

---

### 7.5 Answer Mapping

The system must map answers to questions.

Mapping should use multiple signals where available:

1. Explicit question number written by the student.
2. Detected section/sub-part labels.
3. Page/region context.
4. Semantic similarity between question and answer when direct numbering is missing or ambiguous.
5. Continuation context across pages.

The system must **not assume answer order matches question order**.

Example:

```text
Question paper:
Q1
Q2
Q3
Q4

Answer sheet:
Q1
Q4
Q2
Q3
```

Expected mapping:

```text
Q1 → answer region A
Q2 → answer region C
Q3 → answer region D
Q4 → answer region B
```

---

### 7.6 Unanswered Questions

A question with no sufficiently reliable matching answer must be shown as unanswered.

Example:

```text
Q5
Status: Unanswered
```

No highlight should be shown for a genuinely unanswered question.

The interface should make unanswered items easy to identify.

---

### 7.7 Unmatched Answers

If an answer region is detected but cannot be confidently associated with any extracted question, it must be preserved.

Example:

```text
Unmatched answer
Detected reference: Q15
Reason: No matching question found
```

The system should not silently discard unmatched content.

---

### 7.8 Exact Answer Highlighting

This is a core requirement.

When a teacher selects a question, the corresponding answer region must be highlighted on the original answer-sheet page.

The viewer should:

- Navigate to the relevant page.
- Render the answer sheet at readable scale.
- Overlay the answer region.
- Clearly distinguish the selected answer region.
- Preserve the original handwritten content.

For answers spanning multiple pages, all relevant regions must be associated with the same answer.

Example:

```json
{
  "questionId": "q7",
  "regions": [
    {
      "page": 2,
      "boundingBox": { "x": 100, "y": 300, "width": 700, "height": 240 }
    },
    {
      "page": 3,
      "boundingBox": { "x": 100, "y": 120, "width": 700, "height": 310 }
    }
  ]
}
```

---

### 7.9 Question Review Interface

The main review experience should support a question list and an answer-sheet viewer.

Conceptual layout:

```text
+----------------------+----------------------------------+
| Questions            | Student Answer Sheet             |
|                      |                                  |
| Q1                   |             page image          |
| Q2                   |                                  |
| Q3  <-- selected    |     [highlighted answer]       |
| Q4                   |                                  |
| Q5  Unanswered       |                                  |
| 11(a)                |                                  |
| 11(b)                |                                  |
+----------------------+----------------------------------+
```

Selecting a question should update the right-side answer viewer.

The selected question's status should be visible.

---

### 7.10 Optional Grading

Grading may be included as an enhancement.

Potential features:

- Marks obtained.
- Maximum marks.
- Correct / partially correct / incorrect classification.
- Per-question feedback.
- Overall score.
- Overall feedback.

Example:

```text
Score
82 / 100

Answered: 12
Unanswered: 1
Unmatched: 1
```

Grading must not compromise the core extraction/mapping experience.

---

## 8. Data Model

A conceptual model should include:

### Question

```ts
interface Question {
  id: string;
  number: string;
  text: string;
  order: number;
  parentNumber?: string;
  partLabel?: string;
  status: "answered" | "unanswered" | "ambiguous";
  answerId?: string;
}
```

### Answer Region

```ts
interface AnswerRegion {
  page: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
```

### Answer

```ts
interface Answer {
  id: string;
  detectedQuestionNumber?: string;
  text?: string;
  regions: AnswerRegion[];
  confidence?: number;
  status: "mapped" | "unmatched" | "ambiguous";
  questionId?: string;
}
```

### Assessment

```ts
interface Assessment {
  questions: Question[];
  answers: Answer[];
  processingStatus:
    | "idle"
    | "uploading"
    | "extracting_questions"
    | "extracting_answers"
    | "mapping"
    | "highlighting"
    | "complete"
    | "error";
}
```

These types are starting points and may evolve during implementation.

---

## 9. UI / UX Requirements

### 9.1 Design Source

The provided Figma design is the primary visual reference.

The implementation should follow the Figma design closely in:

- Layout
- Typography
- Spacing
- Color
- Borders
- Radius
- Shadows
- Component states
- Interaction patterns

Exported Figma reference images should be retained in the project as design references.

Suggested directory:

```text
design-reference/
├── screens/
└── components/
```

Expected screens include:

- Upload — Empty State
- Upload — Filled State
- Loading State
- Question / Answer Mapping
- Component references

---

### 9.2 Upload States

The UI should support at minimum:

- Empty
- File selected
- Uploading / processing
- Error

---

### 9.3 Review States

The question list should distinguish:

- Answered
- Unanswered
- Ambiguous / needs review
- Unmatched answer

The selected question must have a clear active state.

---

## 10. Error Handling

The application should handle:

### Invalid File

Show a clear message if the file format is unsupported.

### Oversized File

Show a clear message and allowed limits.

### Extraction Failure

Tell the user which document/stage failed.

### Low Confidence Mapping

Do not silently force an uncertain mapping.

Instead:

```text
Needs Review
```

with enough information for the teacher to understand the ambiguity.

### No Answer Detected

Mark the question as unanswered only when the extraction pipeline has adequate evidence.

### Unmatched Answer

Preserve the detected answer and show it separately.

---

## 11. AI / Processing Requirements

The implementation may use any AI model/API with an available free tier, subject to provider terms and practical limits.

The selected solution should prioritize:

1. Question extraction accuracy.
2. Handwriting recognition quality.
3. Bounding-region accuracy.
4. Structured JSON output.
5. Reliability on multi-page documents.
6. Reasonable latency and cost.

The exact model/provider is an implementation decision and should be documented in the final submission.

AI output should be validated before being shown as final structured data.

---

## 12. Technical Architecture

Preferred stack:

- Next.js
- React
- TypeScript
- Tailwind CSS

Backend/API implementation can live inside Next.js or use a separate service if needed.

No authentication is required.

No persistent database is required for the assignment.

In-memory state is acceptable.

A conceptual architecture:

```text
Browser
   |
   v
Next.js UI
   |
   v
Upload / API Layer
   |
   +----------------------+
   |                      |
   v                      v
Question Processing   Answer Processing
   |                      |
   +----------+-----------+
              |
              v
       Mapping Engine
              |
              v
     Structured Assessment
              |
              v
       Review Interface
              |
              v
    Answer Region Overlay
```

---

## 13. State Management

Persistent database storage is not necessary.

The application can use:

- React state for local UI state.
- Context or a lightweight state solution if needed.
- Server-side in-memory state for the active assessment if processing requires it.

The implementation should keep the data structures modular so a database can be introduced later without redesigning the domain model.

---

## 14. Security / Privacy Considerations

Because answer sheets may contain student information:

- Do not expose uploaded files publicly.
- Do not log complete handwritten answers unnecessarily.
- Avoid logging API secrets.
- Keep API keys server-side.
- Delete temporary files when they are no longer needed where practical.
- Explain third-party AI processing in project assumptions/limitations if applicable.

---

## 15. Performance Expectations

The application should:

- Show immediate upload feedback.
- Avoid blocking the browser unnecessarily during processing.
- Display meaningful processing progress.
- Avoid rendering unnecessarily large page images when a lower resolution is sufficient.
- Load only the necessary answer-sheet page/region when possible.

Exact latency depends on document size and AI provider.

---

## 16. Accessibility

The application should provide:

- Keyboard-accessible buttons and controls.
- Visible focus states.
- Proper labels for file inputs.
- Sufficient text contrast.
- Status messaging that does not rely only on color.
- Meaningful error messages.

---

## 17. Success Criteria

The assignment is successful when a teacher can:

1. Upload both required files.
2. See processing progress.
3. See all extracted questions in the correct printed order.
4. See labelled sub-parts as separate questions.
5. Select any extracted question.
6. See its corresponding student answer.
7. Navigate directly to the correct answer-sheet page.
8. See the exact answer region highlighted.
9. Correctly handle out-of-order answers.
10. Identify unanswered questions.
11. Identify unmatched answers.
12. Follow answers across multiple pages.
13. Understand ambiguous mappings without the application silently making a false claim.

---

## 18. Evaluation Priorities

Implementation effort should be prioritized in this order:

### P0 — Critical

- Question extraction accuracy.
- Answer extraction.
- Correct answer mapping.
- Exact answer highlighting.
- Correct ordering and numbering.
- Out-of-order answers.
- Unanswered questions.
- Unmatched answers.
- Multi-page answers.

### P1 — Important

- High-quality upload experience.
- Processing progress.
- Figma-matched UI.
- Error handling.
- Responsive layout.

### P2 — Enhancement

- Grading.
- AI feedback.
- Overall score summary.
- Advanced confidence/review tools.

---

## 19. Assumptions

Initial assumptions:

1. One assessment is processed at a time.
2. One student answer sheet is supplied per assessment.
3. Input can be PDF or image files.
4. Question papers are primarily machine-printed, though layout complexity may vary.
5. Student answers are handwritten and may vary significantly in legibility.
6. The system may need a fallback/ambiguous state rather than forcing a low-confidence mapping.
7. Exact coordinate quality depends on the selected vision/OCR pipeline.
8. In-memory storage is sufficient for the assignment deployment.

---

## 20. Limitations

Expected limitations include:

- Very poor handwriting may reduce transcription accuracy.
- Heavy page skew, shadows, blur, or low-resolution scans may reduce detection quality.
- Question numbering written ambiguously may require semantic fallback.
- Complex tables, diagrams, equations, or unusual layouts may need specialized processing.
- AI model APIs may impose file-size, page-count, latency, or rate limits.
- Bounding boxes may be approximate rather than pixel-perfect for difficult handwritten layouts.
- A production-scale system would require stronger file isolation, durable storage, observability, and privacy controls.

These limitations should be explicitly documented in the final submission.

---

## 21. Development Phases

### Phase 1 — Foundation

- Initialize Next.js project.
- Organize Figma references.
- Define shared types.
- Establish project structure.

### Phase 2 — UI

Implement the Figma-referenced:

1. Upload empty state.
2. Upload filled state.
3. Loading state.
4. Question-answer mapping screen.
5. Shared components and interactions.

### Phase 3 — Upload

- File validation.
- PDF/image handling.
- Upload state management.

### Phase 4 — Question Extraction

- Parse question paper.
- Extract structured questions.
- Preserve ordering and numbering.
- Split labelled sub-parts.

### Phase 5 — Answer Extraction

- Process answer-sheet pages.
- Detect question references.
- Extract answer text.
- Generate page regions and coordinates.

### Phase 6 — Mapping

- Map explicit references first.
- Apply semantic fallback.
- Detect unmatched answers.
- Detect unanswered questions.
- Support multi-page answers.

### Phase 7 — Highlighting

- Render answer sheet.
- Overlay answer regions.
- Synchronize selected question and viewer.
- Handle multiple regions/pages.

### Phase 8 — Optional Grading

- Add score calculation.
- Add AI feedback.
- Add grading summary.

### Phase 9 — Testing

Test at minimum:

- In-order answers.
- Out-of-order answers.
- Unanswered questions.
- Unmatched answers.
- 11(a)/11(b)-style subquestions.
- Multi-page answers.
- Multiple answers on one page.
- Ambiguous handwriting.
- Invalid uploads.
- Processing failures.

### Phase 10 — Deployment

- Deploy publicly.
- Verify live workflow.
- Add GitHub repository.
- Document architecture, AI model, assumptions, and limitations.
- Submit live URL and repository through the provided submission form.

---

## 22. Deliverables

The final project should include:

- Live deployed web application.
- GitHub repository.
- Source code.
- Figma-referenced UI.
- Working upload flow.
- Extraction and mapping pipeline.
- Answer-region highlighting.
- Edge-case handling.
- README with setup and architecture notes.
- AI model/API disclosure.
- Assumptions and limitations.

---

## 23. Final Product Principle

The product should optimize for one core teacher experience:

> **Select a question and immediately understand whether it was answered, what the answer contains, and exactly where that answer appears on the student's original answer sheet.**

Accuracy of mapping and highlighting is more important than adding a large number of secondary features.
