/**
 * Shared User Update Helpers
 *
 * DRY utilities for user update operations shared between base and Pro versions.
 * Extracted from app/api/user/route.ts to avoid code duplication.
 */

import { saltAndHashPassword, parseAvatarDataUrl } from "@tasktrove/utils"
import { createAvatarFilePath, type AvatarFilePath } from "@tasktrove/types"
import { saveBase64ToAvatarFile } from "./safe-file-operations"

/**
 * Result of processing an avatar update
 */
export type ProcessedAvatarResult =
  | { success: true; avatarPath: AvatarFilePath | null | undefined }
  | { success: false; error: string; code?: number }

/**
 * Process avatar update from request
 *
 * Handles three cases:
 * - undefined: No avatar update (return undefined)
 * - null: Remove avatar (return null)
 * - base64 string: Save new avatar file (return file path)
 *
 * @param avatar - Avatar data from request (undefined | null | base64 string)
 * @returns Processed result with avatar path or error
 */
export async function processAvatarUpdate(
  avatar: string | null | undefined,
): Promise<ProcessedAvatarResult> {
  // No avatar update requested
  if (avatar === undefined) {
    return { success: true, avatarPath: undefined }
  }

  // Remove avatar
  if (avatar === null) {
    return { success: true, avatarPath: null }
  }

  // Parse and save new avatar
  try {
    const parsed = parseAvatarDataUrl(avatar)
    if (!parsed) {
      return {
        success: false,
        error: "Invalid avatar format. Avatar must be a valid data URL",
        code: 400,
      }
    }

    const { mimeType, base64Data } = parsed

    const savedPath = await saveBase64ToAvatarFile(base64Data, mimeType)
    if (!savedPath) {
      return {
        success: false,
        error: "Failed to save avatar. Avatar processing failed",
        code: 500,
      }
    }

    return { success: true, avatarPath: createAvatarFilePath(savedPath) }
  } catch {
    return {
      success: false,
      error: "Failed to process avatar. Avatar processing failed",
      code: 500,
    }
  }
}

/**
 * Result of processing a password update
 */
export type ProcessedPasswordResult =
  | { success: true; hashedPassword: string | undefined }
  | { success: false; error: string }

/**
 * Process password update from request
 *
 * Hashes the password if provided and non-empty.
 * Returns undefined if password is empty or not provided (no update).
 *
 * @param password - Password from request (may be undefined or empty)
 * @returns Processed result with hashed password or error
 */
export function processPasswordUpdate(password: string | undefined): ProcessedPasswordResult {
  // No password update requested
  if (!password || password.length === 0) {
    return { success: true, hashedPassword: undefined }
  }

  try {
    const hashedPassword = saltAndHashPassword(password)
    return { success: true, hashedPassword }
  } catch {
    return {
      success: false,
      error: "Failed to hash password. Password hashing failed",
    }
  }
}

/**
 * Process apiToken update from request
 *
 * Handles three cases:
 * - not in request: No update (return undefined)
 * - null: Remove token (return null)
 * - string: Set new token (return string)
 *
 * @param apiToken - API token from request
 * @param isInRequest - Whether apiToken field was present in request
 * @returns Processed token value
 */
export function processApiTokenUpdate(
  apiToken: string | null | undefined,
  isInRequest: boolean,
): string | null | undefined {
  if (!isInRequest) {
    return undefined // No update
  }
  if (apiToken === null) {
    return null // Remove token
  }
  return apiToken // Set new token
}
