/**
 * Shared in-memory store for assessments during processing.
 *
 * Scoped to the Node.js server instance.
 * For multi-instance production deployments, this can be swapped with Redis / Object Storage.
 */

import { ProcessingResult } from "@/lib/document-processing/types";
import { QuestionExtractionResult, AnswerExtractionResult } from "@/lib/ai/types";
import { MappingResult } from "@/lib/mapping/types";
import { GradingResult, QuestionGrade } from "@/lib/grading/types";
import { calculateGradingSummary } from "@/lib/grading/grader";

export interface StoredAssessment {
  processingResult: ProcessingResult;
  extractedQuestionsResult?: QuestionExtractionResult;
  extractedAnswersResult?: AnswerExtractionResult;
  mappingResult?: MappingResult;
  gradingResult?: GradingResult;
  teacherOverrides?: Record<string, number>;
  updatedAt: number;
}

class AssessmentStore {
  private store = new Map<string, StoredAssessment>();
  private readonly MAX_ENTRIES = 25;

  public set(assessmentId: string, processingResult: ProcessingResult): void {
    this.store.set(assessmentId, {
      processingResult,
      updatedAt: Date.now(),
    });
    this.prune();
  }

  public get(assessmentId: string): StoredAssessment | undefined {
    return this.store.get(assessmentId);
  }

  public setQuestionsResult(
    assessmentId: string,
    extractedQuestionsResult: QuestionExtractionResult
  ): boolean {
    const item = this.store.get(assessmentId);
    if (!item) return false;

    item.extractedQuestionsResult = extractedQuestionsResult;
    item.updatedAt = Date.now();
    return true;
  }

  public getQuestionsResult(
    assessmentId: string
  ): QuestionExtractionResult | undefined {
    return this.store.get(assessmentId)?.extractedQuestionsResult;
  }

  public setAnswersResult(
    assessmentId: string,
    extractedAnswersResult: AnswerExtractionResult
  ): boolean {
    const item = this.store.get(assessmentId);
    if (!item) return false;

    item.extractedAnswersResult = extractedAnswersResult;
    item.updatedAt = Date.now();
    return true;
  }

  public getAnswersResult(
    assessmentId: string
  ): AnswerExtractionResult | undefined {
    return this.store.get(assessmentId)?.extractedAnswersResult;
  }

  public setMappingResult(
    assessmentId: string,
    mappingResult: MappingResult
  ): boolean {
    const item = this.store.get(assessmentId);
    if (!item) return false;

    item.mappingResult = mappingResult;
    item.updatedAt = Date.now();
    return true;
  }

  public getMappingResult(
    assessmentId: string
  ): MappingResult | undefined {
    return this.store.get(assessmentId)?.mappingResult;
  }

  public setGradingResult(
    assessmentId: string,
    gradingResult: GradingResult
  ): boolean {
    const item = this.store.get(assessmentId);
    if (!item) return false;

    item.gradingResult = gradingResult;
    item.updatedAt = Date.now();
    return true;
  }

  public getGradingResult(
    assessmentId: string
  ): GradingResult | undefined {
    return this.store.get(assessmentId)?.gradingResult;
  }

  public setTeacherOverride(
    assessmentId: string,
    questionId: string,
    marks: number
  ): GradingResult | null {
    const item = this.store.get(assessmentId);
    if (!item || !item.gradingResult) return null;

    if (!item.teacherOverrides) {
      item.teacherOverrides = {};
    }
    item.teacherOverrides[questionId] = marks;

    // Update the grade in the cached grading result
    const targetGrade = item.gradingResult.grades.find((g) => g.questionId === questionId);
    if (targetGrade) {
      const maxMarks = targetGrade.maxMarks ?? 5;
      targetGrade.finalMarks = Math.max(0, Math.min(marks, maxMarks));
      targetGrade.teacherModified = true;
      if (targetGrade.finalMarks === 0 && targetGrade.evaluation === "unanswered") {
        // Keep unanswered
      } else {
        const ratio = maxMarks > 0 ? targetGrade.finalMarks / maxMarks : 0;
        if (ratio >= 0.95) targetGrade.evaluation = "correct";
        else if (ratio >= 0.70) targetGrade.evaluation = "mostly_correct";
        else if (ratio >= 0.30) targetGrade.evaluation = "partially_correct";
        else targetGrade.evaluation = "incorrect";
      }
    }

    // Recalculate summary
    item.gradingResult.summary = calculateGradingSummary(
      item.gradingResult.grades,
      item.mappingResult?.unmatchedAnswers.length || 0
    );

    item.updatedAt = Date.now();
    return item.gradingResult;
  }

  private prune(): void {
    if (this.store.size > this.MAX_ENTRIES) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [key, val] of this.store.entries()) {
        if (val.updatedAt < oldestTime) {
          oldestTime = val.updatedAt;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }
  }
}

export const assessmentStore = new AssessmentStore();
