import fs from "fs/promises"
import { z } from "zod"
import { Mutex } from "async-mutex"
import { log } from "./logger"
import {
  SettingsFile,
  SettingsFileSchema,
  SettingsFileSerialization,
  SettingsFileSerializationSchema,
} from "@/lib/types"
import { DEFAULT_SETTINGS_FILE_PATH } from "@/lib/constants/defaults"

// Create a mutex instance to synchronize all settings file read/write operations
const settingsFileOperationsMutex = new Mutex()

/**
 * Default settings file structure with current timestamp
 */
function createDefaultSettingsFile(): SettingsFile {
  return {
    userSettings: {
      appearance: {
        theme: "system",
        density: "comfortable",
        fontScale: 1.0,
        sidebarPosition: "left",
        language: "en",
        highContrast: false,
        reducedMotion: false,
        showTaskMetadata: true,
        priorityColors: true,
        dateFormat: "MM/dd/yyyy",
      },
      behavior: {
        startView: "inbox",
        weekStartDay: 1, // Monday
        workingDays: [1, 2, 3, 4, 5], // Monday to Friday
        timeFormat: "12h",
        systemLocale: "en-US",
        defaultTaskPriority: 3,
        autoAssignToCurrentProject: false,
        autoFocusTaskTitle: true,
        keyboardShortcuts: true,
        confirmations: {
          deleteTask: true,
          deleteProject: true,
          deleteLabel: true,
          markAllComplete: true,
        },
      },
      notifications: {
        enabled: true,
        channels: {
          push: true,
          email: false,
          desktop: true,
          mobile: false,
        },
        schedule: {
          quietHours: {
            enabled: true,
            start: "22:00",
            end: "08:00",
          },
          weekends: false,
          holidays: false,
        },
        types: {
          reminders: true,
          deadlines: true,
          collaboration: true,
          achievements: true,
          system: false,
        },
        frequency: {
          immediate: true,
          digest: "never",
          digestTime: "18:00",
        },
        sound: {
          enabled: true,
          volume: 50,
        },
      },
      data: {
        autoBackup: {
          enabled: false,
          frequency: "weekly",
          maxBackups: 5,
          includeCompleted: false,
        },
        exportPreferences: {
          format: "json",
          includeMetadata: true,
          includeComments: true,
          includeSubtasks: true,
        },
        storage: {
          maxCacheSizeMB: 50,
          clearCacheOnStartup: false,
          retentionDays: 30,
        },
        sync: {
          autoSync: true,
          syncInterval: 300000, // 5 minutes
          syncOnFocus: true,
          syncOnReconnect: true,
          maxRetries: 3,
          retryDelay: 1000,
        },
      },
      integrations: {
        calendar: {
          enabled: false,
          syncDirection: "oneWay",
          syncCompletedTasks: false,
        },
        imports: {
          supportedSources: ["todoist", "ticktick", "asana", "trello"],
          autoDetectDuplicates: true,
        },
        services: {
          webhooks: {
            enabled: false,
            endpoints: [],
          },
          apiKeys: {},
        },
      },
      productivity: {
        pomodoro: {
          workDuration: 25,
          shortBreakDuration: 5,
          longBreakDuration: 15,
          longBreakInterval: 4,
          autoStartBreaks: false,
          autoStartWork: false,
          soundEnabled: true,
        },
        goals: {
          dailyTaskTarget: 5,
          weeklyTaskTarget: 25,
          trackingEnabled: true,
          showProgress: true,
        },
        analytics: {
          dataCollection: true,
          showMetrics: true,
          metricVisibility: {
            productivity: true,
            streak: true,
            timeSpent: true,
            completion: true,
          },
        },
        focusMode: {
          enabled: false,
          hideDistractions: true,
          minimalUI: true,
          blockNotifications: true,
        },
      },
    },
    version: "1.0.0",
    lastModified: new Date(),
  }
}

/**
 * Safely parses a settings JSON file from the given filepath and validates it against a Zod schema.
 * Handles file access errors, JSON parsing errors, and Zod validation errors.
 * Returns default settings if file doesn't exist or fails validation.
 *
 * @param options - Configuration options for reading the settings file
 * @param options.filePath - Path to the JSON file to read (defaults to DEFAULT_SETTINGS_FILE_PATH)
 * @returns The parsed and validated settings object, or default settings if parsing/validation fails.
 */
