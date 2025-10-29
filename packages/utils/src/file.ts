/**
 * File utility functions for TaskTrove applications
 */

import {
  SUPPORTED_AVATAR_MIME_TYPES,
  AVATAR_DATA_URL_REGEX,
} from "@tasktrove/constants";
import { API_ROUTES } from "@tasktrove/types/constants";
import { getApiBasePath } from "./routing";

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
  const supportedTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
  ];
  return supportedTypes.includes(mimeType);
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

/**
 * Converts an avatar file path to the correct API URL
 * @param avatarPath - The avatar file path (e.g., "data/assets/avatar/uuid.png" or "/data/assets/avatar/uuid.png")
 * @returns The correct API URL (e.g., "/api/v1/assets/avatar/uuid.png") or the original string if it's a data URL or already an API URL
 * @note Uses API_ROUTES.V1_ASSETS from @tasktrove/types/constants
 */
export function getAvatarApiUrl(
  avatarPath: string | undefined | null,
): string | undefined {
  // Return undefined for null/undefined values
  if (!avatarPath) {
    return undefined;
  }

  // If it's already a data URL (base64), return as-is
  if (isValidAvatarDataUrl(avatarPath)) {
    return avatarPath;
  }

  // Get the base assets API path from API_ROUTES.V1_ASSETS constant
  const assetsBasePath = getApiBasePath(API_ROUTES.V1_ASSETS);

  // If it's already an API URL, return as-is
  // Check against API_ROUTES.V1_ASSETS base path
  if (avatarPath.startsWith(assetsBasePath + "/")) {
    return avatarPath;
  }

  // If it's an external URL (http/https), return as-is
  if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) {
    return avatarPath;
  }

  // Convert file system path to API URL
  // Handle both "data/assets/avatar/file.ext" and "/data/assets/avatar/file.ext"
  let normalizedPath = avatarPath;

  // Remove leading slash if present
  if (normalizedPath.startsWith("/")) {
    normalizedPath = normalizedPath.substring(1);
  }

  // Remove "data/" prefix if present
  if (normalizedPath.startsWith("data/")) {
    normalizedPath = normalizedPath.substring(5); // Remove "data/"
  }

  // Remove "assets/" prefix if present (it will be added back in the API path)
  if (normalizedPath.startsWith("assets/")) {
    normalizedPath = normalizedPath.substring(7); // Remove "assets/"
  }

  // Construct the API URL using API_ROUTES.V1_ASSETS constant
  return `${assetsBasePath}/${normalizedPath}`;
}
