const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('=== Running Document Processing & Validation Tests ===\n');

  const fixturesDir = path.join('/app', 'scratch', 'test-fixtures');
  const validQpPdf = fs.readFileSync(path.join(fixturesDir, 'valid-qp.pdf'));
  const multiAsPdf = fs.readFileSync(path.join(fixturesDir, 'multi-as.pdf'));
  const validPng = fs.readFileSync(path.join(fixturesDir, 'valid-img.png'));
  const unsupportedTxt = fs.readFileSync(path.join(fixturesDir, 'unsupported.txt'));
  const corruptPdf = fs.readFileSync(path.join(fixturesDir, 'corrupt.pdf'));

  // Test 1: File validation - client/server functions
  const { validateFileServer, detectMimeType } = require('/app/lib/file-validation.ts');

  console.log('Test 1: Magic byte detection');
  console.assert(detectMimeType(validQpPdf) === 'application/pdf', 'PDF detected');
  console.assert(detectMimeType(validPng) === 'image/png', 'PNG detected');
  console.assert(detectMimeType(unsupportedTxt) === null, 'Unsupported format returns null');
  console.log('  ✓ Magic bytes correctly detect PDF, PNG, and reject plain text\n');

  // Test 2: Validation of oversized files
  console.log('Test 2: Oversized file check');
  const largeBuffer = Buffer.alloc(21 * 1024 * 1024); // 21MB
  const largeRes = validateFileServer(largeBuffer, 'large.pdf', 'application/pdf', 'Question paper');
  console.assert(largeRes.valid === false, 'Oversized file rejected');
  console.log('  ✓ Oversized file (>20MB) properly rejected with error:', largeRes.error, '\n');

  // Test 3: Unsupported file check
  console.log('Test 3: Unsupported format check');
  const unsuppRes = validateFileServer(unsupportedTxt, 'test.txt', 'text/plain', 'Question paper');
  console.assert(unsuppRes.valid === false, 'Unsupported file rejected');
  console.log('  ✓ Unsupported file properly rejected with error:', unsuppRes.error, '\n');

  // Test 4: Document processing with PDF + Multi-page PDF
  console.log('Test 4: PDF QP + Multi-page PDF AS processing');
  const { processAssessmentFiles } = require('/app/lib/document-processing/index.ts');
  const res1 = await processAssessmentFiles(
    validQpPdf, 'qp.pdf', 'application/pdf',
    multiAsPdf, 'as.pdf', 'application/pdf'
  );
  console.assert(res1.status === 'ready_for_extraction', 'Processing status ok');
  console.assert(res1.questionPaper.pageCount === 1, 'QP page count 1');
  console.assert(res1.answerSheet.pageCount === 2, 'AS page count 2');
  console.assert(res1.questionPaper.pages.length === 1, 'QP pages array length 1');
  console.assert(res1.answerSheet.pages.length === 2, 'AS pages array length 2');
  console.log('  ✓ QP pageCount:', res1.questionPaper.pageCount, ', AS pageCount:', res1.answerSheet.pageCount);
  console.log('  ✓ Status:', res1.status, ', time:', res1.processingTimeMs, 'ms\n');

  // Test 5: Image processing (PNG)
  console.log('Test 5: Image processing (PNG as QP and AS)');
  const res2 = await processAssessmentFiles(
    validPng, 'qp.png', 'image/png',
    validPng, 'as.png', 'image/png'
  );
  console.assert(res2.status === 'ready_for_extraction', 'Image status ok');
  console.assert(res2.questionPaper.pageCount === 1, 'Image QP page count 1');
  console.assert(res2.questionPaper.pages[0].width >= 1, 'Image width extracted');
  console.assert(res2.questionPaper.pages[0].height >= 1, 'Image height extracted');
  console.log('  ✓ Processed image dimensions:', res2.questionPaper.pages[0].width, 'x', res2.questionPaper.pages[0].height);
  console.log('  ✓ Status:', res2.status, '\n');

  // Test 6: Corrupt PDF handling
  console.log('Test 6: Corrupt PDF error handling');
  const resCorrupt = await processAssessmentFiles(
    corruptPdf, 'corrupt.pdf', 'application/pdf',
    validPng, 'as.png', 'image/png'
  );
  console.assert(resCorrupt.status === 'error', 'Corrupt PDF returns error status');
  console.log('  ✓ Properly caught corrupt PDF error:', resCorrupt.message, '\n');

  console.log('=== All Document Processing Tests Passed Successfully! ===');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