export async function safeReadSettingsFile({
  filePath = DEFAULT_SETTINGS_FILE_PATH,
}: { filePath?: string } = {}): Promise<SettingsFile> {
  log.debug(`Attempting to parse settings file: ${filePath}`)
  let fileContent: string

  // 1. Read the file content from the file system (synchronized to prevent race conditions)
  try {
    fileContent = await settingsFileOperationsMutex.runExclusive(async () => {
      return await fs.readFile(filePath, "utf-8")
    })
    log.debug(`Successfully read settings file: ${filePath}`)
  } catch (error) {
    if (error instanceof Error) {
      log.info(
        `Settings file ${filePath} not found or unreadable: ${error.message}. Using defaults.`,
      )
    } else {
      log.info(`Settings file ${filePath} not found or unreadable. Using defaults.`)
    }
    return createDefaultSettingsFile()
  }

  // 2. Parse the file content as JSON
  let jsonData: unknown
  try {
    jsonData = JSON.parse(fileContent)
    log.debug(`Successfully parsed JSON from settings file: ${filePath}`)
  } catch (error) {
    if (error instanceof Error) {
      log.warn(
        `Failed to parse JSON from settings file ${filePath}: ${error.message}. Using defaults.`,
      )
    } else {
      log.warn(`Failed to parse JSON from settings file ${filePath}. Using defaults.`)
    }
    return createDefaultSettingsFile()
  }

  // 3. Validate the parsed JSON against the Zod schema
  try {
    const parsedData = SettingsFileSchema.parse(jsonData, { reportInput: true })
    log.debug(`Successfully parsed and validated settings from file: ${filePath}`)
    return parsedData
  } catch (error) {
    if (error instanceof z.ZodError) {
      log.warn(`Settings validation failed for file ${filePath}:`)
      log.warn(JSON.stringify(error.issues, null, 2))
      log.warn("Using default settings.")
    } else if (error instanceof Error) {
      log.warn(
        `An unexpected error occurred during settings validation for file ${filePath}: ${error.message}. Using defaults.`,
      )
    } else {
      log.warn(
        `An unknown error occurred during settings validation for file ${filePath}. Using defaults.`,
      )
    }
    return createDefaultSettingsFile()
  }
}

/**
 * Safely writes a settings object to a JSON file, validating it against a Zod schema
 * and transforming Date objects to strings for serialization.
 * Handles Zod validation errors, JSON serialization errors, and file writing errors.
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
  log.debug(`Attempting to write settings data to file: ${filePath}`)

  let serializedData: SettingsFileSerialization

  // 1. Validate and transform the application data to the serialization format
  try {
    // This parse operation will take the SettingsFile (with Date objects)
    // and transform date/time fields into strings as defined by SettingsFileSerializationSchema.
    serializedData = SettingsFileSerializationSchema.parse(data, { reportInput: true })
    log.debug(
      `Settings data successfully validated and transformed for serialization for file: ${filePath}`,
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      log.error(
        `Settings data validation/transformation failed before writing to file ${filePath}:`,
      )
      log.error(JSON.stringify(error.issues, null, 2))
    } else if (error instanceof Error) {
      log.error(
        `An unexpected error occurred during settings data validation/transformation before writing to file ${filePath}: ${error.message}`,
      )
    } else {
      log.error(
        `An unknown error occurred during settings data validation/transformation before writing to file ${filePath}`,
      )
    }
    return false
  }

  // 2. Serialize the transformed data to a JSON string
  let jsonString: string
  try {
    jsonString = JSON.stringify(serializedData, null, 2) // Use 2-space indentation for readability
    log.debug(`Settings data successfully serialized to JSON string for file: ${filePath}`)
  } catch (error) {
    if (error instanceof Error) {
      log.error(`Failed to serialize settings data to JSON for file ${filePath}: ${error.message}`)
    } else {
      log.error(
        `An unknown error occurred while serializing settings data to JSON for file ${filePath}`,
      )
    }
    return false
  }

  // 3. Write the JSON string to the file (synchronized to prevent data corruption)
  return await settingsFileOperationsMutex.runExclusive(async () => {
    try {
      await fs.writeFile(filePath, jsonString, "utf-8")
      log.debug(`Successfully wrote settings data to file: ${filePath}`)
      return true
    } catch (error) {
      if (error instanceof Error) {
        log.error(`Failed to write settings file ${filePath}: ${error.message}`)
      } else {
        log.error(`An unknown error occurred while writing settings file ${filePath}`)
      }
      return false
    }
  })
}
