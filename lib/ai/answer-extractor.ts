/**
 * Student Answer Sheet AI Extraction Engine.
 *
 * Analyzes handwritten student answer sheet pages using Google Gemini Vision.
 * Identifies handwritten answer blocks, student question references, transcriptions,
 * and exact bounding box regions on each page.
 */

import { DocumentPage, ProcessedDocument } from "@/lib/document-processing/types";
import { AiClient, aiClient, AiPart } from "./client";
import {
  AnswerExtractionResult,
  AnswerRegion,
  BoundingBox,
  ExtractedAnswer,
  RawAiAnswerExtractionResponse,
  RawAiAnswerItem,
  RawAiAnswerRegion,
} from "./types";

const ANSWER_EXTRACTION_SYSTEM_INSTRUCTION = `You are an expert AI Assessment Assistant specialized in analyzing handwritten student answer sheets for exams.
Your task is to locate and extract ALL handwritten answer blocks from the student's answer sheet pages into structured JSON.

CRITICAL ANSWER EXTRACTION RULES:
1. DETECT EVERY ANSWER BLOCK:
   - Identify every distinct handwritten answer on the page(s).
   - Do NOT assume answers are written in numerical order. Students may answer questions in any random order (e.g. Q1, Q4 on page 1, Q2, Q3 on page 2).
   - If multiple answers are on the same page, return each as a separate answer object with its own distinct bounding box.
2. QUESTION REFERENCE DETECTION:
   - Identify the student-written question number or label (e.g. "1", "2", "4", "11(a)", "11(b)", "Q.5", "Ans 5", "5(a)").
   - Normalize obvious labels (e.g. "Ans 5" -> "5", "Q.4" -> "4", "11 a" -> "11(a)").
   - If the student did NOT write a question number or it is illegible, set "detectedQuestionNumber": null. Do NOT make wild guesses.
3. HANDWRITTEN TEXT TRANSCRIPTION:
   - Transcribe the student's handwritten answer as accurately as possible.
   - Do NOT hallucinate or invent text for illegible handwriting.
   - If the answer includes a diagram, chart, formula, or table, include a brief description in brackets (e.g. "[Diagram of Heart with labels: Atrium, Ventricle, Aorta]").
   - Set "hasVisualContent": true if diagrams, charts, or drawings are present.
4. EXACT BOUNDING BOX REGIONS (CRITICAL):
   - For every answer block, provide the bounding box { "x": number, "y": number, "width": number, "height": number } surrounding the student's answer (and its question label).
   - The region MUST surround the specific answer, NOT the entire page.
   - Origin (0,0) is at top-left of the page.
   - Coordinates should be in pixels relative to standard page dimensions (width ~1240, height ~1754).
5. MULTI-PAGE CONTINUATION (CRITICAL):
   - If an answer continues across page boundaries (e.g. Q7 starts at the bottom of Page 1 and finishes on Page 2):
     Combine into ONE answer object with multiple "regions" in the "regions" array:
     [
       { "page": 1, "boundingBox": { "x": 100, "y": 1200, "width": 1040, "height": 450 } },
       { "page": 2, "boundingBox": { "x": 100, "y": 100, "width": 1040, "height": 600 } }
     ]
6. EXCLUDE NON-ANSWER CONTENT:
   - Ignore page numbers, student signatures, margins, blank space, decorative lines, or teacher markings.

You must respond ONLY with valid JSON matching this exact structure:
{
  "answers": [
    {
      "detectedQuestionNumber": "1",
      "text": "The artery carries oxygenated blood away from the heart to all parts of the body.",
      "regions": [
        {
          "page": 1,
          "boundingBox": { "x": 80, "y": 120, "width": 1080, "height": 180 }
        }
      ],
      "confidence": 0.95,
      "hasVisualContent": false
    },
    {
      "detectedQuestionNumber": "2",
      "text": "Chloroplasts are the organelles primarily involved in photosynthesis.",
      "regions": [
        {
          "page": 1,
          "boundingBox": { "x": 80, "y": 340, "width": 1080, "height": 220 }
        }
      ],
      "confidence": 0.92,
      "hasVisualContent": false
    }
  ]
}`;

