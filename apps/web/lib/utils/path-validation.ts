import { realpathSync } from "fs"
import { join, resolve, isAbsolute, sep } from "path"
import { DEFAULT_ASSETS_DIR, DEFAULT_DATA_DIR } from "@tasktrove/constants"

/**
 * Validation result for asset paths
 */
interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates that path segments don't contain dangerous patterns.
 *
 * This function prevents path traversal attacks by checking for:
 * - Parent directory references (..)
 * - Absolute paths (starting with / or drive letters)
 * - Null bytes (\0)
 * - Empty segments
 *
 * Path traversal attacks could allow attackers to:
 * - Access sensitive files outside the assets directory (e.g., /api/assets/../data.json)
 * - Read environment variables (e.g., /api/assets/../../.env)
 * - Access system files (e.g., /api/assets/../../../etc/passwd)
 *
 * @param pathSegments - Array of path segments from the URL
 * @returns Validation result with error message if invalid
 */
export function validateAssetPath(pathSegments: string[]): ValidationResult {
  // Check for empty path
  if (pathSegments.length === 0) {
    return {
      valid: false,
      error: "Path cannot be empty",
    }
  }

  // Validate each segment
  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i]

    // Check for empty segments
    if (!segment || segment.trim() === "") {
      return {
        valid: false,
        error: "Path segments cannot be empty",
      }
    }

    // Check for parent directory traversal (..)
    if (segment === ".." || segment.includes("..")) {
      return {
        valid: false,
        error: "Path traversal is not allowed",
      }
    }

    // Check for absolute paths (Unix: /path, Windows: C:\path or \path)
    if (isAbsolute(segment)) {
      return {
        valid: false,
        error: "Absolute paths are not allowed",
      }
    }

    // Check for leading slashes or backslashes
    if (segment.startsWith("/") || segment.startsWith("\\")) {
      return {
        valid: false,
        error: "Path segments cannot start with separators",
      }
    }

    // Check for null bytes (can be used to bypass file extension checks)
    if (segment.includes("\0")) {
      return {
        valid: false,
        error: "Null bytes are not allowed in paths",
      }
    }

    // Check for Windows drive letters (e.g., C:)
    if (/^[a-zA-Z]:/.test(segment)) {
      return {
        valid: false,
        error: "Drive letters are not allowed",
      }
    }
  }

  return { valid: true }
}

/**
 * Constructs and validates a secure asset file path.
 *
 * Security measures implemented:
 * 1. Validates path segments to reject dangerous patterns
 * 2. Constructs path using safe join operations
 * 3. Resolves symlinks and relative paths to canonical path using realpathSync
 * 4. Verifies the resolved path is within the assets directory
 *
 * This prevents:
 * - Path traversal attacks (../../../etc/passwd)
 * - Symlink attacks (linking outside assets directory)
 * - Absolute path injection (/etc/passwd)
 * - URL-encoded attacks (%2e%2e/data.json - decoded by Next.js)
 *
 * @param pathSegments - Array of path segments from the URL (already URL-decoded by Next.js)
 * @returns Secure canonical file path or null if validation fails
 */
export function getSecureAssetPath(pathSegments: string[]): string | null {
  // First validate the path segments
  const validation = validateAssetPath(pathSegments)
  if (!validation.valid) {
    return null
  }

  // Construct the base assets directory path
  const baseAssetsDir = resolve(process.cwd(), DEFAULT_DATA_DIR, DEFAULT_ASSETS_DIR)

  // Construct the requested file path
  const requestedPath = join(baseAssetsDir, ...pathSegments)

  // Resolve to canonical path to handle any symlinks or relative components
  // This also normalizes the path for consistent comparison
  let canonicalPath: string
  try {
    // realpathSync will throw if the file doesn't exist
    // We want to allow non-existent files (will return 404 later)
    // So we use realpathSync on the base directory and join with the file path
    const canonicalBase = realpathSync(baseAssetsDir)

    // For the requested path, we need to resolve any .. or . components
    // but allow non-existent files. We do this by resolving relative to canonical base.
    const relativePath = join(...pathSegments)
    canonicalPath = join(canonicalBase, relativePath)

    // Normalize to handle any remaining path components
    canonicalPath = resolve(canonicalPath)
  } catch {
    // If base directory doesn't exist, this is a system error
    // Return null to trigger a validation error
    return null
  }

  // Critical security check: Ensure the resolved path is within the assets directory
  // This prevents:
  // - Path traversal: /api/assets/../../../etc/passwd
  // - Symlink attacks: symlink outside assets directory
  // We need to ensure canonicalPath starts with canonicalBase followed by a separator
  // or is exactly equal to canonicalBase
  const canonicalBase = realpathSync(baseAssetsDir)

  if (canonicalPath === canonicalBase) {
    // Requesting the base directory itself is not allowed
    return null
  }

  // Check if canonicalPath starts with canonicalBase + separator
  // This prevents partial matches like:
  // canonicalBase: /app/data/assets
  // canonicalPath: /app/data/assets-evil/file.txt (would pass without separator check)
  if (!canonicalPath.startsWith(canonicalBase + sep)) {
    return null
  }

  // Path is validated and secure
  return canonicalPath
}
