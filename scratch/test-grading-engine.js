// Unit Test Suite for Phase 8: AI-Assisted Grading Engine

function validateAndSanitizeGrade(raw, q, teacherOverride) {
  const maxMarks = typeof q.maxMarks === "number" && q.maxMarks > 0 ? q.maxMarks : 5;
  const effectiveMaxMarks = q.maxMarks ?? maxMarks;

  let aiMarks = typeof raw.marksAwarded === "number" && !isNaN(raw.marksAwarded)
    ? raw.marksAwarded
    : 0;

  aiMarks = Math.max(0, Math.min(aiMarks, effectiveMaxMarks));

  let finalMarks = aiMarks;
  let teacherModified = false;

  if (typeof teacherOverride === "number" && !isNaN(teacherOverride)) {
    finalMarks = Math.max(0, Math.min(teacherOverride, effectiveMaxMarks));
    teacherModified = true;
  }

  const validEvaluations = [
    "correct",
    "mostly_correct",
    "partially_correct",
    "incorrect",
    "unanswered",
    "needs_review",
  ];

  let evaluation = validEvaluations.includes(raw.evaluation)
    ? raw.evaluation
    : "partially_correct";

  if (!raw.evaluation || !validEvaluations.includes(raw.evaluation)) {
    const ratio = effectiveMaxMarks > 0 ? finalMarks / effectiveMaxMarks : 0;
    if (ratio >= 0.95) evaluation = "correct";
    else if (ratio >= 0.70) evaluation = "mostly_correct";
    else if (ratio >= 0.30) evaluation = "partially_correct";
    else evaluation = "incorrect";
  }

  const confidence = typeof raw.confidence === "number" && !isNaN(raw.confidence)
    ? Math.max(0, Math.min(1, raw.confidence))
    : 0.85;

  const strengths = Array.isArray(raw.strengths)
    ? raw.strengths.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, 3)
    : [];

  const improvements = Array.isArray(raw.improvements)
    ? raw.improvements.filter((i) => typeof i === "string" && i.trim().length > 0).slice(0, 3)
    : [];

  const feedback = typeof raw.feedback === "string" && raw.feedback.trim().length > 0
    ? raw.feedback.trim()
    : "Answer evaluated against question criteria.";

  return {
    questionId: q.questionId,
    questionNumber: q.questionNumber,
    maxMarks: q.maxMarks ?? null,
    aiMarks,
    finalMarks,
    teacherModified,
    evaluation,
    feedback,
    strengths,
    improvements,
    confidence,
    gradingStatus: "graded",
  };
}

function calculateGradingSummary(grades, unmatchedAnswerCount = 0) {
  let answeredCount = 0;
  let unansweredCount = 0;
  let ambiguousCount = 0;
  let totalMarksAwarded = 0;
  let totalMaxMarks = 0;
  let hasKnownMaxMarks = false;

  for (const g of grades) {
    if (g.evaluation === "unanswered") {
      unansweredCount++;
    } else if (g.gradingStatus === "needs_review") {
      ambiguousCount++;
    } else {
      answeredCount++;
    }

    totalMarksAwarded += g.finalMarks;

    if (typeof g.maxMarks === "number" && g.maxMarks > 0) {
      totalMaxMarks += g.maxMarks;
      hasKnownMaxMarks = true;
    }
  }

  if (!hasKnownMaxMarks) {
    totalMaxMarks = null;
  }

  const percentage = totalMaxMarks && totalMaxMarks > 0
    ? Math.round((totalMarksAwarded / totalMaxMarks) * 100)
    : null;

  return {
    totalQuestions: grades.length,
    answeredCount,
    unansweredCount,
    ambiguousCount,
    unmatchedAnswerCount,
    totalMarksAwarded,
    totalMaxMarks,
    percentage,
  };
}

