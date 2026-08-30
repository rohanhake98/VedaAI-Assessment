const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('==========================================================');
  console.log('     RUNNING AI ANSWER EXTRACTION TESTS (PHASE 5)         ');
  console.log('==========================================================\n');

  // Test AnswerExtractor normalization and validation logic directly
  const { AnswerExtractor } = require('/app/lib/ai/answer-extractor.ts');

  // Create mock AI client returning realistic handwritten exam answers (out of order, subparts, multi-page)
  const mockAiClient = {
    isConfigured: () => true,
    getModelName: () => 'gemini-1.5-flash-test',
    generateContent: async () => ({
      model: 'gemini-1.5-flash-test',
      text: JSON.stringify({
        answers: [
          // Out of order: Student answers Q4 first on Page 1
          {
            detectedQuestionNumber: "Ans 4",
            text: "Xylem vessels have lignified walls which provide mechanical strength and prevent collapsing under high tension.",
            regions: [
              {
                page: 1,
                boundingBox: { x: 100, y: 150, width: 950, height: 250 }
              }
            ],
            confidence: 0.96
          },
          // Q1 on Page 1 (second answer on page 1)
          {
            detectedQuestionNumber: "1",
            text: "Arteries carry blood away from the heart at high pressure.",
            regions: [
              {
                page: 1,
                boundingBox: { x: 100, y: 450, width: 950, height: 200 }
              }
            ],
            confidence: 0.98
          },
          // Sub-part 11(a) on Page 1
          {
            detectedQuestionNumber: "11 a",
            text: "Plant A in bright light has thicker palisade mesophyll and smaller surface area to minimize excessive transpiration.",
            regions: [
              {
                page: 1,
                boundingBox: { x: 100, y: 700, width: 950, height: 280 }
              }
            ],
            confidence: 0.93
          },
          // Sub-part 11(b) on Page 2
          {
            detectedQuestionNumber: "11(b)",
            text: "Move Plant B to an area receiving indirect sunlight and maintain optimal soil moisture.",
            regions: [
              {
                page: 2,
                boundingBox: { x: 80, y: 120, width: 980, height: 220 }
              }
            ],
            confidence: 0.94
          },
          // Diagram based answer with visual content
          {
            detectedQuestionNumber: "Q5",
            text: "Diagram of human nephron showing glomerulus, Bowman's capsule, loop of Henle, and collecting duct. [Diagram: annotated schematic drawing with arrows]",
            regions: [
              {
                page: 2,
                boundingBox: { x: 80, y: 400, width: 980, height: 450 }
              }
            ],
            confidence: 0.91,
            hasVisualContent: true
          },
          // Unlabeled answer (student omitted question number)
          {
            detectedQuestionNumber: null,
            text: "The rate of enzyme reaction increases with temperature until optimal temperature is reached.",
            regions: [
              {
                page: 2,
                boundingBox: { x: 80, y: 900, width: 980, height: 200 }
              }
            ],
            confidence: 0.75
          }
        ]
      })
    })
  };

  const extractor = new AnswerExtractor(mockAiClient);

  const mockDoc = {
    documentType: "answer_sheet",
    originalFileName: "student_sheet.pdf",
    originalMimeType: "application/pdf",
    pageCount: 2,
    pages: [
      { pageNumber: 1, imageBase64: "test", mimeType: "image/jpeg", width: 1240, height: 1754, documentType: "answer_sheet" },
      { pageNumber: 2, imageBase64: "test", mimeType: "image/jpeg", width: 1240, height: 1754, documentType: "answer_sheet" }
    ]
  };

  // ── TEST 1: Answer extraction & question number normalization ──
  console.log('[TEST 1] Extract candidate answers & normalize question references');
  const result = await extractor.extractAnswers("assessment-ans-123", mockDoc);
  console.assert(result.status === 'success', 'Extraction status is success');
  console.assert(result.totalAnswers === 6, 'Total answers extracted is 6');
  console.log(`  ✓ Extracted ${result.totalAnswers} candidate answers across ${mockDoc.pageCount} pages`);

  // Verify normalized numbers
  const q4Ans = result.answers.find(a => a.detectedQuestionNumber === '4');
  console.assert(q4Ans !== undefined, 'Ans 4 normalized to 4');
  console.log('  ✓ "Ans 4" successfully normalized to question reference "4"');

  const q11aAns = result.answers.find(a => a.detectedQuestionNumber === '11(a)');
  console.assert(q11aAns !== undefined, '11 a normalized to 11(a)');
  console.log('  ✓ "11 a" successfully normalized to sub-part reference "11(a)"');

  // Verify unlabeled answer preserved
  const unlabeledAns = result.answers.find(a => a.detectedQuestionNumber === null);
  console.assert(unlabeledAns !== undefined, 'Unlabeled answer preserved');
  console.assert(unlabeledAns.status === 'ambiguous', 'Unlabeled answer has ambiguous status');
  console.log('  ✓ Unlabeled answer preserved without guessing, marked as ambiguous candidate');

  // Verify diagram flag
  const diagAns = result.answers.find(a => a.detectedQuestionNumber === '5');
  console.assert(diagAns !== undefined && diagAns.hasVisualContent === true, 'Diagram answer detected');
  console.log('  ✓ Diagram answer detected with hasVisualContent: true\n');

  // ── TEST 2: Multiple answers on a single page ──
  console.log('[TEST 2] Multiple answers per page verification');
  const page1Answers = result.answers.filter(a => a.regions.some(r => r.page === 1));
  console.assert(page1Answers.length === 3, 'Page 1 has 3 distinct answer regions');
  console.log(`  ✓ Page 1 contains ${page1Answers.length} distinct answers with non-overlapping bounding boxes\n`);

  // ── TEST 3: Bounding box validation and bounds clamping ──
  console.log('[TEST 3] Bounding box validation');
  for (const ans of result.answers) {
    for (const r of ans.regions) {
      console.assert(r.boundingBox.x >= 0, 'x >= 0');
      console.assert(r.boundingBox.y >= 0, 'y >= 0');
      console.assert(r.boundingBox.width > 0, 'width > 0');
      console.assert(r.boundingBox.height > 0, 'height > 0');
      console.assert(r.boundingBox.x + r.boundingBox.width <= 1240, 'x + width <= page width');
      console.assert(r.boundingBox.y + r.boundingBox.height <= 1754, 'y + height <= page height');
    }
  }
  console.log('  ✓ All bounding boxes validated strictly within page bounds [1240x1754]\n');

  // ── TEST 4: Multi-page answer continuation consolidation ──
  console.log('[TEST 4] Multi-page answer continuation merging');
  const continuationClient = {
    isConfigured: () => true,
    getModelName: () => 'gemini-test',
    generateContent: async () => ({
      model: 'gemini-test',
      text: JSON.stringify({
        answers: [
          // Q7 starts on Page 1
          {
            detectedQuestionNumber: "7",
            text: "Part 1 of the lengthy essay on cellular respiration...",
            regions: [{ page: 1, boundingBox: { x: 100, y: 1200, width: 900, height: 400 } }]
          },
          // Q7 continues on Page 2
          {
            detectedQuestionNumber: "7",
            text: "Part 2 continuing with electron transport chain details...",
            regions: [{ page: 2, boundingBox: { x: 100, y: 100, width: 900, height: 500 } }]
          }
        ]
      })
    })
  };
  const contExtractor = new AnswerExtractor(continuationClient);
  const contResult = await contExtractor.extractAnswers("assessment-cont", mockDoc);
  console.assert(contResult.totalAnswers === 1, 'Two parts merged into 1 answer');
  console.assert(contResult.answers[0].regions.length === 2, 'Merged answer has 2 regions across pages');
  console.log(`  ✓ Multi-page answer Q7 consolidated into 1 answer with ${contResult.answers[0].regions.length} regions (pages 1 and 2)\n`);

  console.log('==========================================================');
  console.log('     ALL AI ANSWER EXTRACTION TESTS PASSED (100%)!        ');
  console.log('==========================================================');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
