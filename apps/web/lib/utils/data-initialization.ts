import { promises as fs } from "fs"
import { DEFAULT_DATA_FILE_PATH } from "@tasktrove/constants"
import { checkDataFile } from "@/lib/startup-checks"
import tutorialData from "@/lib/constants/tutorial-data.json"
import { log } from "./logger"
import { safeReadUserFile } from "@/lib/utils/safe-file-operations"

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

function checkPasswordSetupNeededForUser(user: { password: string } | undefined) {
  if (!user) {
    log.debug("User data invalid, password setup needed")
    return true
  }

  // Check if password is empty
  const needsSetup = !user.password || user.password === ""
  log.debug(`Password setup needed: ${needsSetup}`)
  return needsSetup
}

/**
 * Checks if password setup is needed by reading only the user field from the data file.
 * Returns true if password is empty or data file doesn't exist.
 *
 * This function intentionally uses safeReadJsonFile instead of safeReadDataFile
 * to avoid requiring the entire data file to be valid - we only need the user.password field.
 *
 * @returns Promise<boolean> - true if password setup is needed, false if password is already set
 */
export async function checkPasswordSetupNeeded(): Promise<boolean> {
  // Try to read just the user field from the data file
  // We use safeReadJsonFile instead of safeReadDataFile because we don't need
  // the entire data file to be valid, just the user.password field
  const userFileData = await safeReadUserFile({ filePath: DEFAULT_DATA_FILE_PATH })

  // If file doesn't exist or can't be read, password setup is needed
  if (!userFileData) {
    log.debug("Data file not found or user field missing, password setup needed")
    return true
  }

  // check if user is an array or an object
  if (Array.isArray(userFileData.user)) {
    const users = userFileData.user
    if (users.length === 0) {
      log.debug("No users found in data file, password setup needed")
      return true
    } else {
      const user = users[0]
      return checkPasswordSetupNeededForUser(user)
    }
  } else if (userFileData.user instanceof Object) {
    return checkPasswordSetupNeededForUser(userFileData.user)
  } else {
    log.debug("User data invalid, password setup needed")
    return true
  }
}
