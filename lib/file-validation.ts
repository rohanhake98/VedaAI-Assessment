/**
 * File validation utilities — server and client side.
 *
 * File-size limit: 20 MB per file (configurable via MAX_FILE_SIZE_BYTES).
 * Supported MIME types: PDF, PNG, JPG/JPEG, WEBP.
 */

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_FILE_SIZE_LABEL = "20 MB";

export const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
] as const;

export const SUPPORTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a File object on the client side.
 */
export function validateFile(file: File, label = "File"): ValidationResult {
  if (!file) {
    return { valid: false, error: `${label} is required.` };
  }

  if (file.size === 0) {
    return { valid: false, error: `${label} appears to be empty (0 bytes).` };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `${label} is too large (${sizeMB} MB). Maximum allowed size is ${MAX_FILE_SIZE_LABEL}.`,
    };
  }

  const mimeOk = (SUPPORTED_MIME_TYPES as readonly string[]).includes(file.type);
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  const extOk = SUPPORTED_EXTENSIONS.includes(ext);

  if (!mimeOk && !extOk) {
    return {
      valid: false,
      error: `${label} has an unsupported format (${file.type || ext}). Supported: PDF, PNG, JPG, WEBP.`,
    };
  }

  return { valid: true };
}

/**
 * Validate a raw Buffer + metadata on the server side.
 * Deliberately does NOT trust browser-provided MIME types — performs magic-byte sniffing.
 */
export function validateFileServer(
  buffer: Buffer,
  originalName: string,
  reportedMime: string,
  label = "File"
): ValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: `${label} is empty.` };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `${label} is too large (${sizeMB} MB). Maximum allowed size is ${MAX_FILE_SIZE_LABEL}.`,
    };
  }

  // Magic-byte sniffing — do not trust browser MIME
  const detectedType = detectMimeType(buffer);
  if (!detectedType) {
    return {
      valid: false,
      error: `${label} has an unrecognised format. Supported: PDF, PNG, JPG, WEBP.`,
    };
  }

  return { valid: true };
}

/**
 * Detect MIME type from file magic bytes (signature).
 * Returns null if the type is not one we support.
 */
export function detectMimeType(buffer: Buffer): SupportedMimeType | null {
  if (buffer.length < 4) return null;

  // PDF: %PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return "application/pdf";
  }

  // PNG: \x89PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png";
  }

  // JPEG: \xFF\xD8\xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // WEBP: RIFF....WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer.length > 11 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}
