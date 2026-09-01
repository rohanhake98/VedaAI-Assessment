/**
 * Question Number Normalization & Canonical Key Generation
 */

export interface ParsedQuestionReference {
  canonicalKey: string;
  parentNumber: string | null;
  partLabel: string | null;
  raw: string;
}

/**
 * Normalizes any question number string into a clean canonical key.
 *
 * Examples:
 *   "Q. 1"        -> "1"
 *   "Ans 11(a)"   -> "11(a)"
 *   "11 a"        -> "11(a)"
 *   "11-a"        -> "11(a)"
 *   "Q4 (i)"      -> "4(i)"
 *   "Section A-1" -> "section-a-1"
 */
export function normalizeQuestionReference(rawInput: string | number | null | undefined): ParsedQuestionReference {
  if (rawInput === null || rawInput === undefined) {
    return {
      canonicalKey: "",
      parentNumber: null,
      partLabel: null,
      raw: "",
    };
  }

  const raw = String(rawInput).trim();
  if (raw.length === 0) {
    return {
      canonicalKey: "",
      parentNumber: null,
      partLabel: null,
      raw: "",
    };
  }

  // Strip standard prefixes like "Q.", "Question", "Ans.", "Answer", "No."
  let cleaned = raw
    .replace(/^(?:Question|Ans(?:wer)?|Q|No)\.?\s*[:\-]?\s*/i, "")
    .trim();

  // Pattern 1: Alphanumeric subpart like "11(a)", "11 (a)", "11-a", "11.a", "11 a"
  const subpartAlphaMatch = cleaned.match(/^(\d+)[\s\-\.]*[\(\[]?([a-zA-Z])[\)\]]?$/);
  if (subpartAlphaMatch) {
    const parent = subpartAlphaMatch[1];
    const part = subpartAlphaMatch[2].toLowerCase();
    return {
      canonicalKey: `${parent}(${part})`,
      parentNumber: parent,
      partLabel: part,
      raw,
    };
  }

  // Pattern 2: Roman numeral subpart like "4(i)", "4 (ii)", "4-iii", "4.iv"
  const subpartRomanMatch = cleaned.match(/^(\d+)[\s\-\.]*[\(\[]?([ivxIVX]+)[\)\]]?$/);
  if (subpartRomanMatch) {
    const parent = subpartRomanMatch[1];
    const part = subpartRomanMatch[2].toLowerCase();
    return {
      canonicalKey: `${parent}(${part})`,
      parentNumber: parent,
      partLabel: part,
      raw,
    };
  }

  // Pattern 3: Standalone parent/part like "(a)", "(b)", "(i)", "(ii)"
  const standalonePartMatch = cleaned.match(/^[\(\[]?([a-zA-Z]|[ivxIVX]+)[\)\]]?$/);
  if (standalonePartMatch && !/^\d+$/.test(cleaned)) {
    const part = standalonePartMatch[1].toLowerCase();
    return {
      canonicalKey: `(${part})`,
      parentNumber: null,
      partLabel: part,
      raw,
    };
  }

  // Pattern 4: Pure integer e.g. "1", "2", "10", "100"
  const integerMatch = cleaned.match(/^(\d+)$/);
  if (integerMatch) {
    return {
      canonicalKey: integerMatch[1],
      parentNumber: integerMatch[1],
      partLabel: null,
      raw,
    };
  }

  // Fallback: clean lowercase slug
  const slug = cleaned.toLowerCase().replace(/[^a-z0-9\(\)]/g, "");
  return {
    canonicalKey: slug || cleaned.toLowerCase(),
    parentNumber: null,
    partLabel: null,
    raw,
  };
}

/**
 * Checks if two question reference strings resolve to the exact same canonical key.
 */
export function areQuestionReferencesEqual(refA: string | number | null | undefined, refB: string | number | null | undefined): boolean {
  const normA = normalizeQuestionReference(refA);
  const normB = normalizeQuestionReference(refB);
  if (!normA.canonicalKey || !normB.canonicalKey) return false;
  return normA.canonicalKey === normB.canonicalKey;
}