export class AnswerExtractor {
  private aiClient: AiClient;

  constructor(aiClientInstance?: AiClient) {
    this.aiClient = aiClientInstance || aiClient;
  }

  /**
   * Main entry point to extract handwritten answers from an answer sheet document.
   */
  public async extractAnswers(
    assessmentId: string,
    answerSheet: ProcessedDocument
  ): Promise<AnswerExtractionResult> {
    const startTime = Date.now();
    const modelUsed = this.aiClient.getModelName();

    if (!answerSheet || !answerSheet.pages || answerSheet.pages.length === 0) {
      return {
        assessmentId,
        status: "needs_review",
        answers: [],
        totalAnswers: 0,
        extractionTimeMs: Date.now() - startTime,
        modelUsed,
        message: "Answer sheet contains no valid pages to extract.",
        createdAt: new Date().toISOString(),
      };
    }

    if (!this.aiClient.isConfigured()) {
      return {
        assessmentId,
        status: "needs_review",
        answers: [],
        totalAnswers: 0,
        extractionTimeMs: Date.now() - startTime,
        modelUsed,
        message:
          "Gemini API key is not configured. Please set GEMINI_API_KEY in your environment (.env.local) to enable live AI answer extraction.",
        createdAt: new Date().toISOString(),
      };
    }

    try {
      // Build multimodal prompt parts for answer sheet pages
      const parts = this.buildPromptParts(answerSheet.pages);

      const response = await this.aiClient.generateContent({
        systemInstruction: ANSWER_EXTRACTION_SYSTEM_INSTRUCTION,
        parts,
        temperature: 0.1,
        responseMimeType: "application/json",
      });

      const rawJson = this.parseRawJsonResponse(response.text);
      const validatedAnswers = this.validateAndNormalizeAnswers(
        rawJson,
        answerSheet.pages
      );

      if (validatedAnswers.length === 0) {
        return {
          assessmentId,
          status: "needs_review",
          answers: [],
          totalAnswers: 0,
          extractionTimeMs: Date.now() - startTime,
          modelUsed: response.model,
          message: "No handwritten answers could be reliably detected on the answer sheet.",
          createdAt: new Date().toISOString(),
        };
      }

      return {
        assessmentId,
        status: "success",
        answers: validatedAnswers,
        totalAnswers: validatedAnswers.length,
        extractionTimeMs: Date.now() - startTime,
        modelUsed: response.model,
        createdAt: new Date().toISOString(),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[answer-extractor] Extraction error:", msg);

      return {
        assessmentId,
        status: "error",
        answers: [],
        totalAnswers: 0,
        extractionTimeMs: Date.now() - startTime,
        modelUsed,
        message: `Failed to extract answers: ${msg}`,
        createdAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Builds multimodal parts from answer sheet pages.
   */
  private buildPromptParts(pages: DocumentPage[]): AiPart[] {
    const parts: AiPart[] = [
      {
        text: `Please analyze the following ${pages.length} page(s) of the student's handwritten answer sheet and detect all answer blocks and their bounding regions.`,
      },
    ];

    for (const page of pages) {
      parts.push({
        text: `--- STUDENT ANSWER SHEET PAGE ${page.pageNumber} OF ${pages.length} (Dimensions: ${page.width}x${page.height}) ---`,
      });

      if (page.imageBase64 && page.imageBase64.length > 0) {
        const mimeType = page.imageBase64.startsWith("JVBERi0")
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
  public parseRawJsonResponse(rawText: string): RawAiAnswerExtractionResponse {
    let cleanText = rawText.trim();

    if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```(?:json)?\s*/i, "");
      cleanText = cleanText.replace(/\s*```$/i, "");
      cleanText = cleanText.trim();
    }

    try {
      const parsed = JSON.parse(cleanText);
      if (Array.isArray(parsed)) {
        return { answers: parsed };
      }
      return parsed;
    } catch (err) {
      console.error("[answer-extractor] Malformed JSON response:", cleanText);
      throw new Error(`Model returned invalid JSON: ${(err as Error).message}`);
    }
  }

  /**
   * Server-side validation, normalization, coordinate scaling, and multi-page consolidation.
   */
  public validateAndNormalizeAnswers(
    rawResponse: RawAiAnswerExtractionResponse,
    documentPages: DocumentPage[]
  ): ExtractedAnswer[] {
    if (!rawResponse || !Array.isArray(rawResponse.answers)) {
      return [];
    }

    const totalPages = documentPages.length;
    const pageDimensions = new Map<number, { width: number; height: number }>();
    documentPages.forEach((p) => {
      pageDimensions.set(p.pageNumber, {
        width: p.width || 1240,
        height: p.height || 1754,
      });
    });

    const candidateAnswers: ExtractedAnswer[] = [];

    for (let idx = 0; idx < rawResponse.answers.length; idx++) {
      const item: RawAiAnswerItem = rawResponse.answers[idx];

      // 1. Question reference normalization
      let detectedQuestionNumber: string | null = null;
      if (item.detectedQuestionNumber !== undefined && item.detectedQuestionNumber !== null) {
        const rawNum = String(item.detectedQuestionNumber).trim();
        if (rawNum.length > 0 && rawNum.toLowerCase() !== "null" && rawNum.toLowerCase() !== "none") {
          // Normalize e.g. "Ans. 5" -> "5", "Q4(a)" -> "4(a)", "Q. 10" -> "10"
          let normalized = rawNum.replace(/^(?:Ans(?:wer)?\.?|Q(?:uestion)?\.?)\s*/i, "").trim();
          // Normalize subparts like "11 a" or "11 - a" to "11(a)"
          const subMatch = normalized.match(/^(\d+)[\s\-\.]*[\(\[]?([a-zA-Z]|[ivxIVX]+)[\)\]]?$/);
          if (subMatch) {
            normalized = `${subMatch[1]}(${subMatch[2].toLowerCase()})`;
          }
          detectedQuestionNumber = normalized;
        }
      }

      // 2. Text transcription
      const textStr = String(item.text ?? "").trim();

      // 3. Extract & Validate regions
      const rawRegions: RawAiAnswerRegion[] = [];
      if (Array.isArray(item.regions) && item.regions.length > 0) {
        rawRegions.push(...item.regions);
      } else if (item.region) {
        rawRegions.push(item.region);
      } else if (item.boundingBox) {
        rawRegions.push({ page: item.page || 1, boundingBox: item.boundingBox });
      }

      const validRegions: AnswerRegion[] = [];
      for (const r of rawRegions) {
        const pageNum = Number(r.page) || 1;
        const validPageNum = Math.max(1, Math.min(pageNum, totalPages));
        const dims = pageDimensions.get(validPageNum) || { width: 1240, height: 1754 };

        const bbox = this.normalizeBoundingBox(r.boundingBox, dims.width, dims.height);
        if (bbox) {
          validRegions.push({
            id: `region-${idx + 1}-${validPageNum}-${validRegions.length + 1}`,
            page: validPageNum,
            boundingBox: bbox,
          });
        }
      }

      // If no valid bounding box was extracted, provide a safe fallback region covering page center
      if (validRegions.length === 0) {
        const fallbackPage = Math.max(1, Math.min(Number(item.page) || 1, totalPages));
        const dims = pageDimensions.get(fallbackPage) || { width: 1240, height: 1754 };
        validRegions.push({
          id: `region-${idx + 1}-${fallbackPage}-fallback`,
          page: fallbackPage,
          boundingBox: {
            x: Math.round(dims.width * 0.08),
            y: Math.round(dims.height * 0.1),
            width: Math.round(dims.width * 0.84),
            height: Math.round(dims.height * 0.25),
          },
        });
      }

      // 4. Confidence
      const confidence =
        typeof item.confidence === "number" &&
        item.confidence >= 0 &&
        item.confidence <= 1
          ? item.confidence
          : 0.92;

      // 5. Status
      const status =
        confidence < 0.6 || !detectedQuestionNumber ? "ambiguous" : "candidate";

      const id = `ans-${detectedQuestionNumber ? detectedQuestionNumber.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase() : "unlabeled"}-${idx + 1}`;

      candidateAnswers.push({
        id,
        detectedQuestionNumber,
        text: textStr || (item.hasVisualContent ? "[Visual answer / diagram content]" : "[Handwritten answer]"),
        regions: validRegions,
        confidence,
        status,
        hasVisualContent: !!item.hasVisualContent,
      });
    }

    // Consolidate multi-page answers if the student labeled continuations across pages
    const consolidated = this.consolidateMultiPageAnswers(candidateAnswers);

    return consolidated;
  }

  /**
   * Normalizes and scales a bounding box into valid page pixel coordinates.
   */
  private normalizeBoundingBox(
    rawBbox: { x?: number; y?: number; width?: number; height?: number } | undefined,
    pageWidth: number,
    pageHeight: number
  ): BoundingBox | null {
    if (!rawBbox || typeof rawBbox !== "object") return null;

    let x = Number(rawBbox.x);
    let y = Number(rawBbox.y);
    let w = Number(rawBbox.width);
    let h = Number(rawBbox.height);

    if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) return null;

    // Handle normalized [0, 1] coordinates
    if (w <= 1.0 && h <= 1.0 && x <= 1.0 && y <= 1.0 && (w > 0 || h > 0)) {
      x = x * pageWidth;
      y = y * pageHeight;
      w = w * pageWidth;
      h = h * pageHeight;
    }
    // Handle normalized [0, 1000] coordinates (standard vision API convention)
    else if (w <= 1000 && h <= 1000 && x <= 1000 && y <= 1000 && (pageWidth > 1000 || pageHeight > 1000) && (w < 100 && h < 100)) {
      // ratio scale
      x = (x / 1000) * pageWidth;
      y = (y / 1000) * pageHeight;
      w = (w / 1000) * pageWidth;
      h = (h / 1000) * pageHeight;
    }

    // Clamp coordinates strictly within page boundaries
    x = Math.max(0, Math.min(x, pageWidth - 10));
    y = Math.max(0, Math.min(y, pageHeight - 10));
    w = Math.max(10, Math.min(w, pageWidth - x));
    h = Math.max(10, Math.min(h, pageHeight - y));

    return {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(w),
      height: Math.round(h),
    };
  }

  /**
   * Consolidates separate items that represent the same answer continuing across pages.
   */
  private consolidateMultiPageAnswers(answers: ExtractedAnswer[]): ExtractedAnswer[] {
    const result: ExtractedAnswer[] = [];
    const seenByQuestionNum = new Map<string, ExtractedAnswer>();

    for (const ans of answers) {
      if (ans.detectedQuestionNumber) {
        const existing = seenByQuestionNum.get(ans.detectedQuestionNumber);
        if (existing) {
          // Merge text and regions into the existing answer
          existing.text = `${existing.text}\n[Continuation]: ${ans.text}`;
          existing.regions.push(...ans.regions);
          existing.confidence = Math.min(existing.confidence, ans.confidence);
          if (ans.hasVisualContent) existing.hasVisualContent = true;
          continue;
        } else {
          seenByQuestionNum.set(ans.detectedQuestionNumber, ans);
        }
      }
      result.push(ans);
    }

    return result;
  }
}

export const answerExtractor = new AnswerExtractor();
