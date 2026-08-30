/**
 * Shared in-memory store for assessments during processing.
 *
 * Scoped to the Node.js server instance.
 * For multi-instance production deployments, this can be swapped with Redis / Object Storage.
 */

import { ProcessingResult } from "@/lib/document-processing/types";
import { QuestionExtractionResult } from "@/lib/ai/types";

export interface StoredAssessment {
  processingResult: ProcessingResult;
  extractedQuestionsResult?: QuestionExtractionResult;
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

  private prune(): void {
    if (this.store.size > this.MAX_ENTRIES) {
      // Remove oldest
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
