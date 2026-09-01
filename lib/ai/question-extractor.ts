/**
 * Question Paper AI Extraction Engine.
 *
 * Extracts structured questions from normalized question-paper pages using Google Gemini Vision.
 * Validates, normalizes, and sequences the extracted questions strictly.
 */

import { DocumentPage, ProcessedDocument } from "@/lib/document-processing/types";
import { AiClient, aiClient, AiPart } from "./client";
import {
  ExtractedQuestion,
  QuestionExtractionResult,
  RawAiExtractionResponse,
  RawAiQuestionItem,
} from "./types";

const EXTRACTION_SYSTEM_INSTRUCTION = `You are an expert AI Assessment Assistant specialized in analyzing school and university exam question papers.
Your task is to accurately extract ALL printed questions and sub-questions from the provided question paper page(s) into structured JSON.

CRITICAL EXTRACTION RULES:
1. EXTRACT EVERY QUESTION: Extract every single question present in the document.
2. PRESERVE NUMBERING EXACTLY: Keep the exact printed number as seen (e.g., "1", "2", "3", "10", "11(a)", "11(b)", "12(i)", "Q1", "Section A - 1").
3. SUB-QUESTIONS MUST BE SEPARATE: Each labelled sub-part (e.g. 11(a), 11(b), or 4(i), 4(ii), (a), (b)) MUST be extracted as its own separate question object.
   - Set "parentNumber" to the main question number (e.g. "11" or "4").
   - Set "partLabel" to the specific sub-part label (e.g. "a", "b", "i", "ii").
   - Do NOT merge sub-parts into one big question.
   - Do NOT split regular text that contains bullet points or lists (e.g. "Name 3 factors..." is ONE question).
4. PRESERVE PRINTED ORDER: Questions must appear in the exact visual/reading order as printed in the exam paper. Set the "order" field sequentially (1, 2, 3, ...).
5. MULTI-PAGE CONTINUATION: If a question starts on one page and continues onto the next page, merge the text into a single question and list all involved pages in "sourcePages" (e.g. [1, 2]). Do NOT create duplicate questions for page continuations.
6. MARKS EXTRACTION: If maximum marks are indicated in brackets/parentheses (e.g. "[2 Marks]", "(5)", "3M"), extract the numeric value into "maxMarks".
7. BOUNDING BOXES: Provide the approximate bounding region on the page containing the printed question in pixel/normalized coordinates:
   - x, y, width, height relative to the page top-left.
8. DO NOT INVENT QUESTIONS: If no questions exist on a page (e.g. title page or blank page), do not hallucinate or invent questions.

You must respond ONLY with valid JSON matching this exact structure:
{
  "questions": [
    {
      "number": "1",
      "text": "What is the primary function of chlorophyll in plant cells?",
      "order": 1,
      "parentNumber": null,
      "partLabel": null,
      "maxMarks": 2,
      "sourcePages": [1],
      "region": {
        "page": 1,
        "boundingBox": { "x": 100, "y": 150, "width": 1040, "height": 120 }
      },
      "confidence": 0.98
    },
    {
      "number": "11(a)",
      "text": "Explain the light-dependent reactions of photosynthesis.",
      "order": 11,
      "parentNumber": "11",
      "partLabel": "a",
      "maxMarks": 3,
      "sourcePages": [2],
      "region": {
        "page": 2,
        "boundingBox": { "x": 100, "y": 200, "width": 1040, "height": 160 }
      },
      "confidence": 0.95
    }
  ]
}`;

export class QuestionExtractor {
  private aiClient: AiClient;

  constructor(aiClientInstance?: AiClient) {
    this.aiClient = aiClientInstance || aiClient;
  }

