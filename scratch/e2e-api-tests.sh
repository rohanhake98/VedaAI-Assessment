#!/usr/bin/env bash
set -e

FIXTURES="/app/scratch/test-fixtures"
ENDPOINT="http://localhost:3000/api/assessment/upload"

echo "=========================================================="
echo "      RUNNING E2E API INTEGRATION TESTS (PHASE 3)         "
echo "=========================================================="

echo -e "\n[TEST 1] Missing Question Paper"
HTTP_CODE=$(curl -s -o /app/scratch/res1.json -w "%{http_code}" -F "answerSheet=@$FIXTURES/valid-qp.pdf" $ENDPOINT)
cat /app/scratch/res1.json
echo -e "\nHTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" -eq 400 ]; then echo "✓ PASS"; else echo "✗ FAIL"; exit 1; fi

echo -e "\n[TEST 2] Missing Answer Sheet"
HTTP_CODE=$(curl -s -o /app/scratch/res2.json -w "%{http_code}" -F "questionPaper=@$FIXTURES/valid-qp.pdf" $ENDPOINT)
cat /app/scratch/res2.json
echo -e "\nHTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" -eq 400 ]; then echo "✓ PASS"; else echo "✗ FAIL"; exit 1; fi

echo -e "\n[TEST 3] Valid Question Paper (PDF, 1 page) + Valid Answer Sheet (PDF, 2 pages)"
HTTP_CODE=$(curl -s -o /app/scratch/res3.json -w "%{http_code}" -F "questionPaper=@$FIXTURES/valid-qp.pdf" -F "answerSheet=@$FIXTURES/multi-as.pdf" $ENDPOINT)
cat /app/scratch/res3.json
echo -e "\nHTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" -eq 200 ]; then echo "✓ PASS"; else echo "✗ FAIL"; exit 1; fi

echo -e "\n[TEST 4] Valid Images (PNG Question Paper + PNG Answer Sheet)"
HTTP_CODE=$(curl -s -o /app/scratch/res4.json -w "%{http_code}" -F "questionPaper=@$FIXTURES/valid-img.png" -F "answerSheet=@$FIXTURES/valid-img.png" $ENDPOINT)
cat /app/scratch/res4.json
echo -e "\nHTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" -eq 200 ]; then echo "✓ PASS"; else echo "✗ FAIL"; exit 1; fi

echo -e "\n[TEST 5] Unsupported File Type (.txt plain text)"
HTTP_CODE=$(curl -s -o /app/scratch/res5.json -w "%{http_code}" -F "questionPaper=@$FIXTURES/unsupported.txt" -F "answerSheet=@$FIXTURES/valid-qp.pdf" $ENDPOINT)
cat /app/scratch/res5.json
echo -e "\nHTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" -eq 422 ] || [ "$HTTP_CODE" -eq 400 ]; then echo "✓ PASS"; else echo "✗ FAIL"; exit 1; fi

echo -e "\n[TEST 6] Corrupt PDF file"
HTTP_CODE=$(curl -s -o /app/scratch/res6.json -w "%{http_code}" -F "questionPaper=@$FIXTURES/corrupt.pdf" -F "answerSheet=@$FIXTURES/valid-qp.pdf" $ENDPOINT)
cat /app/scratch/res6.json
echo -e "\nHTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" -eq 422 ]; then echo "✓ PASS"; else echo "✗ FAIL"; exit 1; fi

echo -e "\n[TEST 7] Oversized file (>20MB)"
dd if=/dev/zero of=$FIXTURES/oversized.pdf bs=1M count=21 2>/dev/null
HTTP_CODE=$(curl -s -o /app/scratch/res7.json -w "%{http_code}" -F "questionPaper=@$FIXTURES/oversized.pdf" -F "answerSheet=@$FIXTURES/valid-qp.pdf" $ENDPOINT)
cat /app/scratch/res7.json
echo -e "\nHTTP Status: $HTTP_CODE"
rm -f $FIXTURES/oversized.pdf
if [ "$HTTP_CODE" -eq 413 ] || [ "$HTTP_CODE" -eq 400 ] || [ "$HTTP_CODE" -eq 422 ]; then echo "✓ PASS"; else echo "✗ FAIL"; exit 1; fi

echo -e "\n=========================================================="
echo "           ALL E2E API TESTS PASSED SUCCESSFULLY!          "
echo "=========================================================="
