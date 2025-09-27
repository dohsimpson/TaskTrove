import { promises as fs } from "fs"
import { DEFAULT_DATA_FILE_PATH } from "@tasktrove/constants"
import { checkDataFile } from "@/lib/startup-checks"
import tutorialData from "@/lib/constants/tutorial-data.json"
import { log } from "./logger"
import { safeReadDataFile } from "./safe-file-operations"

/**
 * Low-level function to write tutorial data to the data file.
 * Does not check if file exists - that's the caller's responsibility.
 *
 * @param filePath - Optional custom file path (defaults to DEFAULT_DATA_FILE_PATH)
 * @returns Promise<void> - throws on error
 */
export async function writeInitialDataFile(
  filePath: string = DEFAULT_DATA_FILE_PATH,
): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(tutorialData, null, 2))
  log.info(`Data file initialized successfully at ${filePath}`)
}

/**
 * Initializes the data file with tutorial data if it doesn't already exist.
 * This function is safe to call multiple times - it will only initialize if needed.
 *
 * @param filePath - Optional custom file path (defaults to DEFAULT_DATA_FILE_PATH)
 * @returns Promise<boolean> - true if initialization was successful or file already exists, false on error
 */
export async function initializeDataFileIfNeeded(
  filePath: string = DEFAULT_DATA_FILE_PATH,
): Promise<boolean> {
  try {
    // Check if data file already exists
    const dataFileCheck = await checkDataFile()

    if (dataFileCheck.exists) {
      log.debug("Data file already exists, skipping initialization")
      return true
    }

    // Initialize with tutorial data using the shared helper
    await writeInitialDataFile(filePath)
    return true
  } catch (error) {
    const errorMessage = `Failed to initialize data file: ${error instanceof Error ? error.message : String(error)}`
    log.error(errorMessage)
    return false
  }
}

/**
 * Checks if password setup is needed by reading the data file.
 * Returns true if password is empty or data file doesn't exist.
 *
 * @returns Promise<boolean> - true if password setup is needed, false if password is already set
 */
export async function checkPasswordSetupNeeded(): Promise<boolean> {
  try {
    // Try to read the data file
    const fileData = await safeReadDataFile()

    // If file doesn't exist or can't be read, password setup is needed
    if (!fileData) {
      log.debug("Data file not found or unreadable, password setup needed")
      return true
    }

    // Check if password is empty
    const needsSetup = !fileData.user.password || fileData.user.password === ""
    log.debug(`Password setup needed: ${needsSetup}`)
    return needsSetup
  } catch (error) {
    log.error(
      `Error checking password setup status: ${error instanceof Error ? error.message : String(error)}`,
    )
    // If we can't read the file, assume setup is needed
    return true
  }
}
