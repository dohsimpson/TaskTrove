/**
 * File utility functions for TaskTrove applications
 */

import {
  SUPPORTED_AVATAR_MIME_TYPES,
  AVATAR_DATA_URL_REGEX,
} from "@tasktrove/constants";

// Re-export constants for convenience
export { SUPPORTED_AVATAR_MIME_TYPES, AVATAR_DATA_URL_REGEX };

/**
 * Validates if a string is a valid base64 encoded image data URL
 * @param dataUrl - The data URL string to validate
 * @returns true if valid, false otherwise
 */
export function isValidAvatarDataUrl(dataUrl: string): boolean {
  return AVATAR_DATA_URL_REGEX.test(dataUrl);
}

/**
 * Extracts MIME type and base64 data from a data URL
 * @param dataUrl - The data URL string to parse
 * @returns Object with mimeType and base64Data, or null if invalid
 */
export function parseAvatarDataUrl(
  dataUrl: string,
): { mimeType: string; base64Data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  const [, mimeType, base64Data] = match;
  if (!mimeType || !base64Data) return null;

  return { mimeType, base64Data };
}

/**
 * Checks if a MIME type is supported for avatars
 * @param mimeType - The MIME type to check
 * @returns true if supported, false otherwise
 */
export function isSupportedAvatarMimeType(mimeType: string): boolean {
  return SUPPORTED_AVATAR_MIME_TYPES.includes(mimeType as any);
}

/**
 * Converts a File to base64 string with optional size limit
 * @param file - The File object to encode
 * @param maxSizeBytes - Optional maximum file size in bytes. If exceeded, returns null
 * @returns Promise that resolves to base64 string or null if file exceeds size limit
 */
export async function encodeFileToBase64(
  file: File,
  maxSizeBytes?: number,
): Promise<string | null> {
  // Check size limit if provided
  if (maxSizeBytes && file.size > maxSizeBytes) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read file as string"));
        return;
      }
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Invalid data URL format"));
        return;
      }
      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Converts a File to base64 data URL with optional size limit
 * @param file - The File object to encode
 * @param maxSizeBytes - Optional maximum file size in bytes. If exceeded, returns null
 * @returns Promise that resolves to data URL string or null if file exceeds size limit
 */
export async function encodeFileToDataUrl(
  file: File,
  maxSizeBytes?: number,
): Promise<string | null> {
  // Check size limit if provided
  if (maxSizeBytes && file.size > maxSizeBytes) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read file as string"));
        return;
      }
      resolve(result);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}
