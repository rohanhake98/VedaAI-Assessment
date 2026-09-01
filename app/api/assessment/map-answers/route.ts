/**
 * POST /api/assessment/map-answers
 *
 * Runs the Answer-to-Question Mapping Engine on extracted questions and answers for a given assessmentId.
 *
 * Input:
 *   JSON { assessmentId: string, enableAiSemanticFallback?: boolean }
 *
 * Output:
 *   MappingResult JSON
 */

import { NextRequest, NextResponse } from "next/server";
import { assessmentStore } from "@/lib/assessment-store";
import { answerMapper } from "@/lib/mapping/answer-mapper";

export async function GET() {
  return NextResponse.json({
    message: "VedaAI Answer Mapping API — use POST with { assessmentId }.",
  });
}

export async function POST(req: NextRequest) {
  let body: { assessmentId?: string; enableAiSemanticFallback?: boolean };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Expected { assessmentId: string }." },
      { status: 400 }
    );
  }

  const { assessmentId, enableAiSemanticFallback = false } = body;

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

  const questions = stored.extractedQuestionsResult?.questions || [];
  const answers = stored.extractedAnswersResult?.answers || [];

  if (questions.length === 0 && answers.length === 0) {
    return NextResponse.json(
      {
        error: "No extracted questions or answers found for this assessment. Please complete extraction steps first.",
      },
      { status: 422 }
    );
  }

  // Execute answer mapping
  const mappingResult = await answerMapper.mapAnswers(
    assessmentId,
    questions,
    answers,
    enableAiSemanticFallback
  );

  // Save result in store
  assessmentStore.setMappingResult(assessmentId, mappingResult);

  return NextResponse.json(mappingResult);
}
