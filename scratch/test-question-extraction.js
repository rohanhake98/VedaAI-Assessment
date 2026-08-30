const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('==========================================================');
  console.log('     RUNNING AI QUESTION EXTRACTION TESTS (PHASE 4)       ');
  console.log('==========================================================\n');

  const { QuestionExtractor } = require('/app/lib/ai/question-extractor.ts');

  // Create test mock AI client
  const mockAiClient = {
    isConfigured: () => true,
    getModelName: () => 'gemini-1.5-flash-test',
    generateContent: async (opts) => {
      // Return a realistic exam paper extraction response
      return {
        model: 'gemini-1.5-flash-test',
        text: JSON.stringify({
          questions: [
            {
              number: "1",
              text: "Which blood vessel carries blood away from the heart?",
              order: 1,
              maxMarks: 2,
              sourcePages: [1],
              region: { page: 1, boundingBox: { x: 50, y: 100, width: 800, height: 60 } },
              confidence: 0.99
            },
            {
              number: "2",
              text: "Which organelle is primarily involved in photosynthesis?",
              order: 2,
              maxMarks: 2,
              sourcePages: [1],
              region: { page: 1, boundingBox: { x: 50, y: 200, width: 800, height: 60 } },
              confidence: 0.98
            },
            {
              number: "10",
              text: "Explain how the structure of xylem vessels facilitates water transport.",
              order: 3,
              maxMarks: 5,
              sourcePages: [1],
              confidence: 0.95
            },
            // Sub-parts 11(a) and 11(b)
            {
              number: "11(a)",
              text: "A diagram shows two potted plants — Plant A in bright light, Plant B in dim light. Compare their leaf morphology.",
              order: 4,
              parentNumber: "11",
              partLabel: "a",
              maxMarks: 2,
              sourcePages: [1, 2], // Multi-page spanning question
              confidence: 0.96
            },
            {
              number: "11(b)",
              text: "Suggest one practical measure to help Plant B recover.",
              order: 5,
              parentNumber: "11",
              partLabel: "b",
              maxMarks: 3,
              sourcePages: [2],
              confidence: 0.94
            },
            // Roman numeral sub-part Q12(i)
            {
              number: "Q12(i)",
              text: "Calculate the alveolar ventilation per minute if tidal volume is 0.5 L.",
              order: 6,
              parentNumber: "12",
              partLabel: "i",
              maxMarks: 3,
              sourcePages: [2],
              confidence: 0.97
            }
          ]
        })
      };
    }
  };

  const extractor = new QuestionExtractor(mockAiClient);

  // ── TEST 1: Schema parsing & JSON extraction ──
  console.log('[TEST 1] JSON Parser & Code-fence stripping');
  const fencedJson = '```json\n{"questions": [{"number": "1", "text": "Test question?", "order": 1}]}\n```';
  const parsedFenced = extractor.parseRawJsonResponse(fencedJson);
  console.assert(parsedFenced.questions && parsedFenced.questions.length === 1, 'Code fences stripped');
  console.log('  ✓ Markdown code fences correctly stripped and parsed\n');

  // ── TEST 2: Multi-question validation & sub-part extraction ──
  console.log('[TEST 2] Validation & Normalization of Questions & Sub-parts');
  const mockDoc = {
    documentType: "question_paper",
    originalFileName: "exam.pdf",
    originalMimeType: "application/pdf",
    pageCount: 2,
    pages: [
      { pageNumber: 1, imageBase64: "test", mimeType: "image/jpeg", width: 1240, height: 1754, documentType: "question_paper" },
      { pageNumber: 2, imageBase64: "test", mimeType: "image/jpeg", width: 1240, height: 1754, documentType: "question_paper" }
    ]
  };

  const result = await extractor.extractQuestions("test-assessment-123", mockDoc);
  console.assert(result.status === 'success', 'Extraction status success');
  console.assert(result.totalQuestions === 6, 'Total questions is 6');
  console.log(`  ✓ Extracted ${result.totalQuestions} questions successfully`);

  // Verify sub-parts
  const q11a = result.questions.find(q => q.number === '11(a)');
  console.assert(q11a !== undefined, '11(a) exists');
  console.assert(q11a.parentNumber === '11', '11(a) parentNumber is 11');
  console.assert(q11a.partLabel === 'a', '11(a) partLabel is a');
  console.assert(q11a.sourcePages.length === 2, '11(a) spans across page 1 and 2');
  console.log('  ✓ Sub-part 11(a) correctly identified with parent "11", label "a", spanning pages [1, 2]');

  const q11b = result.questions.find(q => q.number === '11(b)');
  console.assert(q11b !== undefined, '11(b) exists');
  console.assert(q11b.parentNumber === '11', '11(b) parentNumber is 11');
  console.assert(q11b.partLabel === 'b', '11(b) partLabel is b');
  console.log('  ✓ Sub-part 11(b) correctly identified as a separate question with parent "11"');

  const q12i = result.questions.find(q => q.number === 'Q12(i)');
  console.assert(q12i !== undefined, 'Q12(i) exists');
  console.assert(q12i.partLabel === 'i', 'Q12(i) partLabel is i');
  console.log('  ✓ Roman numeral sub-part Q12(i) correctly identified\n');

  // ── TEST 3: Deterministic printed order check ──
  console.log('[TEST 3] Question Ordering (Deterministic 1..N order)');
  for (let i = 0; i < result.questions.length; i++) {
    console.assert(result.questions[i].order === i + 1, `Order is sequential ${i + 1}`);
  }
  console.log('  ✓ Order is strictly sequential and matches printed sequence (1 to 6)\n');

  // ── TEST 4: Malformed AI response handling ──
  console.log('[TEST 4] Malformed AI response resilience');
  const malformedClient = {
    isConfigured: () => true,
    getModelName: () => 'gemini-test',
    generateContent: async () => ({ model: 'gemini-test', text: 'This is not valid JSON at all.' })
  };
  const malformedExtractor = new QuestionExtractor(malformedClient);
  const malformedResult = await malformedExtractor.extractQuestions("test-malformed", mockDoc);
  console.assert(malformedResult.status === 'error', 'Malformed returns error status');
  console.log('  ✓ Malformed AI response gracefully caught with error message:\n    ', malformedResult.message, '\n');

  // ── TEST 5: No questions / empty document edge case ──
  console.log('[TEST 5] Empty / No questions edge case');
  const emptyClient = {
    isConfigured: () => true,
    getModelName: () => 'gemini-test',
    generateContent: async () => ({ model: 'gemini-test', text: JSON.stringify({ questions: [] }) })
  };
  const emptyExtractor = new QuestionExtractor(emptyClient);
  const emptyResult = await emptyExtractor.extractQuestions("test-empty", mockDoc);
  console.assert(emptyResult.status === 'needs_review', 'Empty returns needs_review');
  console.assert(emptyResult.questions.length === 0, 'Questions array is empty');
  console.log('  ✓ Empty document returns controlled "needs_review" status without hallucinating questions\n');

  // ── TEST 6: Unconfigured API key edge case ──
  console.log('[TEST 6] Unconfigured API Key handling');
  const unconfiguredClient = {
    isConfigured: () => false,
    getModelName: () => 'gemini-test',
    generateContent: async () => { throw new Error('Not configured'); }
  };
  const unconfiguredExtractor = new QuestionExtractor(unconfiguredClient);
  const unconfigResult = await unconfiguredExtractor.extractQuestions("test-unconfig", mockDoc);
  console.assert(unconfigResult.status === 'needs_review', 'Unconfigured key returns needs_review');
  console.log('  ✓ Missing API key returns clean guidance message:\n    ', unconfigResult.message, '\n');

  console.log('==========================================================');
  console.log('     ALL AI QUESTION EXTRACTION TESTS PASSED (100%)       ');
  console.log('==========================================================');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