  /**
   * Main entry point to extract questions from a processed question paper document.
   */
  public async extractQuestions(
    assessmentId: string,
    questionPaper: ProcessedDocument
  ): Promise<QuestionExtractionResult> {
    const startTime = Date.now();
    const modelUsed = this.aiClient.getModelName();

    if (!questionPaper || !questionPaper.pages || questionPaper.pages.length === 0) {
      return {
        assessmentId,
        status: "needs_review",
        questions: [],
        totalQuestions: 0,
        extractionTimeMs: Date.now() - startTime,
        modelUsed,
        message: "Question paper contains no valid pages to extract.",
        createdAt: new Date().toISOString(),
      };
    }

    // Check if AI API is configured
    if (!this.aiClient.isConfigured()) {
      return {
        assessmentId,
        status: "needs_review",
        questions: [],
        totalQuestions: 0,
        extractionTimeMs: Date.now() - startTime,
        modelUsed,
        message:
          "Gemini API key is not configured. Please set GEMINI_API_KEY in your environment (.env.local) to enable live AI extraction.",
        createdAt: new Date().toISOString(),
      };
    }

    try {
      // Build multimodal parts from the question-paper pages
      const parts = this.buildPromptParts(questionPaper.pages);

      const response = await this.aiClient.generateContent({
        systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
        parts,
        temperature: 0.1,
        responseMimeType: "application/json",
      });

      // Parse and validate structured output
      const rawJson = this.parseRawJsonResponse(response.text);
      const validatedQuestions = this.validateAndNormalizeQuestions(
        rawJson,
        questionPaper.pageCount
      );

      if (validatedQuestions.length === 0) {
        return {
          assessmentId,
          status: "needs_review",
          questions: [],
          totalQuestions: 0,
          extractionTimeMs: Date.now() - startTime,
          modelUsed: response.model,
          message: "No questions could be reliably extracted from the document.",
          createdAt: new Date().toISOString(),
        };
      }

      return {
        assessmentId,
        status: "success",
        questions: validatedQuestions,
        totalQuestions: validatedQuestions.length,
        extractionTimeMs: Date.now() - startTime,
        modelUsed: response.model,
        createdAt: new Date().toISOString(),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[question-extractor] Extraction error:", msg);

      return {
        assessmentId,
        status: "error",
        questions: [],
        totalQuestions: 0,
        extractionTimeMs: Date.now() - startTime,
        modelUsed,
        message: `Failed to extract questions: ${msg}`,
        createdAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Builds multimodal parts for the vision model prompt.
   */
  private buildPromptParts(pages: DocumentPage[]): AiPart[] {
    const parts: AiPart[] = [
      {
        text: `Please analyze the following ${pages.length} page(s) of the exam question paper and extract all questions into the specified JSON format.`,
      },
    ];

    for (const page of pages) {
      parts.push({
        text: `--- QUESTION PAPER PAGE ${page.pageNumber} OF ${pages.length} ---`,
      });

      if (page.imageBase64 && page.imageBase64.length > 0) {
        // If it's a PDF buffer or image
        const mimeType = page.imageBase64.startsWith("JVBERi0") // '%PDF-' in base64
          ? "application/pdf"
          : page.mimeType || "image/jpeg";

        parts.push({
          inlineData: {
            mimeType,
            data: page.imageBase64,
          },
        });
      }
    }

    return parts;
  }

  /**
   * Safely parses JSON response from model, handling code fences if present.
   */
  public parseRawJsonResponse(rawText: string): RawAiExtractionResponse {
    let cleanText = rawText.trim();

    // Strip markdown code fences if model enclosed JSON in ```json ... ```
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```(?:json)?\s*/i, "");
      cleanText = cleanText.replace(/\s*```$/i, "");
      cleanText = cleanText.trim();
    }

    try {
      const parsed = JSON.parse(cleanText);
      if (Array.isArray(parsed)) {
        return { questions: parsed };
      }
      return parsed;
    } catch (err) {
      console.error("[question-extractor] Malformed JSON response:", cleanText);
      throw new Error(`Model returned invalid JSON: ${(err as Error).message}`);
    }
  }

  /**
   * Server-side validation and normalization of AI question items.
   */
  public validateAndNormalizeQuestions(
    rawResponse: RawAiExtractionResponse,
    totalDocumentPages: number
  ): ExtractedQuestion[] {
    if (!rawResponse || !Array.isArray(rawResponse.questions)) {
      return [];
    }

    const validQuestions: ExtractedQuestion[] = [];
    const seenNumbers = new Set<string>();

    for (let idx = 0; idx < rawResponse.questions.length; idx++) {
      const item: RawAiQuestionItem = rawResponse.questions[idx];

      // 1. Must have a question number
      const numStr = String(item.number ?? "").trim();
      if (!numStr) continue;

      // 2. Must have non-empty question text
      const textStr = String(item.text ?? "").trim();
      if (!textStr) continue;

      // 3. Sub-part parsing if parent/part not explicitly set
      let parentNumber = item.parentNumber ? String(item.parentNumber).trim() : null;
      let partLabel = item.partLabel ? String(item.partLabel).trim() : null;

      if (!parentNumber && !partLabel) {
        // Auto-detect patterns like "11(a)", "11a", "Q4(i)", "4.b"
        const subPartMatch = numStr.match(/^Q?(\d+)[\.\s]*[\(\[]?([a-zA-Z]|[ivxIVX]+)[\)\]]?$/);
        if (subPartMatch) {
          parentNumber = subPartMatch[1];
          partLabel = subPartMatch[2].toLowerCase();
        }
      }

      // 4. Source pages validation
      let sourcePages: number[] = [];
      if (Array.isArray(item.sourcePages) && item.sourcePages.length > 0) {
        sourcePages = item.sourcePages
          .map((p) => Number(p))
          .filter((p) => !isNaN(p) && p >= 1 && p <= totalDocumentPages);
      }
      if (sourcePages.length === 0) {
        sourcePages = [1];
      }

      // 5. Region / Bounding box validation
      let region: ExtractedQuestion["region"] = null;
      if (item.region && typeof item.region === "object") {
        const rPage = Number(item.region.page) || sourcePages[0] || 1;
        const bbox = item.region.boundingBox;
        if (
          bbox &&
          typeof bbox === "object" &&
          typeof bbox.x === "number" &&
          typeof bbox.y === "number" &&
          typeof bbox.width === "number" &&
          typeof bbox.height === "number"
        ) {
          region = {
            page: Math.max(1, Math.min(rPage, totalDocumentPages)),
            boundingBox: {
              x: Math.max(0, bbox.x),
              y: Math.max(0, bbox.y),
              width: Math.max(0, bbox.width),
              height: Math.max(0, bbox.height),
            },
          };
        }
      }

      // 6. Max marks
      let maxMarks: number | null = null;
      if (item.maxMarks !== undefined && item.maxMarks !== null) {
        const parsedMarks = Number(item.maxMarks);
        if (!isNaN(parsedMarks) && parsedMarks > 0) {
          maxMarks = parsedMarks;
        }
      }

      // 7. Confidence
      const confidence =
        typeof item.confidence === "number" &&
        item.confidence >= 0 &&
        item.confidence <= 1
          ? item.confidence
          : 0.95;

      // 8. Generate safe deterministic ID
      const safeId = `q-${numStr.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-${idx + 1}`;

      validQuestions.push({
        id: safeId,
        number: numStr,
        text: textStr,
        order: typeof item.order === "number" && item.order > 0 ? item.order : idx + 1,
        parentNumber,
        partLabel,
        maxMarks,
        sourcePages,
        region,
        confidence,
        status: "answered",
      });

      seenNumbers.add(numStr);
    }

    // Sort by printed order deterministically
    validQuestions.sort((a, b) => a.order - b.order);

    // Re-index order to guarantee clean sequence 1, 2, 3...
    validQuestions.forEach((q, i) => {
      q.order = i + 1;
    });

    return validQuestions;
  }
}

export const questionExtractor = new QuestionExtractor();
