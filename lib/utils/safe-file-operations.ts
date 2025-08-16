import fs from "fs/promises"
import { z } from "zod"
import { Mutex } from "async-mutex"
import { log } from "./logger"
import {
  DataFile,
  DataFileSchema,
  DataFileSerialization,
  DataFileSerializationSchema,
} from "@/lib/types"
import { DEFAULT_DATA_FILE_PATH } from "@/lib/constants/defaults"

// Create a mutex instance to synchronize all file read/write operations
const fileOperationsMutex = new Mutex()

/**
 * Safely parses a JSON file from the given filepath and validates it against a Zod schema.
 * Handles file access errors, JSON parsing errors, and Zod validation errors.
 *
 * @param options - Configuration options for reading the data file
 * @param options.filePath - Path to the JSON file to read (defaults to DEFAULT_DATA_FILE_PATH)
 * @returns The parsed and validated object, or undefined if parsing/validation fails.
 */
export async function safeReadDataFile({
  filePath = DEFAULT_DATA_FILE_PATH,
}: { filePath?: string } = {}): Promise<DataFile | undefined> {
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
      log.error(`Failed to read file ${filePath}: ${error.message}`)
    } else {
      log.error(`An unknown error occurred while reading file ${filePath}`)
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
      log.error(`Failed to parse JSON from file ${filePath}: ${error.message}`)
    } else {
      log.error(`An unknown error occurred while parsing JSON from file ${filePath}`)
    }
    return undefined
  }

  // 3. Validate the parsed JSON against the Zod schema
  try {
    const parsedData = DataFileSchema.parse(jsonData, { reportInput: true })
    log.debug(`Successfully parsed and validated data from file: ${filePath}`)
    return parsedData
  } catch (error) {
    if (error instanceof z.ZodError) {
      log.error(`Zod validation failed for file ${filePath}:`)
      log.error(JSON.stringify(error.issues, null, 2))
    } else if (error instanceof Error) {
      log.error(
        `An unexpected error occurred during Zod validation for file ${filePath}: ${error.message}`,
      )
    } else {
      log.error(`An unknown error occurred during Zod validation for file ${filePath}`)
    }
    return undefined
  }
}

/**
 * Safely writes a JavaScript object to a JSON file, validating it against a Zod schema
 * and transforming Date objects to strings for serialization.
 * Handles Zod validation errors, JSON serialization errors, and file writing errors.
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
  log.debug(`Attempting to write data to file: ${filePath}`)

  let serializedData: DataFileSerialization

  // 1. Validate and transform the application data to the serialization format
  try {
    // This parse operation will take the DataFile (with Date objects)
    // and transform date/time fields into strings as defined by DataFileSerializationSchema.
    serializedData = DataFileSerializationSchema.parse(data, { reportInput: true })
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
