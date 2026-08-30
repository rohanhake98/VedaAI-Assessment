#!/usr/bin/env bash
set -e

FIXTURES="/app/scratch/test-fixtures"
UPLOAD_EP="http://localhost:3000/api/assessment/upload"
EXTRACT_EP="http://localhost:3000/api/assessment/extract-questions"

echo "=========================================================="
echo "      RUNNING E2E INTEGRATION TESTS (PHASE 4)             "
echo "=========================================================="

echo -e "\n[TEST 1] Extract Questions: Missing assessmentId body"
HTTP_CODE=$(curl -s -o /app/scratch/p4_res1.json -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{}' $EXTRACT_EP)
cat /app/scratch/p4_res1.json
echo -e "\nHTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" -eq 400 ]; then echo "✓ PASS"; else echo "✗ FAIL"; exit 1; fi

echo -e "\n[TEST 2] Extract Questions: Non-existent assessmentId"
HTTP_CODE=$(curl -s -o /app/scratch/p4_res2.json -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"assessmentId": "non-existent-id-999"}' $EXTRACT_EP)
cat /app/scratch/p4_res2.json
echo -e "\nHTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" -eq 404 ]; then echo "✓ PASS"; else echo "✗ FAIL"; exit 1; fi

echo -e "\n[TEST 3] Step 1: Upload Question Paper & Answer Sheet"
HTTP_CODE=$(curl -s -o /app/scratch/p4_upload.json -w "%{http_code}" -F "questionPaper=@$FIXTURES/valid-qp.pdf" -F "answerSheet=@$FIXTURES/multi-as.pdf" $UPLOAD_EP)
cat /app/scratch/p4_upload.json
echo -e "\nUpload HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" -eq 200 ]; then echo "✓ PASS"; else echo "✗ FAIL"; exit 1; fi

ASSESSMENT_ID=$(node -e "const d = JSON.parse(fs.readFileSync('/app/scratch/p4_upload.json')); console.log(d.assessmentId);" 2>/dev/null)
echo "Obtained Assessment ID: $ASSESSMENT_ID"

echo -e "\n[TEST 4] Step 2: Extract Questions for Assessment $ASSESSMENT_ID"
HTTP_CODE=$(curl -s -o /app/scratch/p4_extract.json -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"assessmentId\": \"$ASSESSMENT_ID\"}" $EXTRACT_EP)
cat /app/scratch/p4_extract.json
echo -e "\nExtract HTTP Status: $HTTP_CODE"

# Either 200 (if API key set or success) or controlled needs_review response with 200/422
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 422 ]; then
  echo "✓ PASS: Controlled response received from AI extraction engine"
else
  echo "✗ FAIL: Unexpected status $HTTP_CODE"
  exit 1
fi

echo -e "\n=========================================================="
echo "           ALL PHASE 4 E2E TESTS PASSED (100%)!           "
echo "=========================================================="
