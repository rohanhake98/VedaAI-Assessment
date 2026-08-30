/**
 * POST /api/assessment/extract-answers
 *
 * Runs AI handwritten answer & region extraction on the student's answer sheet for a given assessmentId.
 *
 * Input:
 *   JSON { assessmentId: string }
 *
 * Output:
 *   AnswerExtractionResult JSON
 */

import { NextRequest, NextResponse } from "next/server";
import { assessmentStore } from "@/lib/assessment-store";
import { answerExtractor } from "@/lib/ai/answer-extractor";

export async function GET() {
  return NextResponse.json({
    message: "VedaAI Answer Extraction API — use POST with { assessmentId }.",
  });
}

export async function POST(req: NextRequest) {
  let body: { assessmentId?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Expected { assessmentId: string }." },
      { status: 400 }
    );
  }

  const { assessmentId } = body;

  if (!assessmentId || typeof assessmentId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'assessmentId' in request body." },
      { status: 400 }
    );
  }

  // Retrieve stored assessment
  const stored = assessmentStore.get(assessmentId);
  if (!stored || !stored.processingResult) {
    return NextResponse.json(
      {
        error: `Assessment with ID "${assessmentId}" was not found or has expired. Please re-upload your files.`,
      },
      { status: 404 }
    );
  }

  const answerSheet = stored.processingResult.answerSheet;
  if (!answerSheet || !answerSheet.pages || answerSheet.pages.length === 0) {
    return NextResponse.json(
      { error: "Stored assessment does not contain valid answer sheet pages." },
      { status: 422 }
    );
  }

  // Execute answer extraction
  const extractionResult = await answerExtractor.extractAnswers(
    assessmentId,
    answerSheet
  );

  // Save result in store
  assessmentStore.setAnswersResult(assessmentId, extractionResult);

  if (extractionResult.status === "error") {
    return NextResponse.json(
      {
        error: extractionResult.message || "Failed to extract answers.",
        result: extractionResult,
      },
      { status: 422 }
    );
  }

  return NextResponse.json(extractionResult);
}
