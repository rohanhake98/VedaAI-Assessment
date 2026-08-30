/**
 * Conceptual types for VedaAI Assessment application.
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

export type QuestionStatus = "answered" | "unanswered" | "ambiguous";
export type AnswerStatus = "mapped" | "unmatched" | "ambiguous";
export type ProcessingStatus =
  | "idle"
  | "uploading"
  | "extracting_questions"
  | "extracting_answers"
  | "mapping"
  | "highlighting"
  | "completed"
  | "error";

export interface Question {
  id: string;
  number: string | number;
  text: string;
  order?: number;
  parentNumber?: string;
  partLabel?: string;
  status?: QuestionStatus;
  answerId?: string;
  maxMarks?: number;
}

export interface Answer {
  id: string;
  detectedQuestionNumber?: string | number;
  text?: string;
  regions: AnswerRegion[];
  mappedQuestionId?: string;
  confidence?: number;
  status?: AnswerStatus;
}

export interface Assessment {
  id?: string;
  questionPaperUrl?: string;
  answerSheetUrl?: string;
  questions: Question[];
  answers: Answer[];
  processingStatus: ProcessingStatus;
}

export interface UploadedFile {
  file: File;
  name: string;
  size: number;
  pages?: number;
}
