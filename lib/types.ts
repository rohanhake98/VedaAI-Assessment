/**
 * Conceptual types for VedaAI Assessment application.
 * Note: These are initial interfaces and will be refined during implementation.
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnswerRegion {
  id?: string;
  page: number;
  boundingBox: BoundingBox;
}

export type QuestionStatus = "unmapped" | "mapped" | "partial";

export interface Question {
  id: string;
  number: string | number;
  text: string;
  maxMarks?: number;
  status?: QuestionStatus;
}

export interface Answer {
  id: string;
  detectedQuestionNumber?: string | number;
  text: string;
  regions: AnswerRegion[];
  mappedQuestionId?: string;
  confidence?: number;
}

export type ProcessingStatus = "idle" | "uploading" | "processing" | "completed" | "failed";

export interface Assessment {
  id?: string;
  questionPaperUrl?: string;
  answerSheetUrl?: string;
  questions: Question[];
  answers: Answer[];
  processingStatus: ProcessingStatus;
}
