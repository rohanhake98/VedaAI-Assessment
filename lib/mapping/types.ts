/**
 * Answer-to-Question Mapping Domain Types
 */

import { AnswerRegion } from "@/lib/ai/types";

export type MappingStatus = "answered" | "unanswered" | "ambiguous";

export type MatchMethod =
  | "explicit_exact"
  | "subpart_exact"
  | "semantic"
  | "ai_reasoning"
  | "ambiguous"
  | "none";

export interface MappedQuestion {
  /** Original Question ID */
  questionId: string;
  /** Exact printed question number (e.g. "1", "11(a)", "Q4(i)") */
  questionNumber: string;
  /** Canonical normalized question key (e.g. "1", "11(a)") */
  canonicalKey: string;
  /** 1-based sequential printed order */
  order: number;
  /** Complete question text */
  text: string;
  /** Parent question number if subpart (e.g. "11") */
  parentNumber?: string | null;
  /** Sub-part label if applicable (e.g. "a", "b", "i") */
  partLabel?: string | null;
  /** Maximum marks */
  maxMarks?: number | null;
  /** Final mapping status */
  mappingStatus: MappingStatus;
  /** Primary matched answer ID (if answered) */
  answerId?: string | null;
  /** Transcribed text of matched answer */
  answerText?: string | null;
  /** Exact bounding regions for this answer on answer sheet pages */
  regions: AnswerRegion[];
  /** Mapping confidence score between 0.0 and 1.0 */
  confidence: number;
  /** Signal used to establish the match */
  matchMethod: MatchMethod;
  /** Multiple candidate answer IDs if ambiguous */
  candidateAnswerIds?: string[];
  /** Optional explanation if mapping is ambiguous */
  ambiguityReason?: string;
}

export interface UnmatchedAnswer {
  answerId: string;
  detectedQuestionNumber: string | null;
  text: string;
  regions: AnswerRegion[];
  confidence: number;
  reason: string;
}

export interface MappingResult {
  assessmentId: string;
  status: "success" | "needs_review" | "error";
  mappedQuestions: MappedQuestion[];
  unmatchedAnswers: UnmatchedAnswer[];
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  ambiguousCount: number;
  unmatchedAnswerCount: number;
  mappingTimeMs: number;
  createdAt: string;
  message?: string;
}