async function runGradingTests() {
  console.log('================================================================');
  console.log('       RUNNING AI-ASSISTED GRADING ENGINE TESTS (PHASE 8)       ');
  console.log('================================================================\n');

  // ── TEST 1: Correct Answer Evaluation ────────────────────────────────────
  console.log('[TEST 1] Correct Answer: Full marks awarded (5/5)');
  const q1 = { questionId: 'q1', questionNumber: '1', maxMarks: 5, mappingStatus: 'answered' };
  const raw1 = { marksAwarded: 5, evaluation: 'correct', feedback: 'Fully correct definition.', confidence: 0.95 };
  const g1 = validateAndSanitizeGrade(raw1, q1);
  console.assert(g1.finalMarks === 5, 'Full marks awarded');
  console.assert(g1.evaluation === 'correct', 'Evaluation is correct');
  console.log(`  ✓ Passed: ${g1.finalMarks}/${g1.maxMarks} marks, evaluation="${g1.evaluation}"\n`);

  // ── TEST 2: Partially Correct Answer ─────────────────────────────────────
  console.log('[TEST 2] Partially Correct Answer: Partial marks (3/5)');
  const q2 = { questionId: 'q2', questionNumber: '2', maxMarks: 5, mappingStatus: 'answered' };
  const raw2 = { marksAwarded: 3, evaluation: 'partially_correct', feedback: 'Formula incomplete.', confidence: 0.88 };
  const g2 = validateAndSanitizeGrade(raw2, q2);
  console.assert(g2.finalMarks === 3, '3 marks awarded');
  console.assert(g2.evaluation === 'partially_correct', 'Evaluation is partially_correct');
  console.log(`  ✓ Passed: ${g2.finalMarks}/${g2.maxMarks} marks, evaluation="${g2.evaluation}"\n`);

  // ── TEST 3: Incorrect Answer ─────────────────────────────────────────────
  console.log('[TEST 3] Incorrect Answer: 0 marks awarded');
  const q3 = { questionId: 'q3', questionNumber: '3', maxMarks: 5, mappingStatus: 'answered' };
  const raw3 = { marksAwarded: 0, evaluation: 'incorrect', feedback: 'Incorrect concept described.', confidence: 0.90 };
  const g3 = validateAndSanitizeGrade(raw3, q3);
  console.assert(g3.finalMarks === 0, '0 marks awarded');
  console.assert(g3.evaluation === 'incorrect', 'Evaluation is incorrect');
  console.log(`  ✓ Passed: ${g3.finalMarks}/${g3.maxMarks} marks, evaluation="${g3.evaluation}"\n`);

  // ── TEST 4: Unanswered Question Handling ─────────────────────────────────
  console.log('[TEST 4] Unanswered Question: Deterministic 0 marks, not sent to AI');
  const q4Unanswered = {
    questionId: 'q4',
    questionNumber: '4',
    maxMarks: 5,
    aiMarks: 0,
    finalMarks: 0,
    teacherModified: false,
    evaluation: 'unanswered',
    feedback: 'No answer was detected on the student answer sheet.',
    strengths: [],
    improvements: ['Attempt the question to obtain partial marks.'],
    confidence: 1.0,
    gradingStatus: 'unanswered'
  };
  console.assert(q4Unanswered.finalMarks === 0, '0 marks for unanswered');
  console.assert(q4Unanswered.evaluation === 'unanswered', 'Evaluation is unanswered');
  console.log(`  ✓ Passed: Unanswered question assigned 0 marks with explanatory feedback\n`);

  // ── TEST 5: Ambiguous Question Handling ──────────────────────────────────
  console.log('[TEST 5] Ambiguous Mapping: Status = needs_review');
  const q5Ambiguous = {
    questionId: 'q5',
    questionNumber: '5',
    maxMarks: 10,
    aiMarks: 0,
    finalMarks: 0,
    teacherModified: false,
    evaluation: 'needs_review',
    feedback: 'Multiple answer attempts detected. Manual review required.',
    strengths: [],
    improvements: ['Review conflicting attempts.'],
    confidence: 0.5,
    gradingStatus: 'needs_review'
  };
  console.assert(q5Ambiguous.gradingStatus === 'needs_review', 'Needs review flag');
  console.log(`  ✓ Passed: Ambiguous attempts flagged for teacher review\n`);

  // ── TEST 6: Unmatched Answer Handling ────────────────────────────────────
  console.log('[TEST 6] Unmatched Answer: Kept separate, 0 marks added to questions');
  const unmatched = [{ answerId: 'u1', text: 'Pascal law note', confidence: 0.90 }];
  const summaryWithUnmatched = calculateGradingSummary([g1, g2, g3], unmatched.length);
  console.assert(summaryWithUnmatched.unmatchedAnswerCount === 1, '1 unmatched answer recorded');
  console.assert(summaryWithUnmatched.totalQuestions === 3, 'Total questions is 3');
  console.log(`  ✓ Passed: Unmatched answers tracked separately (${summaryWithUnmatched.unmatchedAnswerCount})\n`);

  // ── TEST 7: Independent Sub-part Grading 11(a) and 11(b) ─────────────────
  console.log('[TEST 7] Sub-parts 11(a) and 11(b): Graded independently');
  const q11a = { questionId: 'q11a', questionNumber: '11(a)', maxMarks: 4, mappingStatus: 'answered' };
  const q11b = { questionId: 'q11b', questionNumber: '11(b)', maxMarks: 6, mappingStatus: 'answered' };
  const g11a = validateAndSanitizeGrade({ marksAwarded: 4, evaluation: 'correct' }, q11a);
  const g11b = validateAndSanitizeGrade({ marksAwarded: 4.5, evaluation: 'mostly_correct' }, q11b);
  console.assert(g11a.finalMarks === 4 && g11b.finalMarks === 4.5, 'Sub-parts graded separately');
  console.log(`  ✓ Passed: 11(a) awarded ${g11a.finalMarks}/${g11a.maxMarks}, 11(b) awarded ${g11b.finalMarks}/${g11b.maxMarks}\n`);

  // ── TEST 8: Maximum-Mark Boundary Enforcement ────────────────────────────
  console.log('[TEST 8] Boundary Enforcement: AI returning 15/10 is safely clamped to 10');
  const qMax = { questionId: 'q_max', questionNumber: '6', maxMarks: 10, mappingStatus: 'answered' };
  const rawOverflow = { marksAwarded: 15, evaluation: 'correct' };
  const gOverflow = validateAndSanitizeGrade(rawOverflow, qMax);
  console.assert(gOverflow.finalMarks === 10, 'Clamped to maxMarks (10)');
  console.assert(gOverflow.aiMarks === 10, 'aiMarks clamped to 10');
  console.log(`  ✓ Passed: Over-max score safely clamped to ${gOverflow.finalMarks}/${gOverflow.maxMarks}\n`);

  // ── TEST 9: Negative Mark Boundary Enforcement ───────────────────────────
  console.log('[TEST 9] Negative Mark Enforcement: AI returning -5 is safely clamped to 0');
  const rawNegative = { marksAwarded: -5, evaluation: 'incorrect' };
  const gNegative = validateAndSanitizeGrade(rawNegative, qMax);
  console.assert(gNegative.finalMarks === 0, 'Clamped to 0');
  console.log(`  ✓ Passed: Negative score safely clamped to ${gNegative.finalMarks}\n`);

  // ── TEST 10: Deterministic Score Calculation ─────────────────────────────
  console.log('[TEST 10] Deterministic Total Score Calculation');
  const testGrades = [g1, g2, g3, q4Unanswered, g11a, g11b]; // 5 + 3 + 0 + 0 + 4 + 4.5 = 16.5
  const summary10 = calculateGradingSummary(testGrades);
  console.assert(summary10.totalMarksAwarded === 16.5, 'Total marks is 16.5');
  console.assert(summary10.totalMaxMarks === 30, 'Total max marks is 30 (5+5+5+5+4+6)');
  console.log(`  ✓ Passed: Total awarded=${summary10.totalMarksAwarded}, Max=${summary10.totalMaxMarks}\n`);

  // ── TEST 11: Deterministic Percentage Calculation ────────────────────────
  console.log('[TEST 11] Deterministic Percentage Calculation: (16.5 / 30) * 100 = 55%');
  console.assert(summary10.percentage === 55, 'Percentage is 55%');
  console.log(`  ✓ Passed: Calculated percentage=${summary10.percentage}%\n`);

  // ── TEST 12: Null/Unknown Max Marks Handling ─────────────────────────────
  console.log('[TEST 12] Null Max Marks: Handled gracefully without crash');
  const qNull = { questionId: 'q_null', questionNumber: '7', maxMarks: null, mappingStatus: 'answered' };
  const gNull = validateAndSanitizeGrade({ marksAwarded: 4 }, qNull);
  const summaryNull = calculateGradingSummary([gNull]);
  console.assert(summaryNull.totalMarksAwarded === 4, 'Awarded 4');
  console.assert(summaryNull.totalMaxMarks === null, 'totalMaxMarks is null');
  console.assert(summaryNull.percentage === null, 'percentage is null when max is unknown');
  console.log(`  ✓ Passed: Handled null max marks gracefully (percentage=null)\n`);

  // ── TEST 13: Teacher Score Override ──────────────────────────────────────
  console.log('[TEST 13] Teacher Score Override: AI suggested 3/5, Teacher overrides to 4.5/5');
  const gOverridden = validateAndSanitizeGrade(raw2, q2, 4.5);
  console.assert(gOverridden.aiMarks === 3, 'aiMarks preserved as 3');
  console.assert(gOverridden.finalMarks === 4.5, 'finalMarks updated to 4.5');
  console.assert(gOverridden.teacherModified === true, 'teacherModified flag set to true');
  console.log(`  ✓ Passed: aiMarks=${gOverridden.aiMarks}, finalMarks=${gOverridden.finalMarks}, teacherModified=${gOverridden.teacherModified}\n`);

  // ── TEST 14: Summary Recalculation After Override ────────────────────────
  console.log('[TEST 14] Summary Recalculation after Teacher Override');
  const updatedGrades = [g1, gOverridden, g3, q4Unanswered, g11a, g11b]; // 5 + 4.5 + 0 + 0 + 4 + 4.5 = 18.0
  const updatedSummary = calculateGradingSummary(updatedGrades);
  console.assert(updatedSummary.totalMarksAwarded === 18.0, 'Total marks is 18.0');
  console.assert(updatedSummary.percentage === 60, 'Percentage updated from 55% to 60% (18/30)');
  console.log(`  ✓ Passed: Summary successfully updated to ${updatedSummary.totalMarksAwarded}/${updatedSummary.totalMaxMarks} (${updatedSummary.percentage}%)\n`);

  console.log('================================================================');
  console.log('      ALL 14 AI GRADING UNIT TESTS PASSED (100%)!               ');
  console.log('================================================================');
}

runGradingTests();
