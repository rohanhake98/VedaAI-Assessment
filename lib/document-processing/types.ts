/**
 * Document processing domain types.
 * These types describe the normalized representation of uploaded documents
 * after they've been processed but BEFORE any AI/OCR extraction.
 */

export type DocumentType = "question_paper" | "answer_sheet";

export interface DocumentPage {
  /** 1-based page number */
  pageNumber: number;
  /** Image data as base64-encoded string */
  imageBase64: string;
  /** MIME type of the image */
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  /** Pixel width */
  width: number;
  /** Pixel height */
  height: number;
  /** Original document type this page belongs to */
  documentType: DocumentType;
}

export interface ProcessedDocument {
  documentType: DocumentType;
  originalFileName: string;
  originalMimeType: string;
  pageCount: number;
  pages: DocumentPage[];
}

export interface ProcessingResult {
  assessmentId: string;
  questionPaper: ProcessedDocument;
  answerSheet: ProcessedDocument;
  /** Status after this phase — ready for AI extraction next */
  status: "ready_for_extraction" | "error";
  processingTimeMs: number;
  createdAt: string;
}

export interface ProcessingError {
  status: "error";
  stage: "validation" | "pdf_processing" | "image_processing" | "unknown";
  message: string;
}
