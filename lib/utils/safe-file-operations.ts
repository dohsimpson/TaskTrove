import fs from "fs/promises"
import { z } from "zod"
import { Mutex } from "async-mutex"
import { log } from "./logger"
import {
  DataFile,
  DataFileSchema,
  DataFileSerializationSchema,
  SettingsFile,
  SettingsFileSchema,
  SettingsFileSerializationSchema,
} from "@/lib/types"
import { DEFAULT_DATA_FILE_PATH, DEFAULT_SETTINGS_FILE_PATH } from "@/lib/constants/defaults"

// Create a mutex instance to synchronize all file read/write operations
const fileOperationsMutex = new Mutex()

/**
 * Safely parses a JSON file from the given filepath and validates it against a Zod schema.
 * This is a convenience wrapper around safeReadJsonFile for data files.
 *
 * @param options - Configuration options for reading the data file
 * @param options.filePath - Path to the JSON file to read (defaults to DEFAULT_DATA_FILE_PATH)
 * @returns The parsed and validated object, or undefined if parsing/validation fails.
 */
export async function safeReadDataFile({
  filePath = DEFAULT_DATA_FILE_PATH,
}: { filePath?: string } = {}): Promise<DataFile | undefined> {
  return safeReadJsonFile({
    filePath,
    schema: DataFileSchema,
    // No defaultValue - data files return undefined on failure
  })
}

/**
 * Safely writes a JavaScript object to a JSON file, validating it against a Zod schema
 * and transforming Date objects to strings for serialization.
 * This is a convenience wrapper around safeWriteJsonFile for data files.
 *
 * @param options - Configuration options for writing the data file
 * @param options.filePath - Path to the JSON file to write (defaults to DEFAULT_DATA_FILE_PATH)
 * @param options.data - The data object to write to the file
 * @returns true if the write operation was successful, false otherwise.
 */
export async function safeWriteDataFile({
  filePath = DEFAULT_DATA_FILE_PATH,
  data,
}: {
  filePath?: string
  data: DataFile
}): Promise<boolean> {
  return safeWriteJsonFile({
    filePath,
    data,
    serializationSchema: DataFileSerializationSchema,
  })
}

// =============================================================================
// GENERIC FILE OPERATIONS (Consolidated from safe-settings-operations.ts)
// =============================================================================

/**
 * Generic function to safely read and parse a JSON file with Zod validation.
 * Handles file access errors, JSON parsing errors, and Zod validation errors.
 *
 * @param options - Configuration options for reading the file
 * @param options.filePath - Path to the JSON file to read
 * @param options.schema - Zod schema to validate against
 * @param options.defaultValue - Default value to return on failure (optional)
 * @returns The parsed and validated object, defaultValue, or undefined if parsing/validation fails.
 */
export async function safeReadJsonFile<T>({
  filePath,
  schema,
  defaultValue,
}: {
  filePath: string
  schema: z.ZodSchema<T>
  defaultValue?: T
}): Promise<T | undefined> {
  log.debug(`Attempting to parse file: ${filePath}`)
  let fileContent: string

  // 1. Read the file content from the file system (synchronized to prevent race conditions)
  try {
    fileContent = await fileOperationsMutex.runExclusive(async () => {
      return await fs.readFile(filePath, "utf-8")
    })
    log.debug(`Successfully read file: ${filePath}`)
  } catch (error) {
    if (error instanceof Error) {
      log.info(`File ${filePath} not found or unreadable: ${error.message}`)
    } else {
      log.info(`File ${filePath} not found or unreadable`)
    }
    if (defaultValue !== undefined) {
      log.info(`Using default value for ${filePath}`)
      return defaultValue
    }
    return undefined
  }

  // 2. Parse the file content as JSON
  let jsonData: unknown
  try {
    jsonData = JSON.parse(fileContent)
    log.debug(`Successfully parsed JSON from file: ${filePath}`)
  } catch (error) {
    if (error instanceof Error) {
      log.warn(`Failed to parse JSON from file ${filePath}: ${error.message}`)
    } else {
      log.warn(`Failed to parse JSON from file ${filePath}`)
    }
    if (defaultValue !== undefined) {
      log.info(`Using default value for ${filePath}`)
      return defaultValue
    }
    return undefined
  }

  // 3. Validate the parsed JSON against the Zod schema
  try {
    const parsedData = schema.parse(jsonData, { reportInput: true })
    log.debug(`Successfully parsed and validated data from file: ${filePath}`)
    return parsedData
  } catch (error) {
    if (error instanceof z.ZodError) {
      log.warn(`Validation failed for file ${filePath}:`)
      log.warn(JSON.stringify(error.issues, null, 2))
    } else if (error instanceof Error) {
      log.warn(
        `An unexpected error occurred during validation for file ${filePath}: ${error.message}`,
      )
    } else {
      log.warn(`An unknown error occurred during validation for file ${filePath}`)
    }
    if (defaultValue !== undefined) {
      log.info(`Using default value for ${filePath}`)
      return defaultValue
    }
    return undefined
  }
}

