/**
 * AI Question Extraction Types & Schemas
 */

import { QuestionStatus } from "@/lib/types";

export interface BoundingBox {
  /** X coordinate (pixels or normalized based on page image) */
  x: number;
  /** Y coordinate */
  y: number;
  /** Width */
  width: number;
  /** Height */
  height: number;
}

export interface QuestionRegion {
  page: number;
  boundingBox: BoundingBox;
}

export interface ExtractedQuestion {
  /** Unique question identifier (e.g. "q-1", "q-11-a") */
  id: string;
  /** Exact printed question number string as detected (e.g. "1", "10", "11(a)", "11(b)", "Q4 (i)") */
  number: string;
  /** Complete question text without the leading question number */
  text: string;
  /** 1-based sequential integer representing printed order */
  order: number;
  /** Parent question number if this is a sub-part (e.g. "11" for "11(a)", "4" for "Q4(i)") */
  parentNumber?: string | null;
  /** Specific sub-part label if applicable (e.g. "a", "b", "i", "ii") */
  partLabel?: string | null;
  /** Maximum marks allocated to this question if printed in paper (e.g. 2, 5) */
  maxMarks?: number | null;
  /** Source page numbers where this question appears or spans (e.g. [1] or [1, 2]) */
  sourcePages: number[];
  /** Approximate bounding region containing the printed question on the page */
  region?: QuestionRegion | null;
  /** Confidence score between 0.0 and 1.0 */
  confidence: number;
  /** Lifecycle status in assessment workflow */
  status?: QuestionStatus;
}

export interface QuestionExtractionResult {
  assessmentId: string;
  status: "success" | "needs_review" | "error";
  questions: ExtractedQuestion[];
  totalQuestions: number;
  extractionTimeMs: number;
  modelUsed: string;
  message?: string;
  createdAt: string;
}

export interface RawAiQuestionItem {
  number?: string | number;
  text?: string;
  order?: number;
  parentNumber?: string | null;
  partLabel?: string | null;
  maxMarks?: number | null;
  sourcePages?: number[];
  region?: {
    page?: number;
    boundingBox?: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    };
  } | null;
  confidence?: number;
}

export interface RawAiExtractionResponse {
  questions?: RawAiQuestionItem[];
}
