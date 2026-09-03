/**
 * AssessmentContext — client-side state shared across the upload → processing → assessment flow.
 *
 * Stores:
 * - Selected File objects
 * - Upload/processing metadata result (assessmentId, page counts, etc.)
 * - Real AI-extracted questions (Phase 4)
 * - Real AI-extracted handwritten answers & regions (Phase 5)
 * - Real answer mapping result (Phase 6)
 * - Real AI-assisted grading & marks result (Phase 8)
 */
"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import {
  ExtractedQuestion,
  QuestionExtractionResult,
  ExtractedAnswer,
  AnswerExtractionResult,
} from "@/lib/ai/types";
import { MappingResult } from "@/lib/mapping/types";
import { GradingResult } from "@/lib/grading/types";
import { calculateGradingSummary } from "@/lib/grading/grader";

export interface UploadedFileMeta {
  file: File;
  name: string;
  size: number;
}

export interface ApiProcessingResult {
  assessmentId: string;
  status: "ready_for_extraction" | "error";
  processingTimeMs: number;
  createdAt: string;
  questionPaper: {
    originalFileName: string;
    originalMimeType: string;
    pageCount: number;
  };
  answerSheet: {
    originalFileName: string;
    originalMimeType: string;
    pageCount: number;
  };
}

interface AssessmentState {
  questionPaper: UploadedFileMeta | null;
  answerSheet: UploadedFileMeta | null;
  processingResult: ApiProcessingResult | null;
  extractedQuestions: ExtractedQuestion[];
  extractionResult: QuestionExtractionResult | null;
  extractedAnswers: ExtractedAnswer[];
  answerExtractionResult: AnswerExtractionResult | null;
  mappingResult: MappingResult | null;
  gradingResult: GradingResult | null;
  uploadError: string | null;
  setQuestionPaper: (f: UploadedFileMeta | null) => void;
  setAnswerSheet: (f: UploadedFileMeta | null) => void;
  setProcessingResult: (r: ApiProcessingResult | null) => void;
  setExtractedQuestions: (q: ExtractedQuestion[]) => void;
  setExtractionResult: (r: QuestionExtractionResult | null) => void;
  setExtractedAnswers: (a: ExtractedAnswer[]) => void;
  setAnswerExtractionResult: (r: AnswerExtractionResult | null) => void;
  setMappingResult: (m: MappingResult | null) => void;
  setGradingResult: (g: GradingResult | null) => void;
  updateTeacherMarks: (questionId: string, marks: number) => void;
  setUploadError: (e: string | null) => void;
  clearAll: () => void;
}

const AssessmentContext = createContext<AssessmentState | null>(null);

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [questionPaper, setQuestionPaper] = useState<UploadedFileMeta | null>(null);
  const [answerSheet, setAnswerSheet] = useState<UploadedFileMeta | null>(null);
  const [processingResult, setProcessingResult] = useState<ApiProcessingResult | null>(null);
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([]);
  const [extractionResult, setExtractionResult] = useState<QuestionExtractionResult | null>(null);
  const [extractedAnswers, setExtractedAnswers] = useState<ExtractedAnswer[]>([]);
  const [answerExtractionResult, setAnswerExtractionResult] = useState<AnswerExtractionResult | null>(null);
  const [mappingResult, setMappingResult] = useState<MappingResult | null>(null);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const updateTeacherMarks = (questionId: string, marks: number) => {
    if (!gradingResult) return;

    const newGrades = gradingResult.grades.map((g) => {
      if (g.questionId === questionId) {
        const effectiveMax = g.maxMarks ?? 5;
        const clamped = Math.max(0, Math.min(marks, effectiveMax));
        const ratio = effectiveMax > 0 ? clamped / effectiveMax : 0;
        let evalStatus = g.evaluation;
        if (clamped === 0 && g.evaluation === "unanswered") {
          evalStatus = "unanswered";
        } else if (ratio >= 0.95) {
          evalStatus = "correct";
        } else if (ratio >= 0.70) {
          evalStatus = "mostly_correct";
        } else if (ratio >= 0.30) {
          evalStatus = "partially_correct";
        } else {
          evalStatus = "incorrect";
        }

        return {
          ...g,
          finalMarks: clamped,
          teacherModified: true,
          evaluation: evalStatus,
          feedback: `Teacher adjusted marks to ${clamped}/${effectiveMax}.`,
        };
      }
      return g;
    });

    const newSummary = calculateGradingSummary(newGrades, mappingResult?.unmatchedAnswers.length || 0);

    setGradingResult({
      ...gradingResult,
      grades: newGrades,
      summary: newSummary,
    });
  };

  const clearAll = () => {
    setQuestionPaper(null);
    setAnswerSheet(null);
    setProcessingResult(null);
    setExtractedQuestions([]);
    setExtractionResult(null);
    setExtractedAnswers([]);
    setAnswerExtractionResult(null);
    setMappingResult(null);
    setGradingResult(null);
    setUploadError(null);
  };

  return (
    <AssessmentContext.Provider
      value={{
        questionPaper,
        answerSheet,
        processingResult,
        extractedQuestions,
        extractionResult,
        extractedAnswers,
        answerExtractionResult,
        mappingResult,
        gradingResult,
        uploadError,
        setQuestionPaper,
        setAnswerSheet,
        setProcessingResult,
        setExtractedQuestions,
        setExtractionResult,
        setExtractedAnswers,
        setAnswerExtractionResult,
        setMappingResult,
        setGradingResult,
        updateTeacherMarks,
        setUploadError,
        clearAll,
      }}
    >
      {children}
    </AssessmentContext.Provider>
  );
}

export function useAssessment(): AssessmentState {
  const ctx = useContext(AssessmentContext);
  if (!ctx) throw new Error("useAssessment must be used inside <AssessmentProvider>");
  return ctx;
}
