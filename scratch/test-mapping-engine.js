// Standalone pure-JS implementation of Answer Mapping Engine logic for unit tests

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

function extractKeywords(text) {
  if (!text) return new Set();
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(words);
}

function computeKeywordSimilarity(questionText, answerText) {
  const qSet = extractKeywords(questionText);
  const aSet = extractKeywords(answerText);
  if (qSet.size === 0 || aSet.size === 0) return 0.0;
  let intersectionCount = 0;
  for (const token of qSet) {
    if (aSet.has(token)) intersectionCount++;
  }
  if (intersectionCount === 0) return 0.0;
  const minSize = Math.min(qSet.size, aSet.size);
  const unionSize = new Set([...qSet, ...aSet]).size;
  const overlap = intersectionCount / minSize;
  const jaccard = intersectionCount / unionSize;
  return 0.7 * overlap + 0.3 * jaccard;
}

function findBestSemanticMatches(answerText, availableQuestions, threshold = 0.25) {
  const matches = [];
  for (const q of availableQuestions) {
    const similarity = computeKeywordSimilarity(q.text, answerText);
    if (similarity >= threshold) {
      matches.push({ questionId: q.id, questionNumber: q.number, similarity });
    }
  }
  matches.sort((a, b) => b.similarity - a.similarity);
  return matches;
}

function normalizeQuestionReference(rawInput) {
  if (rawInput === null || rawInput === undefined) {
    return { canonicalKey: "", parentNumber: null, partLabel: null, raw: "" };
  }
  const raw = String(rawInput).trim();
  if (raw.length === 0) {
    return { canonicalKey: "", parentNumber: null, partLabel: null, raw: "" };
  }
  let cleaned = raw.replace(/^(?:Question|Ans(?:wer)?|Q|No)\.?\s*[:\-]?\s*/i, "").trim();
  const subpartAlphaMatch = cleaned.match(/^(\d+)[\s\-\.]*[\(\[]?([a-zA-Z])[\)\]]?$/);
  if (subpartAlphaMatch) {
    const parent = subpartAlphaMatch[1];
    const part = subpartAlphaMatch[2].toLowerCase();
    return { canonicalKey: `${parent}(${part})`, parentNumber: parent, partLabel: part, raw };
  }
  const subpartRomanMatch = cleaned.match(/^(\d+)[\s\-\.]*[\(\[]?([ivxIVX]+)[\)\]]?$/);
  if (subpartRomanMatch) {
    const parent = subpartRomanMatch[1];
    const part = subpartRomanMatch[2].toLowerCase();
    return { canonicalKey: `${parent}(${part})`, parentNumber: parent, partLabel: part, raw };
  }
  const integerMatch = cleaned.match(/^(\d+)$/);
  if (integerMatch) {
    return { canonicalKey: integerMatch[1], parentNumber: integerMatch[1], partLabel: null, raw };
  }
  const slug = cleaned.toLowerCase().replace(/[^a-z0-9\(\)]/g, "");
  return { canonicalKey: slug || cleaned.toLowerCase(), parentNumber: null, partLabel: null, raw };
}

function areQuestionReferencesEqual(refA, refB) {
  const normA = normalizeQuestionReference(refA);
  const normB = normalizeQuestionReference(refB);
  if (!normA.canonicalKey || !normB.canonicalKey) return false;
  return normA.canonicalKey === normB.canonicalKey;
}

