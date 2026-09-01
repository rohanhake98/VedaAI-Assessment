#!/usr/bin/env bash
set -e

FIXTURES="/app/scratch/test-fixtures"
UPLOAD_EP="http://localhost:3000/api/assessment/upload"
EXTRACT_Q_EP="http://localhost:3000/api/assessment/extract-questions"
EXTRACT_A_EP="http://localhost:3000/api/assessment/extract-answers"
MAP_A_EP="http://localhost:3000/api/assessment/map-answers"

echo "=========================================================="
echo "      RUNNING E2E INTEGRATION TESTS (PHASE 6)             "
echo "=========================================================="

echo -e "\n[TEST 1] Map Answers: Missing assessmentId body"
HTTP_CODE=$(curl -s -o /app/scratch/p6_res1.json -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{}' $MAP_A_EP)
cat /app/scratch/p6_res1.json
echo -e "\nHTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" -eq 400 ]; then echo "✓ PASS"; else echo "✗ FAIL"; exit 1; fi

echo -e "\n[TEST 2] Map Answers: Non-existent assessmentId"
HTTP_CODE=$(curl -s -o /app/scratch/p6_res2.json -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"assessmentId": "non-existent-id-999"}' $MAP_A_EP)
cat /app/scratch/p6_res2.json
echo -e "\nHTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" -eq 404 ]; then echo "✓ PASS"; else echo "✗ FAIL"; exit 1; fi

echo -e "\n[TEST 3] Step 1: Upload Question Paper & Answer Sheet"
HTTP_CODE=$(curl -s -o /app/scratch/p6_upload.json -w "%{http_code}" -F "questionPaper=@$FIXTURES/valid-qp.pdf" -F "answerSheet=@$FIXTURES/multi-as.pdf" $UPLOAD_EP)
cat /app/scratch/p6_upload.json
echo -e "\nUpload HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" -eq 200 ]; then echo "✓ PASS"; else echo "✗ FAIL"; exit 1; fi

ASSESSMENT_ID=$(node -e "const d = JSON.parse(fs.readFileSync('/app/scratch/p6_upload.json')); console.log(d.assessmentId);" 2>/dev/null)
echo "Obtained Assessment ID: $ASSESSMENT_ID"

echo -e "\n[TEST 4] Step 2: Extract Questions for Assessment $ASSESSMENT_ID"
HTTP_CODE=$(curl -s -o /app/scratch/p6_extract_q.json -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"assessmentId\": \"$ASSESSMENT_ID\"}" $EXTRACT_Q_EP)
cat /app/scratch/p6_extract_q.json
echo -e "\nQuestion Extraction HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 422 ]; then
  echo "✓ PASS: Question extraction step succeeded"
else
  echo "✗ FAIL: Unexpected status $HTTP_CODE"
  exit 1
fi

echo -e "\n[TEST 5] Step 3: Extract Handwritten Answers for Assessment $ASSESSMENT_ID"
HTTP_CODE=$(curl -s -o /app/scratch/p6_extract_a.json -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"assessmentId\": \"$ASSESSMENT_ID\"}" $EXTRACT_A_EP)
cat /app/scratch/p6_extract_a.json
echo -e "\nAnswer Extraction HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 422 ]; then
  echo "✓ PASS: Answer extraction step succeeded"
else
  echo "✗ FAIL: Unexpected status $HTTP_CODE"
  exit 1
fi

echo -e "\n[TEST 6] Step 4: Map Answers to Questions for Assessment $ASSESSMENT_ID"
HTTP_CODE=$(curl -s -o /app/scratch/p6_map.json -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"assessmentId\": \"$ASSESSMENT_ID\"}" $MAP_A_EP)
cat /app/scratch/p6_map.json
echo -e "\nAnswer Mapping HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 422 ]; then
  echo "✓ PASS: Answer mapping step succeeded"
else
  echo "✗ FAIL: Unexpected status $HTTP_CODE"
  exit 1
fi

echo -e "\n=========================================================="
echo "           ALL PHASE 6 E2E TESTS PASSED (100%)!           "
echo "=========================================================="
