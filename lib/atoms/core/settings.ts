/**
 * Settings-specific atoms for managing user settings persistence
 */

import { atom } from "jotai"
import { atomWithQuery, atomWithMutation } from "jotai-tanstack-query"
import { toast } from "sonner"
import { log } from "@/lib/utils/logger"
import {
  UserSettings,
  PartialUserSettings,
  UpdateSettingsRequest,
  SettingsResponse,
  SettingsFile,
  SettingsFileSchema,
  UpdateSettingsRequestSchema,
  SettingsResponseSchema,
} from "@/lib/types"
import { queryClientAtom } from "jotai-tanstack-query"

/**
 * Query atom for fetching settings from API
 */
export const settingsQueryAtom = atomWithQuery(() => ({
  queryKey: ["settings"],
  queryFn: async (): Promise<SettingsFile> => {
    // Check if we're in a test environment
    if (typeof window === "undefined" || process.env.NODE_ENV === "test") {
      log.info({ module: "test" }, "Test environment: Using default settings")
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
            weekStartDay: 1,
            workingDays: [1, 2, 3, 4, 5],
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
              syncInterval: 300000,
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

    const response = await fetch("/api/settings")

    if (!response.ok) {
      throw new Error(`Failed to fetch settings: ${response.statusText}`)
    }

    const data = await response.json()
    const parsedResult = SettingsFileSchema.safeParse(data, { reportInput: true })

    if (!parsedResult.success) {
      console.error(parsedResult.error)
      throw new Error(`Failed to parse settings: ${parsedResult.error.message}`)
    }

    return parsedResult.data
  },
  staleTime: 5000, // Consider data fresh for 5 seconds
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchInterval: false,
}))
settingsQueryAtom.debugLabel = "settingsQueryAtom"

/**
 * Mutation atom for updating settings
 */
export const updateSettingsMutationAtom = atomWithMutation(() => ({
  mutationFn: async (variables: UpdateSettingsRequest): Promise<SettingsResponse> => {
    // Test environment check
    if (typeof window === "undefined" || process.env.NODE_ENV === "test") {
      log.info({ module: "test" }, "Test environment: Simulating settings update")
      return {
        success: true,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        settings: variables.settings as UserSettings, // In test, just return what was sent
        message: "Settings updated successfully (test mode)",
      }
    }

    // Input validation
    const serialized = UpdateSettingsRequestSchema.safeParse(variables, { reportInput: true })
    if (!serialized.success) {
      throw new Error(
        `Failed to serialize settings update data: ${serialized.error?.message || "Unknown validation error"}`,
      )
    }

    // API request
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(serialized.data),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to update settings: ${response.statusText} - ${errorText}`)
    }

    // Response validation
    const data = await response.json()
    const responseValidation = SettingsResponseSchema.safeParse(data, { reportInput: true })
    if (!responseValidation.success) {
      throw new Error(
        `Failed to parse settings update response: ${responseValidation.error?.message || "Unknown validation error"}`,
      )
    }

    return responseValidation.data
  },
  onSuccess: () => {
    log.info({ module: "settings" }, "Settings updated via API")
    toast.success("Settings updated successfully")
  },
  onError: (error: Error) => {
    log.error({ error, module: "settings" }, "Failed to update settings via API")
    toast.error(`Failed to update settings: ${error.message}`)
  },
}))
updateSettingsMutationAtom.debugLabel = "updateSettingsMutationAtom"

/**
 * Base settings atom - provides read access to current settings
 */
export const settingsAtom = atom((get) => {
  const result = get(settingsQueryAtom)
  if ("data" in result && result.data) {
    return result.data.userSettings
  }
  // Return default settings if query is loading or failed
  return {
    appearance: {
      theme: "system" as const,
      density: "comfortable" as const,
      fontScale: 1.0,
      sidebarPosition: "left" as const,
      language: "en",
      highContrast: false,
      reducedMotion: false,
      showTaskMetadata: true,
      priorityColors: true,
      dateFormat: "MM/dd/yyyy" as const,
    },
    behavior: {
      startView: "inbox" as const,
      weekStartDay: 1 as const,
      workingDays: [1, 2, 3, 4, 5],
      timeFormat: "12h" as const,
      systemLocale: "en-US",
      defaultTaskPriority: 3 as const,
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
        digest: "never" as const,
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
        frequency: "weekly" as const,
        maxBackups: 5,
        includeCompleted: false,
      },
      exportPreferences: {
        format: "json" as const,
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
        syncInterval: 300000,
        syncOnFocus: true,
        syncOnReconnect: true,
        maxRetries: 3,
        retryDelay: 1000,
      },
    },
    integrations: {
      calendar: {
        enabled: false,
        syncDirection: "oneWay" as const,
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
  }
})
settingsAtom.debugLabel = "settingsAtom"

/**
 * Action atom for updating settings
 */
export const updateSettingsAtom = atom(
  null,
  async (get, set, partialSettings: PartialUserSettings) => {
    try {
      const updateMutation = get(updateSettingsMutationAtom)

      await updateMutation.mutateAsync({ settings: partialSettings })

      // Invalidate settings query to refetch fresh data
      // This ensures the UI reflects the latest server state
      const queryClient = get(queryClientAtom)
      queryClient.invalidateQueries({ queryKey: ["settings"] })

      log.info({ module: "settings" }, "Settings updated, invalidating query cache")
    } catch (error) {
      log.error({ error, module: "settings" }, "Error in updateSettingsAtom")
      throw error
    }
  },
)
updateSettingsAtom.debugLabel = "updateSettingsAtom"
