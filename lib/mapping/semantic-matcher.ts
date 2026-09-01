/**
 * Semantic Matching Module for Answer-to-Question Resolution
 *
 * Uses a blend of Keyword Containment (Overlap Coefficient) and Jaccard Similarity,
 * with optional AI reasoning fallback for answers with missing, ambiguous, or unlabelled question references.
 */

import { ExtractedQuestion } from "@/lib/ai/types";
import { aiClient } from "@/lib/ai/client";

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "with", "by", "from", "up", "about", "into", "over", "after", "is", "are",
  "was", "were", "be", "been", "being", "have", "has", "had", "do", "does",
  "did", "will", "would", "shall", "should", "can", "could", "may", "might",
  "must", "that", "which", "who", "whom", "this", "these", "those", "it",
  "its", "they", "them", "their", "we", "our", "you", "your", "i", "my",
  "what", "why", "how", "when", "where", "explain", "describe", "define",
  "state", "give", "name", "list", "identify", "calculate", "compare", "discuss"
]);

/**
 * Extracts meaningful content keywords (lowercased, stripped of punctuation).
 */
export function extractKeywords(text: string): Set<string> {
  if (!text) return new Set();

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  return new Set(words);
}

/**
 * Computes hybrid semantic similarity between short question prompt and answer text.
 * Combines Overlap Coefficient (containment) with Jaccard similarity.
 */
export function computeKeywordSimilarity(questionText: string, answerText: string): number {
  const qSet = extractKeywords(questionText);
  const aSet = extractKeywords(answerText);

  if (qSet.size === 0 || aSet.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const token of qSet) {
    if (aSet.has(token)) {
      intersectionCount++;
    }
  }

  if (intersectionCount === 0) return 0.0;

  const minSize = Math.min(qSet.size, aSet.size);
  const unionSize = new Set([...qSet, ...aSet]).size;

  const overlap = intersectionCount / minSize;
  const jaccard = intersectionCount / unionSize;

  // 70% Overlap weight (for short prompt in long answer) + 30% Jaccard
  return 0.7 * overlap + 0.3 * jaccard;
}

export interface SemanticMatchCandidate {
  questionId: string;
  similarity: number;
  questionNumber: string;
}

/**
 * Finds the top semantic question matches for a given answer text among available questions.
 */
export function findBestSemanticMatches(
  answerText: string,
  availableQuestions: ExtractedQuestion[],
  threshold = 0.25
): SemanticMatchCandidate[] {
  const matches: SemanticMatchCandidate[] = [];

  for (const q of availableQuestions) {
    const similarity = computeKeywordSimilarity(q.text, answerText);
    if (similarity >= threshold) {
      matches.push({
        questionId: q.id,
        questionNumber: q.number,
        similarity,
      });
    }
  }

  matches.sort((a, b) => b.similarity - a.similarity);
  return matches;
}

/**
 * AI-assisted semantic matching for ambiguous/unlabelled answers.
 * Strictly constrained to choose ONLY among provided candidate question IDs.
 */
export async function matchAnswerSemanticallyWithAi(
  answerText: string,
  candidateQuestions: ExtractedQuestion[]
): Promise<{ matchedQuestionId: string | null; confidence: number; reason: string }> {
  if (!aiClient.isConfigured() || candidateQuestions.length === 0 || !answerText.trim()) {
    // Fallback to deterministic similarity
    const deterministic = findBestSemanticMatches(answerText, candidateQuestions);
    if (deterministic.length > 0 && deterministic[0].similarity >= 0.30) {
      return {
        matchedQuestionId: deterministic[0].questionId,
        confidence: Math.min(0.90, 0.5 + deterministic[0].similarity * 0.4),
        reason: `Matched based on keyword similarity (${Math.round(deterministic[0].similarity * 100)}%)`,
      };
    }
    return {
      matchedQuestionId: null,
      confidence: 0,
      reason: "No confident semantic match found.",
    };
  }

  const prompt = `You are an exam grading assistant. A student provided a handwritten answer without a clear question number.
Match the student's answer text to ONE of the provided exam questions.

STUDENT ANSWER:
"${answerText}"

AVAILABLE QUESTIONS:
${candidateQuestions
  .map((q) => `[ID: ${q.id}] (Question ${q.number}): "${q.text}"`)
  .join("\n")}

Respond ONLY with valid JSON:
{
  "matchedQuestionId": "exact_question_id_or_null",
  "confidence": 0.85,
  "reason": "Brief explanation of why it matches"
}`;

  try {
    const res = await aiClient.generateContent({
      parts: [{ text: prompt }],
      temperature: 0.1,
      responseMimeType: "application/json",
    });

    let clean = res.text.trim();
    if (clean.startsWith("```")) {
      clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    }

    const data = JSON.parse(clean);
    const validId = candidateQuestions.some((q) => q.id === data.matchedQuestionId)
      ? data.matchedQuestionId
      : null;

    return {
      matchedQuestionId: validId,
      confidence: typeof data.confidence === "number" ? Math.max(0, Math.min(1, data.confidence)) : 0.7,
      reason: data.reason || "Semantic AI match",
    };
  } catch (err) {
    console.warn("[semantic-matcher] AI match fallback failed:", err);
    const deterministic = findBestSemanticMatches(answerText, candidateQuestions);
    if (deterministic.length > 0 && deterministic[0].similarity >= 0.30) {
      return {
        matchedQuestionId: deterministic[0].questionId,
        confidence: 0.65,
        reason: "Keyword match fallback",
      };
    }
    return {
      matchedQuestionId: null,
      confidence: 0,
      reason: "No confident match found.",
    };
  }
}
