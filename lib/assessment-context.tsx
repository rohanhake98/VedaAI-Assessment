/**
 * AssessmentContext — client-side state shared across the upload → processing → assessment flow.
 *
 * Stores:
 * - Selected File objects
 * - Upload/processing metadata result (assessmentId, page counts, etc.)
 * - Real AI-extracted questions
 */
"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { ExtractedQuestion, QuestionExtractionResult } from "@/lib/ai/types";

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
  uploadError: string | null;
  setQuestionPaper: (f: UploadedFileMeta | null) => void;
  setAnswerSheet: (f: UploadedFileMeta | null) => void;
  setProcessingResult: (r: ApiProcessingResult | null) => void;
  setExtractedQuestions: (q: ExtractedQuestion[]) => void;
  setExtractionResult: (r: QuestionExtractionResult | null) => void;
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
  const [uploadError, setUploadError] = useState<string | null>(null);

  const clearAll = () => {
    setQuestionPaper(null);
    setAnswerSheet(null);
    setProcessingResult(null);
    setExtractedQuestions([]);
    setExtractionResult(null);
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
        uploadError,
        setQuestionPaper,
        setAnswerSheet,
        setProcessingResult,
        setExtractedQuestions,
        setExtractionResult,
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