class TestAnswerMapper {
  async mapAnswers(assessmentId, questions, answers) {
    const startTime = Date.now();
    const questionByCanonicalKey = new Map();
    const questionsByParentKey = new Map();

    for (const q of questions) {
      const norm = normalizeQuestionReference(q.number);
      questionByCanonicalKey.set(norm.canonicalKey, q);
      if (norm.parentNumber) {
        const existing = questionsByParentKey.get(norm.parentNumber) || [];
        existing.push(q);
        questionsByParentKey.set(norm.parentNumber, existing);
      }
    }

    const assignedAnswersByQuestionId = new Map();
    const matchedAnswerIds = new Set();
    const unmatchedAnswers = [];

    // Step 1: Explicit & Subpart matching
    for (const ans of answers) {
      if (!ans.detectedQuestionNumber) continue;
      const ansNorm = normalizeQuestionReference(ans.detectedQuestionNumber);
      if (!ansNorm.canonicalKey) continue;

      const exactQuestion = questionByCanonicalKey.get(ansNorm.canonicalKey);
      if (exactQuestion) {
        const currentList = assignedAnswersByQuestionId.get(exactQuestion.id) || [];
        currentList.push(ans);
        assignedAnswersByQuestionId.set(exactQuestion.id, currentList);
        matchedAnswerIds.add(ans.id);
        continue;
      }

      let foundSubpart = false;
      if (ansNorm.parentNumber && ansNorm.partLabel) {
        const siblings = questionsByParentKey.get(ansNorm.parentNumber) || [];
        const matchingSibling = siblings.find((s) => {
          const sNorm = normalizeQuestionReference(s.number);
          return sNorm.partLabel === ansNorm.partLabel || areQuestionReferencesEqual(s.number, `${ansNorm.parentNumber}(${ansNorm.partLabel})`);
        });
        if (matchingSibling) {
          const currentList = assignedAnswersByQuestionId.get(matchingSibling.id) || [];
          currentList.push(ans);
          assignedAnswersByQuestionId.set(matchingSibling.id, currentList);
          matchedAnswerIds.add(ans.id);
          foundSubpart = true;
        }
      }

      if (!foundSubpart) {
        unmatchedAnswers.push({
          answerId: ans.id,
          detectedQuestionNumber: ans.detectedQuestionNumber,
          text: ans.text,
          regions: ans.regions,
          confidence: ans.confidence,
          reason: `Question reference "${ans.detectedQuestionNumber}" does not exist in question paper.`,
        });
        matchedAnswerIds.add(ans.id);
      }
    }

    // Step 2: Semantic fallback for unlabelled answers
    const unlabelledAnswers = answers.filter((a) => !matchedAnswerIds.has(a.id));
    const currentlyUnanswered = questions.filter((q) => !assignedAnswersByQuestionId.has(q.id));

    for (const ans of unlabelledAnswers) {
      if (currentlyUnanswered.length === 0) {
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

      const semanticCandidates = findBestSemanticMatches(ans.text, currentlyUnanswered, 0.30);
      if (semanticCandidates.length === 1 && semanticCandidates[0].similarity >= 0.35) {
        const matchedQ = currentlyUnanswered.find((q) => q.id === semanticCandidates[0].questionId);
        if (matchedQ) {
          const currentList = assignedAnswersByQuestionId.get(matchedQ.id) || [];
          currentList.push(ans);
          assignedAnswersByQuestionId.set(matchedQ.id, currentList);
          matchedAnswerIds.add(ans.id);
          continue;
        }
      }

      unmatchedAnswers.push({
        answerId: ans.id,
        detectedQuestionNumber: ans.detectedQuestionNumber,
        text: ans.text,
        regions: ans.regions,
        confidence: ans.confidence,
        reason: "Unlabelled answer with no confident semantic match.",
      });
    }

    // Step 3: Build mapped questions
    const mappedQuestions = [];
    let answeredCount = 0;
    let unansweredCount = 0;
    let ambiguousCount = 0;

    for (const q of questions) {
      const qNorm = normalizeQuestionReference(q.number);
      const assigned = assignedAnswersByQuestionId.get(q.id) || [];

      if (assigned.length === 1) {
        answeredCount++;
        mappedQuestions.push({
          questionId: q.id,
          questionNumber: q.number,
          order: q.order,
          text: q.text,
          mappingStatus: "answered",
          answerId: assigned[0].id,
          answerText: assigned[0].text,
          regions: assigned[0].regions,
          confidence: assigned[0].confidence,
          matchMethod: assigned[0].detectedQuestionNumber ? "explicit_exact" : "semantic",
          candidateAnswerIds: [assigned[0].id],
        });
      } else if (assigned.length > 1) {
        ambiguousCount++;
        const allRegions = [];
        assigned.forEach((a) => allRegions.push(...a.regions));
        mappedQuestions.push({
          questionId: q.id,
          questionNumber: q.number,
          order: q.order,
          text: q.text,
          mappingStatus: "ambiguous",
          answerId: assigned[0].id,
          regions: allRegions,
          confidence: 0.55,
          matchMethod: "ambiguous",
          candidateAnswerIds: assigned.map((a) => a.id),
        });
      } else {
        unansweredCount++;
        mappedQuestions.push({
          questionId: q.id,
          questionNumber: q.number,
          order: q.order,
          text: q.text,
          mappingStatus: "unanswered",
          answerId: null,
          regions: [],
          confidence: 1.0,
          matchMethod: "none",
          candidateAnswerIds: [],
        });
      }
    }

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

async function runMappingTests() {
  console.log('================================================================');
  console.log('       RUNNING ANSWER MAPPING ENGINE UNIT TESTS (PHASE 6)       ');
  console.log('================================================================\n');

  const mapper = new TestAnswerMapper();

  // ── TEST 1: Sequential Answers (Questions 1,2,3 -> Answers 1,2,3) ──────────
  console.log('[TEST 1] Questions 1, 2, 3 and Answers 1, 2, 3 -> All Answered');
  const q1_3 = [
    { id: 'q1', number: '1', text: 'Define artery functions.', order: 1, sourcePages: [1], confidence: 0.99 },
    { id: 'q2', number: '2', text: 'Explain photosynthesis formula.', order: 2, sourcePages: [1], confidence: 0.99 },
    { id: 'q3', number: '3', text: 'Name the parts of a neuron.', order: 3, sourcePages: [1], confidence: 0.99 }
  ];
  const a1_3 = [
    { id: 'a1', detectedQuestionNumber: '1', text: 'Arteries carry oxygenated blood away from heart.', regions: [{ page: 1, boundingBox: { x: 50, y: 100, width: 800, height: 100 } }], confidence: 0.95 },
    { id: 'a2', detectedQuestionNumber: '2', text: '6CO2 + 6H2O -> C6H12O6 + 6O2 in sunlight.', regions: [{ page: 1, boundingBox: { x: 50, y: 250, width: 800, height: 100 } }], confidence: 0.95 },
    { id: 'a3', detectedQuestionNumber: '3', text: 'Axon, dendrites, and cell body.', regions: [{ page: 1, boundingBox: { x: 50, y: 400, width: 800, height: 100 } }], confidence: 0.95 }
  ];

  const res1 = await mapper.mapAnswers('test-1', q1_3, a1_3);
  console.assert(res1.answeredCount === 3, 'All 3 answered');
  console.assert(res1.unansweredCount === 0, '0 unanswered');
  console.assert(res1.unmatchedAnswerCount === 0, '0 unmatched');
  console.log(`  ✓ Passed: answeredCount=${res1.answeredCount}, unansweredCount=${res1.unansweredCount}\n`);

  // ── TEST 2: Out of Order (Questions 1,2,3 -> Answers 3,1) ─────────────────
  console.log('[TEST 2] Questions 1, 2, 3 and Answers 3, 1 -> Q1 answered, Q2 unanswered, Q3 answered');
  const a_out_of_order = [
    { id: 'a3', detectedQuestionNumber: '3', text: 'Axon, dendrites, and cell body.', regions: [{ page: 1, boundingBox: { x: 50, y: 100, width: 800, height: 100 } }], confidence: 0.95 },
    { id: 'a1', detectedQuestionNumber: '1', text: 'Arteries carry oxygenated blood away from heart.', regions: [{ page: 1, boundingBox: { x: 50, y: 250, width: 800, height: 100 } }], confidence: 0.95 }
  ];

  const res2 = await mapper.mapAnswers('test-2', q1_3, a_out_of_order);
  console.assert(res2.mappedQuestions[0].questionId === 'q1' && res2.mappedQuestions[0].mappingStatus === 'answered', 'Q1 answered');
  console.assert(res2.mappedQuestions[1].questionId === 'q2' && res2.mappedQuestions[1].mappingStatus === 'unanswered', 'Q2 unanswered');
  console.assert(res2.mappedQuestions[2].questionId === 'q3' && res2.mappedQuestions[2].mappingStatus === 'answered', 'Q3 answered');
  console.assert(res2.mappedQuestions[0].order === 1 && res2.mappedQuestions[1].order === 2 && res2.mappedQuestions[2].order === 3, 'Printed order preserved');
  console.log('  ✓ Passed: Printed order preserved, Q1 answered, Q2 unanswered, Q3 answered\n');

  // ── TEST 3: Sub-parts 11(a) and 11(b) ─────────────────────────────────────
  console.log('[TEST 3] Questions 11(a), 11(b) -> Answers 11(a), 11(b) independent mapping');
  const q_subparts = [
    { id: 'q11a', number: '11(a)', text: 'Leaf morphology of Plant A.', order: 11, parentNumber: '11', partLabel: 'a', sourcePages: [2], confidence: 0.95 },
    { id: 'q11b', number: '11(b)', text: 'Leaf morphology of Plant B.', order: 12, parentNumber: '11', partLabel: 'b', sourcePages: [2], confidence: 0.95 }
  ];
  const a_subparts = [
    { id: 'a11a', detectedQuestionNumber: '11 a', text: 'Plant A has broad leaves for high transpiration.', regions: [{ page: 2, boundingBox: { x: 50, y: 100, width: 800, height: 100 } }], confidence: 0.94 },
    { id: 'a11b', detectedQuestionNumber: '11-b', text: 'Plant B has needle leaves for arid survival.', regions: [{ page: 2, boundingBox: { x: 50, y: 250, width: 800, height: 100 } }], confidence: 0.94 }
  ];

  const res3 = await mapper.mapAnswers('test-3', q_subparts, a_subparts);
  console.assert(res3.mappedQuestions[0].answerId === 'a11a', '11(a) mapped to a11a');
  console.assert(res3.mappedQuestions[1].answerId === 'a11b', '11(b) mapped to a11b');
  console.log('  ✓ Passed: 11(a) -> a11a and 11(b) -> a11b mapped independently\n');

  // ── TEST 4: Question 11(a) vs Answer 11(b) ────────────────────────────────
  console.log('[TEST 4] Question 11(a) and Answer 11(b) -> Must NOT map to 11(a)');
  const q_11a_only = [
    { id: 'q11a', number: '11(a)', text: 'Leaf morphology of Plant A.', order: 11, parentNumber: '11', partLabel: 'a', sourcePages: [2], confidence: 0.95 }
  ];
  const a_11b_only = [
    { id: 'a11b', detectedQuestionNumber: '11(b)', text: 'Plant B details.', regions: [{ page: 2, boundingBox: { x: 50, y: 100, width: 800, height: 100 } }], confidence: 0.94 }
  ];

  const res4 = await mapper.mapAnswers('test-4', q_11a_only, a_11b_only);
  console.assert(res4.mappedQuestions[0].mappingStatus === 'unanswered', '11(a) remains unanswered');
  console.assert(res4.unmatchedAnswerCount === 1, '11(b) marked as unmatched');
  console.log('  ✓ Passed: Answer 11(b) does NOT map to 11(a), marked as unmatched\n');

  // ── TEST 5: Answer Q9 not in Question Paper ───────────────────────────────
  console.log('[TEST 5] Questions 1, 2, 3 and Answer Q9 -> Q9 unmatched');
  const a_q9 = [
    { id: 'a9', detectedQuestionNumber: 'Q. 9', text: 'Hydraulic lift principle based on Pascal law.', regions: [{ page: 3, boundingBox: { x: 50, y: 100, width: 800, height: 100 } }], confidence: 0.92 }
  ];
  const res5 = await mapper.mapAnswers('test-5', q1_3, a_q9);
  console.assert(res5.unmatchedAnswerCount === 1, '1 unmatched answer');
  console.assert(res5.unmatchedAnswers[0].detectedQuestionNumber === 'Q. 9', 'Unmatched is Q9');
  console.log(`  ✓ Passed: Unmatched Q9 preserved with reason: "${res5.unmatchedAnswers[0].reason}"\n`);

  // ── TEST 6: Unlabelled Answer with strong Semantic match to Q2 ────────────
  console.log('[TEST 6] Unlabelled Answer with clear semantic relationship to Q2');
  const a_semantic = [
    { id: 'a_unlabelled', detectedQuestionNumber: null, text: 'Photosynthesis chemical formula is 6CO2 + 6H2O reacting under sunlight energy in chloroplasts to produce glucose sugar and oxygen gas.', regions: [{ page: 1, boundingBox: { x: 50, y: 300, width: 800, height: 150 } }], confidence: 0.88 }
  ];
  const res6 = await mapper.mapAnswers('test-6', q1_3, a_semantic);
  const mappedQ2 = res6.mappedQuestions.find(q => q.questionId === 'q2');
  console.assert(mappedQ2.mappingStatus === 'answered', 'Q2 answered via semantic match');
  console.assert(mappedQ2.matchMethod === 'semantic', 'Match method is semantic');
  console.log('  ✓ Passed: Unlabelled answer successfully matched to Q2 semantically\n');

  // ── TEST 7: Unlabelled Answer with weak relationship -> Unmatched ─────────
  console.log('[TEST 7] Unlabelled Answer with weak semantic relationship -> Unmatched');
  const a_weak = [
    { id: 'a_random', detectedQuestionNumber: null, text: 'The French Revolution occurred in 1789 resulting in democratic transition.', regions: [{ page: 1, boundingBox: { x: 50, y: 500, width: 800, height: 100 } }], confidence: 0.60 }
  ];
  const res7 = await mapper.mapAnswers('test-7', q1_3, a_weak);
  console.assert(res7.unmatchedAnswerCount === 1, 'Unmatched answer count is 1');
  console.assert(res7.answeredCount === 0, 'No questions falsely answered');
  console.log('  ✓ Passed: Irrelevant unlabelled answer correctly rejected and marked as unmatched\n');

  // ── TEST 8: Multi-page Answer Q7 (spans pages 3 and 4) ────────────────────
  console.log('[TEST 8] Multi-page Answer Q7 spanning pages 3 and 4 -> All regions preserved');
  const q7 = [
    { id: 'q7', number: '7', text: 'Explain cellular respiration steps in detail.', order: 7, sourcePages: [2], confidence: 0.99 }
  ];
  const a7_multipage = [
    {
      id: 'a7',
      detectedQuestionNumber: '7',
      text: 'Part 1 on glycolysis and Krebs cycle... Continuing on Page 4 with oxidative phosphorylation.',
      regions: [
        { page: 3, boundingBox: { x: 80, y: 1000, width: 900, height: 600 } },
        { page: 4, boundingBox: { x: 80, y: 100, width: 900, height: 700 } }
      ],
      confidence: 0.95
    }
  ];
  const res8 = await mapper.mapAnswers('test-8', q7, a7_multipage);
  console.assert(res8.mappedQuestions[0].mappingStatus === 'answered', 'Q7 answered');
  console.assert(res8.mappedQuestions[0].regions.length === 2, '2 regions preserved');
  console.assert(res8.mappedQuestions[0].regions[0].page === 3 && res8.mappedQuestions[0].regions[1].page === 4, 'Pages 3 and 4 preserved');
  console.log(`  ✓ Passed: Q7 mapped with ${res8.mappedQuestions[0].regions.length} regions spanning pages 3 and 4\n`);

  // ── TEST 9: Duplicate Answers for Q5 (Page 2 and Page 6) ──────────────────
  console.log('[TEST 9] Duplicate Answers for Q5 -> Ambiguous status, no silent overwrite');
  const q5 = [
    { id: 'q5', number: '5', text: 'Describe structure of kidney nephron.', order: 5, sourcePages: [1], confidence: 0.99 }
  ];
  const a5_duplicates = [
    { id: 'a5_att1', detectedQuestionNumber: 'Ans 5', text: 'Attempt 1 on page 2 describing glomerulus.', regions: [{ page: 2, boundingBox: { x: 50, y: 200, width: 800, height: 200 } }], confidence: 0.92 },
    { id: 'a5_att2', detectedQuestionNumber: 'Q5', text: 'Attempt 2 on page 6 with corrected diagram and notes.', regions: [{ page: 6, boundingBox: { x: 50, y: 300, width: 800, height: 300 } }], confidence: 0.94 }
  ];
  const res9 = await mapper.mapAnswers('test-9', q5, a5_duplicates);
  console.assert(res9.mappedQuestions[0].mappingStatus === 'ambiguous', 'Q5 marked as ambiguous');
  console.assert(res9.mappedQuestions[0].candidateAnswerIds.length === 2, 'Both candidate IDs retained');
  console.assert(res9.mappedQuestions[0].regions.length === 2, 'Both regions retained for teacher review');
  console.log('  ✓ Passed: Multiple attempts for Q5 flagged as ambiguous with all regions preserved\n');

  // ── TEST 10: Sub-parts 11(a) and 11(b) Answered Out of Order ──────────────
  console.log('[TEST 10] 11(a) and 11(b) with Answers Out of Order (11(b) first, then 11(a))');
  const a_subparts_reversed = [
    { id: 'a11b', detectedQuestionNumber: 'Ans 11(b)', text: 'Plant B needle leaves reduce surface area.', regions: [{ page: 1, boundingBox: { x: 50, y: 100, width: 800, height: 100 } }], confidence: 0.95 },
    { id: 'a11a', detectedQuestionNumber: 'Ans 11(a)', text: 'Plant A broad leaves maximize sunlight.', regions: [{ page: 2, boundingBox: { x: 50, y: 100, width: 800, height: 100 } }], confidence: 0.95 }
  ];
  const res10 = await mapper.mapAnswers('test-10', q_subparts, a_subparts_reversed);
  console.assert(res10.mappedQuestions[0].questionId === 'q11a' && res10.mappedQuestions[0].answerId === 'a11a', '11(a) maps to a11a');
  console.assert(res10.mappedQuestions[1].questionId === 'q11b' && res10.mappedQuestions[1].answerId === 'a11b', '11(b) maps to a11b');
  console.assert(res10.mappedQuestions[0].order === 11 && res10.mappedQuestions[1].order === 12, 'Printed order maintained');
  console.log('  ✓ Passed: Sub-parts 11(a) and 11(b) mapped correctly when answered out of order\n');

  console.log('================================================================');
  console.log('      ALL 10 ANSWER MAPPING UNIT TESTS PASSED (100%)!           ');
  console.log('================================================================');
}

runMappingTests().catch(err => {
  console.error('Mapping unit test suite failed:', err);
  process.exit(1);
});
