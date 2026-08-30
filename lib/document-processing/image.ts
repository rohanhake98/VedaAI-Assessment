/**
 * Image processing module.
 *
 * Uses `sharp` for:
 * - Reading image metadata (width, height, format).
 * - Normalizing to JPEG (quality 90) for consistent downstream processing.
 * - Preserving aspect ratio (no cropping, no distortion).
 *
 * Each uploaded image file is treated as a single page (page 1).
 */

import sharp, { type Metadata } from "sharp";
import { DocumentPage, DocumentType } from "./types";

/** Maximum dimension (longest side) for normalized output. */
const MAX_DIMENSION = 2048;

/**
 * Process a single image buffer into a normalized DocumentPage.
 */
export async function processImage(
  buffer: Buffer,
  documentType: DocumentType,
  originalFileName: string
): Promise<{ pageCount: 1; pages: [DocumentPage] }> {
  let sharpImage = sharp(buffer);
  let metadata: Metadata;

  try {
    metadata = await sharpImage.metadata();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read image "${originalFileName}": ${msg}. File may be corrupt or unsupported.`);
  }

  if (!metadata.width || !metadata.height) {
    throw new Error(`Image "${originalFileName}" has invalid dimensions.`);
  }

  // Resize if too large, preserving aspect ratio
  const needsResize =
    metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION;

  if (needsResize) {
    sharpImage = sharpImage.resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  // Normalize to JPEG for consistent downstream handling
  let normalizedBuffer: Buffer;
  try {
    normalizedBuffer = await sharpImage
      .jpeg({ quality: 90, progressive: false })
      .toBuffer();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to normalize image "${originalFileName}": ${msg}`);
  }

  // Get final dimensions after resize
  const finalMeta = await sharp(normalizedBuffer).metadata();
  const finalWidth = finalMeta.width ?? metadata.width;
  const finalHeight = finalMeta.height ?? metadata.height;

  const page: DocumentPage = {
    pageNumber: 1,
    imageBase64: normalizedBuffer.toString("base64"),
    mimeType: "image/jpeg",
    width: finalWidth,
    height: finalHeight,
    documentType,
  };

  return { pageCount: 1, pages: [page] };
}
