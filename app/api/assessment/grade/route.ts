/**
 * POST /api/assessment/grade
 *
 * Runs AI-assisted grading on mapped assessment questions, enforcing strict schema validation,
 * deterministic scoring calculations, and teacher score overrides.
 */

import { NextRequest, NextResponse } from "next/server";
import { assessmentStore } from "@/lib/assessment-store";
import { answerGrader } from "@/lib/grading";

export function GET() {
  return NextResponse.json({
    message: "VedaAI Assessment Grading API — use POST with { assessmentId } to grade mapped answers.",
  });
}

export async function POST(req: NextRequest) {
  let body: { assessmentId?: string; teacherOverrides?: Record<string, number> };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Expected { assessmentId: string, teacherOverrides?: object }." },
      { status: 400 }
    );
  }

  const { assessmentId, teacherOverrides = {} } = body;

  if (!assessmentId || typeof assessmentId !== "string" || assessmentId.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing or invalid 'assessmentId' in request body." },
      { status: 400 }
    );
  }

  // Retrieve stored assessment
  const stored = assessmentStore.get(assessmentId);
  if (!stored) {
    return NextResponse.json(
      {
        error: `Assessment with ID "${assessmentId}" was not found or has expired. Please re-upload your files.`,
      },
      { status: 404 }
    );
  }

  // Verify mapping results are present
  const mappingResult = stored.mappingResult;
  if (!mappingResult || !mappingResult.mappedQuestions || mappingResult.mappedQuestions.length === 0) {
    return NextResponse.json(
      {
        error: "No mapped questions found for this assessment. Please complete answer mapping before grading.",
      },
      { status: 422 }
    );
  }

  try {
    const combinedOverrides = {
      ...(stored.teacherOverrides || {}),
      ...teacherOverrides,
    };

    const gradingResult = await answerGrader.gradeAssessment(
      assessmentId,
      mappingResult.mappedQuestions,
      mappingResult.unmatchedAnswers || [],
      combinedOverrides
    );

    // Cache grading result in store
    assessmentStore.setGradingResult(assessmentId, gradingResult);

    return NextResponse.json(gradingResult);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal grading error";
    console.error(`[grade-route] Grading failed for ${assessmentId}:`, err);
    return NextResponse.json(
      { error: `Grading failed: ${message}` },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  let body: { assessmentId?: string; questionId?: string; marks?: number };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Expected { assessmentId: string, questionId: string, marks: number }." },
      { status: 400 }
    );
  }

  const { assessmentId, questionId, marks } = body;

  if (!assessmentId || !questionId || typeof marks !== "number") {
    return NextResponse.json(
      { error: "Missing required fields: assessmentId, questionId, and numeric marks." },
      { status: 400 }
    );
  }

  const updatedResult = assessmentStore.setTeacherOverride(assessmentId, questionId, marks);
  if (!updatedResult) {
    return NextResponse.json(
      { error: `Assessment "${assessmentId}" or its grading result was not found.` },
      { status: 404 }
    );
  }

  return NextResponse.json(updatedResult);
}
