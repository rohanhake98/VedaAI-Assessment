/**
 * POST /api/assessment/upload
 *
 * Accepts a multipart/form-data request with:
 *   - questionPaper: File (PDF or image)
 *   - answerSheet:   File (PDF or image)
 *
 * Returns a ProcessingResult JSON on success.
 *
 * Temporary storage:
 * Processing results are stored in a module-level Map (in-memory).
 * This works for single-process deployments. For serverless/multi-instance
 * deployments, replace with an object store (S3, GCS, Redis, etc.).
 *
 * Security:
 * - File type is validated server-side using magic bytes (not MIME from browser).
 * - Files are never written to the public directory.
 * - Stack traces are not exposed to the client.
 */

import { NextRequest, NextResponse } from "next/server";
import { processAssessmentFiles, ProcessingResult } from "@/lib/document-processing";
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_LABEL } from "@/lib/file-validation";

// ── In-memory store ──────────────────────────────────────────────────────────
// Stores the latest processing result per assessmentId.
// NOTE: This is intentionally simple for the assignment; not production-grade.
const assessmentStore = new Map<string, ProcessingResult>();

export function GET() {
  return NextResponse.json({ message: "VedaAI Assessment API — use POST to upload files." });
}

export async function POST(req: NextRequest) {
  let formData: FormData;

  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Expected multipart/form-data." },
      { status: 400 }
    );
  }

  const questionPaperFile = formData.get("questionPaper") as File | null;
  const answerSheetFile = formData.get("answerSheet") as File | null;

  // ── Presence checks ──────────────────────────────────────────────────────
  if (!questionPaperFile) {
    return NextResponse.json({ error: "Question paper file is required." }, { status: 400 });
  }
  if (!answerSheetFile) {
    return NextResponse.json({ error: "Answer sheet file is required." }, { status: 400 });
  }

  // ── Size pre-check before reading full buffer ────────────────────────────
  if (questionPaperFile.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Question paper exceeds the ${MAX_FILE_SIZE_LABEL} size limit.` },
      { status: 413 }
    );
  }
  if (answerSheetFile.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Answer sheet exceeds the ${MAX_FILE_SIZE_LABEL} size limit.` },
      { status: 413 }
    );
  }

  // ── Read file buffers ────────────────────────────────────────────────────
  let questionPaperBuffer: Buffer;
  let answerSheetBuffer: Buffer;

  try {
    questionPaperBuffer = Buffer.from(await questionPaperFile.arrayBuffer());
    answerSheetBuffer = Buffer.from(await answerSheetFile.arrayBuffer());
  } catch {
    return NextResponse.json(
      { error: "Failed to read uploaded files. Please try again." },
      { status: 500 }
    );
  }

  // ── Process documents ────────────────────────────────────────────────────
  const result = await processAssessmentFiles(
    questionPaperBuffer,
    questionPaperFile.name,
    questionPaperFile.type,
    answerSheetBuffer,
    answerSheetFile.name,
    answerSheetFile.type
  );

  if (result.status === "error") {
    const errResult = result as import("@/lib/document-processing").ProcessingError;
    return NextResponse.json({ error: errResult.message }, { status: 422 });
  }

  // ── Store result in memory ───────────────────────────────────────────────
  assessmentStore.set(result.assessmentId, result);

  // Clean up old entries (keep only the last 10 to avoid memory leaks)
  if (assessmentStore.size > 10) {
    const oldest = assessmentStore.keys().next().value;
    if (oldest) assessmentStore.delete(oldest);
  }

  // ── Return summary response ──────────────────────────────────────────────
  // Do NOT include full base64 page images in the response — that would be huge.
  // The client only needs metadata to proceed to the assessment screen.
  return NextResponse.json({
    assessmentId: result.assessmentId,
    status: result.status,
    processingTimeMs: result.processingTimeMs,
    createdAt: result.createdAt,
    questionPaper: {
      originalFileName: result.questionPaper.originalFileName,
      originalMimeType: result.questionPaper.originalMimeType,
      pageCount: result.questionPaper.pageCount,
    },
    answerSheet: {
      originalFileName: result.answerSheet.originalFileName,
      originalMimeType: result.answerSheet.originalMimeType,
      pageCount: result.answerSheet.pageCount,
    },
  });
}
