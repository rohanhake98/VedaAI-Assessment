/**
 * Answer-to-Question Mapping Engine
 *
 * Consumes Real Extracted Questions + Real Extracted Answers.
 * Produces structured MappedQuestions (answered, unanswered, ambiguous) and UnmatchedAnswers.
 */

import { ExtractedQuestion, ExtractedAnswer, AnswerRegion } from "@/lib/ai/types";
import {
  MappedQuestion,
  MappingResult,
  UnmatchedAnswer,
} from "./types";
import {
  normalizeQuestionReference,
  areQuestionReferencesEqual,
} from "./normalization";
import {
  findBestSemanticMatches,
  matchAnswerSemanticallyWithAi,
} from "./semantic-matcher";

export class AnswerMapper {
  /**
   * Maps student answers to question paper questions.
   */
  public async mapAnswers(
    assessmentId: string,
    questions: ExtractedQuestion[],
    answers: ExtractedAnswer[],
    enableAiSemanticFallback = false
  ): Promise<MappingResult> {
    const startTime = Date.now();

    if (!questions || questions.length === 0) {
      return {
        assessmentId,
        status: "needs_review",
        mappedQuestions: [],
        unmatchedAnswers: (answers || []).map((a) => ({
          answerId: a.id,
          detectedQuestionNumber: a.detectedQuestionNumber,
          text: a.text,
          regions: a.regions,
          confidence: a.confidence,
          reason: "No questions provided in assessment.",
        })),
        totalQuestions: 0,
        answeredCount: 0,
        unansweredCount: 0,
        ambiguousCount: 0,
        unmatchedAnswerCount: answers?.length || 0,
        mappingTimeMs: Date.now() - startTime,
        createdAt: new Date().toISOString(),
        message: "No questions found to map answers against.",
      };
    }

    // ── 1. Index questions by canonical keys ─────────────────────────────────
    const questionByCanonicalKey = new Map<string, ExtractedQuestion>();
    const questionsByParentKey = new Map<string, ExtractedQuestion[]>();

    for (const q of questions) {
      const norm = normalizeQuestionReference(q.number);
      questionByCanonicalKey.set(norm.canonicalKey, q);

      if (norm.parentNumber) {
        const existing = questionsByParentKey.get(norm.parentNumber) || [];
        existing.push(q);
        questionsByParentKey.set(norm.parentNumber, existing);
      }
    }

    // Track answers assigned to each questionId: questionId -> ExtractedAnswer[]
    const assignedAnswersByQuestionId = new Map<string, ExtractedAnswer[]>();
    const matchedAnswerIds = new Set<string>();
    const unmatchedAnswers: UnmatchedAnswer[] = [];

    // ── 2. Explicit Number / Sub-part Matching ───────────────────────────────
    for (const ans of answers) {
      if (!ans.detectedQuestionNumber) continue; // Handled in semantic pass

      const ansNorm = normalizeQuestionReference(ans.detectedQuestionNumber);
      if (!ansNorm.canonicalKey) continue;

      // Exact canonical key match (e.g. "1" -> "1", "11(a)" -> "11(a)")
      const exactQuestion = questionByCanonicalKey.get(ansNorm.canonicalKey);
      if (exactQuestion) {
        const currentList = assignedAnswersByQuestionId.get(exactQuestion.id) || [];
        currentList.push(ans);
        assignedAnswersByQuestionId.set(exactQuestion.id, currentList);
        matchedAnswerIds.add(ans.id);
        continue;
      }

      // Check sub-part specific matching (e.g., student wrote "11 a" and question is "11(a)")
      let foundSubpartMatch = false;
      if (ansNorm.parentNumber && ansNorm.partLabel) {
        const siblings = questionsByParentKey.get(ansNorm.parentNumber) || [];
        const matchingSibling = siblings.find((s) => {
          const sNorm = normalizeQuestionReference(s.number);
          return (
            sNorm.partLabel === ansNorm.partLabel ||
            areQuestionReferencesEqual(s.number, `${ansNorm.parentNumber}(${ansNorm.partLabel})`)
          );
        });

        if (matchingSibling) {
          const currentList = assignedAnswersByQuestionId.get(matchingSibling.id) || [];
          currentList.push(ans);
          assignedAnswersByQuestionId.set(matchingSibling.id, currentList);
          matchedAnswerIds.add(ans.id);
          foundSubpartMatch = true;
        }
      }

      // If explicit number was written but does not exist anywhere on the question paper:
      if (!foundSubpartMatch) {
        unmatchedAnswers.push({
          answerId: ans.id,
          detectedQuestionNumber: ans.detectedQuestionNumber,
          text: ans.text,
          regions: ans.regions,
          confidence: ans.confidence,
          reason: `Question reference "${ans.detectedQuestionNumber}" does not exist in question paper.`,
        });
        matchedAnswerIds.add(ans.id); // marked as evaluated
      }
    }

    // ── 3. Semantic Matching for Unlabelled / Missing Reference Answers ─────
    const unlabelledAnswers = answers.filter((a) => !matchedAnswerIds.has(a.id));

    // Determine currently unanswered questions
    const currentlyUnansweredQuestions = questions.filter(
      (q) => !assignedAnswersByQuestionId.has(q.id)
    );

    for (const ans of unlabelledAnswers) {
      if (currentlyUnansweredQuestions.length === 0) {
        unmatchedAnswers.push({
          answerId: ans.id,
          detectedQuestionNumber: ans.detectedQuestionNumber,
          text: ans.text,
          regions: ans.regions,
          confidence: ans.confidence,
          reason: "No remaining unanswered questions available.",
        });
        continue;
      }

      if (enableAiSemanticFallback) {
        const aiResult = await matchAnswerSemanticallyWithAi(
          ans.text,
          currentlyUnansweredQuestions
        );

        if (aiResult.matchedQuestionId && aiResult.confidence >= 0.7) {
          const currentList = assignedAnswersByQuestionId.get(aiResult.matchedQuestionId) || [];
          currentList.push(ans);
          assignedAnswersByQuestionId.set(aiResult.matchedQuestionId, currentList);
          matchedAnswerIds.add(ans.id);
          continue;
        }
      } else {
        // Fast deterministic semantic matching
        const semanticCandidates = findBestSemanticMatches(
          ans.text,
          currentlyUnansweredQuestions,
          0.30
        );

        if (semanticCandidates.length === 1 && semanticCandidates[0].similarity >= 0.35) {
          // Single strong semantic match
          const matchedQ = currentlyUnansweredQuestions.find(
            (q) => q.id === semanticCandidates[0].questionId
          );
          if (matchedQ) {
            const currentList = assignedAnswersByQuestionId.get(matchedQ.id) || [];
            currentList.push(ans);
            assignedAnswersByQuestionId.set(matchedQ.id, currentList);
            matchedAnswerIds.add(ans.id);
            continue;
          }
        }
      }

      // If semantic matching was weak or ambiguous
      unmatchedAnswers.push({
        answerId: ans.id,
        detectedQuestionNumber: ans.detectedQuestionNumber,
        text: ans.text,
        regions: ans.regions,
        confidence: ans.confidence,
        reason: "Unlabelled answer with no confident semantic match.",
      });
    }

    // ── 4. Build Mapped Questions in Printed Question Order ─────────────────
    const mappedQuestions: MappedQuestion[] = [];
    let answeredCount = 0;
    let unansweredCount = 0;
    let ambiguousCount = 0;

    for (const q of questions) {
      const qNorm = normalizeQuestionReference(q.number);
      const assigned = assignedAnswersByQuestionId.get(q.id) || [];

      if (assigned.length === 1) {
        // Single clearly matched answer
        const ans = assigned[0];
        answeredCount++;

        mappedQuestions.push({
          questionId: q.id,
          questionNumber: q.number,
          canonicalKey: qNorm.canonicalKey,
          order: q.order,
          text: q.text,
          parentNumber: q.parentNumber,
          partLabel: q.partLabel,
          maxMarks: q.maxMarks,
          mappingStatus: "answered",
          answerId: ans.id,
          answerText: ans.text,
          regions: ans.regions,
          confidence: ans.confidence,
          matchMethod: ans.detectedQuestionNumber ? "explicit_exact" : "semantic",
          candidateAnswerIds: [ans.id],
        });
      } else if (assigned.length > 1) {
        // Multiple candidate answers detected for this question (duplicate/ambiguous)
        ambiguousCount++;
        const allRegions: AnswerRegion[] = [];
        const combinedTexts: string[] = [];

        assigned.forEach((a, idx) => {
          allRegions.push(...a.regions);
          combinedTexts.push(`[Attempt ${idx + 1} (Ans ${a.detectedQuestionNumber || "unlabelled"})]: ${a.text}`);
        });

        mappedQuestions.push({
          questionId: q.id,
          questionNumber: q.number,
          canonicalKey: qNorm.canonicalKey,
          order: q.order,
          text: q.text,
          parentNumber: q.parentNumber,
          partLabel: q.partLabel,
          maxMarks: q.maxMarks,
          mappingStatus: "ambiguous",
          answerId: assigned[0].id,
          answerText: combinedTexts.join("\n\n"),
          regions: allRegions,
          confidence: 0.55,
          matchMethod: "ambiguous",
          candidateAnswerIds: assigned.map((a) => a.id),
          ambiguityReason: `Multiple answer attempts detected (${assigned.length} candidates).`,
        });
      } else {
        // Unanswered question
        unansweredCount++;

        mappedQuestions.push({
          questionId: q.id,
          questionNumber: q.number,
          canonicalKey: qNorm.canonicalKey,
          order: q.order,
          text: q.text,
          parentNumber: q.parentNumber,
          partLabel: q.partLabel,
          maxMarks: q.maxMarks,
          mappingStatus: "unanswered",
          answerId: null,
          answerText: null,
          regions: [],
          confidence: 1.0,
          matchMethod: "none",
          candidateAnswerIds: [],
        });
      }
    }

    // Sort deterministically by printed question order
    mappedQuestions.sort((a, b) => a.order - b.order);

    return {
      assessmentId,
      status: "success",
      mappedQuestions,
      unmatchedAnswers,
      totalQuestions: mappedQuestions.length,
      answeredCount,
      unansweredCount,
      ambiguousCount,
      unmatchedAnswerCount: unmatchedAnswers.length,
      mappingTimeMs: Date.now() - startTime,
      createdAt: new Date().toISOString(),
    };
  }
}

export const answerMapper = new AnswerMapper();
