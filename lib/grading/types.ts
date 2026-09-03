/**
 * AI-Assisted Grading & Evaluation Domain Types
 */

export type GradingEvaluation =
  | "correct"
  | "mostly_correct"
  | "partially_correct"
  | "incorrect"
  | "unanswered"
  | "needs_review";

export type GradingStatus =
  | "graded"
  | "needs_review"
  | "unanswered"
  | "failed";

export interface QuestionGrade {
  /** Target Question ID */
  questionId: string;
  /** Printed Question Number */
  questionNumber: string;
  /** Maximum obtainable marks (or null if unavailable on paper) */
  maxMarks: number | null;
  /** AI-suggested marks */
  aiMarks: number;
  /** Final effective marks (teacher modified or AI suggested) */
  finalMarks: number;
  /** Whether the teacher has manually edited this score */
  teacherModified: boolean;
  /** Semantic evaluation bucket */
  evaluation: GradingEvaluation;
  /** Concise teacher-facing pedagogical feedback */
  feedback: string;
  /** Bulleted strengths identified in student's response */
  strengths: string[];
  /** Bulleted actionable areas for improvement */
  improvements: string[];
  /** AI evaluation confidence between 0.0 and 1.0 */
  confidence: number;
  /** Status of this grade */
  gradingStatus: GradingStatus;
}

export interface OverallInsight {
  summary: string;
  strengths: string[];
  areasForImprovement: string[];
}

export interface GradingSummary {
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  ambiguousCount: number;
  unmatchedAnswerCount: number;
  totalMarksAwarded: number;
  totalMaxMarks: number | null;
  percentage: number | null;
}

export interface GradingResult {
  assessmentId: string;
  status: "success" | "needs_review" | "error";
  grades: QuestionGrade[];
  summary: GradingSummary;
  overallInsight?: OverallInsight;
  gradingTimeMs: number;
  createdAt: string;
  message?: string;
}
