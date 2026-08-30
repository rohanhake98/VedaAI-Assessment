/**
 * Document processing pipeline — Phase 3.
 *
 * Pipeline:
 *   validateFiles()
 *     → processDocument(questionPaper)
 *     → processDocument(answerSheet)
 *     → return ProcessingResult
 *
 * NOT implemented yet (future phases):
 *   → question extraction
 *   → answer extraction
 *   → answer mapping
 *   → region highlighting
 *   → grading
 */

import { randomUUID } from "crypto";
import { detectMimeType, validateFileServer } from "@/lib/file-validation";
import { processPdf } from "./pdf";
import { processImage } from "./image";
import {
  DocumentType,
  ProcessedDocument,
  ProcessingError,
  ProcessingResult,
} from "./types";

/**
 * Process a single uploaded document buffer into a ProcessedDocument.
 */
async function processDocument(
  buffer: Buffer,
  originalFileName: string,
  reportedMime: string,
  documentType: DocumentType
): Promise<ProcessedDocument> {
  // Server-side validation (magic bytes — do not trust browser MIME)
  const validation = validateFileServer(buffer, originalFileName, reportedMime, 
    documentType === "question_paper" ? "Question paper" : "Answer sheet");
  
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const detectedMime = detectMimeType(buffer);
  if (!detectedMime) {
    throw new Error(`Unrecognised file format for "${originalFileName}".`);
  }

  let result: { pageCount: number; pages: ProcessedDocument["pages"] };

  if (detectedMime === "application/pdf") {
    result = await processPdf(buffer, documentType, originalFileName);
  } else {
    // PNG, JPEG, WEBP — treat as single-page image
    result = await processImage(buffer, documentType, originalFileName);
  }

  return {
    documentType,
    originalFileName,
    originalMimeType: detectedMime,
    pageCount: result.pageCount,
    pages: result.pages,
  };
}

/**
 * Main entry point for the processing pipeline.
 * Accepts raw buffers from the API route.
 *
 * Temporary storage note:
 * This function returns the result in memory. The caller (API route) stores
 * it in a module-level Map keyed by assessmentId. This works for single-instance
 * deployments but will NOT work across multiple serverless instances.
 * Replace with object storage (S3, GCS, etc.) for production.
 */
export async function processAssessmentFiles(
  questionPaperBuffer: Buffer,
  questionPaperName: string,
  questionPaperMime: string,
  answerSheetBuffer: Buffer,
  answerSheetName: string,
  answerSheetMime: string
): Promise<ProcessingResult | ProcessingError> {
  const startTime = Date.now();

  try {
    // Process both documents
    const [questionPaper, answerSheet] = await Promise.all([
      processDocument(
        questionPaperBuffer,
        questionPaperName,
        questionPaperMime,
        "question_paper"
      ).catch((err) => {
        throw Object.assign(err, { stage: "pdf_processing", doc: "question_paper" });
      }),
      processDocument(
        answerSheetBuffer,
        answerSheetName,
        answerSheetMime,
        "answer_sheet"
      ).catch((err) => {
        throw Object.assign(err, { stage: "pdf_processing", doc: "answer_sheet" });
      }),
    ]);

    const result: ProcessingResult = {
      assessmentId: randomUUID(),
      questionPaper,
      answerSheet,
      status: "ready_for_extraction",
      processingTimeMs: Date.now() - startTime,
      createdAt: new Date().toISOString(),
    };

    return result;
  } catch (err) {
    const stage =
      (err as { stage?: string }).stage ?? "unknown";
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";

    console.error("[document-processing] Error:", { stage, message });

    return {
      status: "error",
      stage: stage as ProcessingError["stage"],
      message,
    };
  }
}

// Re-export types for convenience
export type { ProcessingResult, ProcessingError, ProcessedDocument, DocumentPage } from "./types";
