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
      // Minimal settings for test environment - only imports supported
      return {
        userSettings: {
          integrations: {
            imports: {
              supportedSources: ["ticktick", "todoist", "asana", "trello"],
            },
          },
          // Future settings will be added here when implemented
          // appearance: { ... },
          // behavior: { ... },
          // notifications: { ... },
          // data: { ... },
          // productivity: { ... },
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
  // Return minimal default settings - only imports supported
  return {
    integrations: {
      imports: {
        supportedSources: ["ticktick", "todoist", "asana", "trello"],
      },
    },
    // Future settings will be added here when implemented:
    // appearance: { ... },
    // behavior: { ... },
    // notifications: { ... },
    // data: { ... },
    // productivity: { ... },
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