/**
 * Generic function to safely write an object to a JSON file with Zod validation and serialization.
 * Handles Zod validation errors, JSON serialization errors, and file writing errors.
 *
 * @param options - Configuration options for writing the file
 * @param options.filePath - Path to the JSON file to write
 * @param options.data - The data object to write to the file
 * @param options.serializationSchema - Zod schema for serialization transformation
 * @returns true if the write operation was successful, false otherwise.
 */
export async function safeWriteJsonFile<T, S>({
  filePath,
  data,
  serializationSchema,
}: {
  filePath: string
  data: T
  serializationSchema: z.ZodSchema<S>
}): Promise<boolean> {
  log.debug(`Attempting to write data to file: ${filePath}`)

  let serializedData: S

  // 1. Validate and transform the application data to the serialization format
  try {
    serializedData = serializationSchema.parse(data, { reportInput: true })
    log.debug(`Data successfully validated and transformed for serialization for file: ${filePath}`)
  } catch (error) {
    if (error instanceof z.ZodError) {
      log.error(`Data validation/transformation failed before writing to file ${filePath}:`)
      log.error(JSON.stringify(error.issues, null, 2))
    } else if (error instanceof Error) {
      log.error(
        `An unexpected error occurred during data validation/transformation before writing to file ${filePath}: ${error.message}`,
      )
    } else {
      log.error(
        `An unknown error occurred during data validation/transformation before writing to file ${filePath}`,
      )
    }
    return false
  }

  // 2. Serialize the transformed data to a JSON string
  let jsonString: string
  try {
    jsonString = JSON.stringify(serializedData, null, 2) // Use 2-space indentation for readability
    log.debug(`Data successfully serialized to JSON string for file: ${filePath}`)
  } catch (error) {
    if (error instanceof Error) {
      log.error(`Failed to serialize data to JSON for file ${filePath}: ${error.message}`)
    } else {
      log.error(`An unknown error occurred while serializing data to JSON for file ${filePath}`)
    }
    return false
  }

  // 3. Write the JSON string to the file (synchronized to prevent data corruption)
  return await fileOperationsMutex.runExclusive(async () => {
    try {
      await fs.writeFile(filePath, jsonString, "utf-8")
      log.debug(`Successfully wrote data to file: ${filePath}`)
      return true
    } catch (error) {
      if (error instanceof Error) {
        log.error(`Failed to write file ${filePath}: ${error.message}`)
      } else {
        log.error(`An unknown error occurred while writing file ${filePath}`)
      }
      return false
    }
  })
}

// =============================================================================
// SETTINGS FILE OPERATIONS (Consolidated from safe-settings-operations.ts)
// =============================================================================

/**
 * Default settings file structure with current timestamp
 */
function createDefaultSettingsFile(): SettingsFile {
  return {
    userSettings: {
      integrations: {
        imports: {
          supportedSources: ["ticktick", "todoist", "asana", "trello"],
        },
      },
    },
    version: "1.0.0",
    lastModified: new Date(),
  }
}

/**
 * Safely reads and parses the settings file, returning defaults if file doesn't exist or fails validation.
 * This is a convenience wrapper around safeReadJsonFile for settings.
 *
 * @param options - Configuration options for reading the settings file
 * @param options.filePath - Path to the JSON file to read (defaults to DEFAULT_SETTINGS_FILE_PATH)
 * @returns The parsed and validated settings object, or default settings if parsing/validation fails.
 */
export async function safeReadSettingsFile({
  filePath = DEFAULT_SETTINGS_FILE_PATH,
}: { filePath?: string } = {}): Promise<SettingsFile> {
  const result = await safeReadJsonFile({
    filePath,
    schema: SettingsFileSchema,
    defaultValue: createDefaultSettingsFile(),
  })

  // safeReadJsonFile with defaultValue always returns a value
  return result ?? createDefaultSettingsFile()
}

/**
 * Safely writes a settings object to a JSON file with validation and serialization.
 * This is a convenience wrapper around safeWriteJsonFile for settings.
 *
 * @param options - Configuration options for writing the settings file
 * @param options.filePath - Path to the JSON file to write (defaults to DEFAULT_SETTINGS_FILE_PATH)
 * @param options.data - The settings data object to write to the file
 * @returns true if the write operation was successful, false otherwise.
 */
export async function safeWriteSettingsFile({
  filePath = DEFAULT_SETTINGS_FILE_PATH,
  data,
}: {
  filePath?: string
  data: SettingsFile
}): Promise<boolean> {
  return safeWriteJsonFile({
    filePath,
    data,
    serializationSchema: SettingsFileSerializationSchema,
  })
}
