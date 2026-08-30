/**
 * AssessmentContext — client-side state shared across the upload → processing → assessment flow.
 *
 * Stores:
 * - The two selected File objects (not uploaded yet)
 * - The API response after processing (assessmentId, page counts, etc.)
 *
 * Does NOT store full page image buffers — those live server-side in the in-memory store.
 */
"use client";

import { createContext, useContext, useState, ReactNode } from "react";

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
  uploadError: string | null;
  setQuestionPaper: (f: UploadedFileMeta | null) => void;
  setAnswerSheet: (f: UploadedFileMeta | null) => void;
  setProcessingResult: (r: ApiProcessingResult | null) => void;
  setUploadError: (e: string | null) => void;
  clearAll: () => void;
}

const AssessmentContext = createContext<AssessmentState | null>(null);

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [questionPaper, setQuestionPaper] = useState<UploadedFileMeta | null>(null);
  const [answerSheet, setAnswerSheet] = useState<UploadedFileMeta | null>(null);
  const [processingResult, setProcessingResult] = useState<ApiProcessingResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const clearAll = () => {
    setQuestionPaper(null);
    setAnswerSheet(null);
    setProcessingResult(null);
    setUploadError(null);
  };

  return (
    <AssessmentContext.Provider
      value={{
        questionPaper,
        answerSheet,
        processingResult,
        uploadError,
        setQuestionPaper,
        setAnswerSheet,
        setProcessingResult,
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
