import { promises as fs } from "fs"
import { join } from "path"
import { DEFAULT_DATA_FILE_PATH, DEFAULT_DATA_DIR } from "@/lib/constants/defaults"
import { getMigrationInfo } from "@/lib/utils/data-migration"
import type { Json } from "@/lib/types"

interface PermissionCheckResult {
  success: boolean
  error?: string
  details?: string
}

interface DataFileCheckResult {
  exists: boolean
  needsInitialization?: boolean
  needsMigration?: boolean
  migrationInfo?: {
    currentVersion: string
    targetVersion: string
    needsMigration: boolean
  }
  error?: string
  details?: string
}

/**
 * Check if we have read/write permissions to a directory
 */
export async function checkDirectoryPermissions(dirPath: string): Promise<PermissionCheckResult> {
  try {
    // Check if directory exists and is accessible
    const stats = await fs.stat(dirPath)
    if (!stats.isDirectory()) {
      return {
        success: false,
        error: `Path exists but is not a directory: ${dirPath}`,
        details: "Expected a directory but found a file at this path.",
      }
    }

    // Test write permissions by creating a temporary file
    const testFilePath = join(dirPath, ".tasktrove-permission-test")
    const testContent = "permission-test"

    try {
      await fs.writeFile(testFilePath, testContent)

      // Test read permissions by reading the file back
      const readContent = await fs.readFile(testFilePath, "utf8")
      if (readContent !== testContent) {
        return {
          success: false,
          error: "Read permission test failed",
          details: `Unable to read back test file from ${dirPath}`,
        }
      }

      // Clean up test file
      await fs.unlink(testFilePath)

      return { success: true }
    } catch (writeError) {
      return {
        success: false,
        error: "Write permission denied",
        details: `Cannot write to directory ${dirPath}. Error: ${writeError instanceof Error ? writeError.message : String(writeError)}`,
      }
    }
  } catch (statError) {
    if (
      statError &&
      typeof statError === "object" &&
      "code" in statError &&
      statError.code === "ENOENT"
    ) {
      return {
        success: false,
        error: "Directory does not exist",
        details: `Directory ${dirPath} was not found. Make sure to mount a volume to ./data or create the directory.`,
      }
    }

    return {
      success: false,
      error: "Permission check failed",
      details: `Unable to access ${dirPath}. Error: ${statError instanceof Error ? statError.message : String(statError)}`,
    }
  }
}

/**
 * Check if data.json file exists and is accessible
 */
export async function checkDataFile(): Promise<DataFileCheckResult> {
  const dataFilePath = DEFAULT_DATA_FILE_PATH

  try {
    await fs.access(dataFilePath)
    // File exists, try to read it to ensure it's accessible
    try {
      const dataContent = await fs.readFile(dataFilePath, "utf8")

      // Check if migration is needed
      try {
        const jsonData: Json = JSON.parse(dataContent)
        const migrationInfo = getMigrationInfo(jsonData)

        return {
          exists: true,
          needsMigration: migrationInfo.needsMigration,
          migrationInfo: migrationInfo,
        }
      } catch {
        // If we can't parse the JSON, just return that file exists but don't check migration
        return { exists: true }
      }
    } catch (readError) {
      return {
        exists: true,
        error: "Data file read error",
        details: `Cannot read data.json file. Error: ${readError instanceof Error ? readError.message : String(readError)}`,
      }
    }
  } catch (accessError) {
    if (
      accessError &&
      typeof accessError === "object" &&
      "code" in accessError &&
      accessError.code === "ENOENT"
    ) {
      return {
        exists: false,
        needsInitialization: true,
        details:
          "This appears to be the first time running TaskTrove. The data file needs to be initialized.",
      }
    }

    return {
      exists: false,
      error: "Data file access error",
      details: `Cannot access data.json file. Error: ${accessError instanceof Error ? accessError.message : String(accessError)}`,
    }
  }
}

/**
 * Check all critical directories for TaskTrove
 */
export async function checkStartupPermissions(): Promise<{
  success: boolean
  errors: Array<{ path: string; error: string; details: string }>
  dataFileCheck: DataFileCheckResult
}> {
  const criticalPaths = [DEFAULT_DATA_DIR]
  const errors: Array<{ path: string; error: string; details: string }> = []

  for (const path of criticalPaths) {
    const result = await checkDirectoryPermissions(path)
    if (!result.success) {
      errors.push({
        path,
        error: result.error || "Unknown error",
        details: result.details || "No additional details available",
      })
    }
  }

  // Check data file only if directory permissions are OK
  const dataFileCheck = errors.length === 0 ? await checkDataFile() : { exists: false }

  return {
    success: errors.length === 0 && dataFileCheck.exists && !dataFileCheck.error,
    errors,
    dataFileCheck,
  }
}

/**
 * Format permission errors for user-friendly display
 */
export function formatPermissionErrors(
  errors: Array<{ path: string; error: string; details: string }>,
): string {
  if (errors.length === 0) return ""

  const messages = errors.map(({ path, error, details }) => `❌ ${path}: ${error}\n   ${details}`)

  return [
    "🚨 TaskTrove Permission Errors:",
    "",
    ...messages,
    "",
    "💡 Common solutions:",
    "   • Check that volumes are properly mounted",
    "   • Ensure the host directory has correct permissions (chmod 755)",
    "   • Verify the container user ID matches the host user ID",
    "",
    "📚 Docker run example:",
    `   docker run -v ./${DEFAULT_DATA_DIR}:/app/${DEFAULT_DATA_DIR} -p 3000:3000 ghcr.io/dohsimpson/tasktrove`,
  ].join("\n")
}
