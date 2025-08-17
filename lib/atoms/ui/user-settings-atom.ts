import { atom } from "jotai"
import type {
  UserSettings,
  PartialUserSettings,
  AppearanceSettings,
  BehaviorSettings,
  DataSettings,
  IntegrationSettings,
  ProductivitySettings,
  NotificationSettings,
  TaskPriority,
} from "@/lib/types"
import { settingsAtom, updateSettingsAtom } from "@/lib/atoms/core/settings"

// =============================================================================
// DERIVED SETTINGS ATOMS
// =============================================================================

/**
 * Appearance settings atom with API persistence
 */
export const appearanceSettingsAtom = atom(
  (get) => get(settingsAtom).appearance,
  async (get, set, updates: Partial<AppearanceSettings>) => {
    await set(updateSettingsAtom, { appearance: updates })
  },
)

/**
 * Behavior settings atom with API persistence
 */
export const behaviorSettingsAtom = atom(
  (get) => get(settingsAtom).behavior,
  async (get, set, updates: Partial<BehaviorSettings>) => {
    await set(updateSettingsAtom, { behavior: updates })
  },
)

/**
 * Notification settings atom with API persistence
 */
export const notificationSettingsAtom = atom(
  (get) => get(settingsAtom).notifications,
  async (get, set, updates: Partial<NotificationSettings>) => {
    await set(updateSettingsAtom, { notifications: updates })
  },
)

/**
 * Data settings atom with API persistence
 */
export const dataSettingsAtom = atom(
  (get) => get(settingsAtom).data,
  async (get, set, updates: Partial<DataSettings>) => {
    await set(updateSettingsAtom, { data: updates })
  },
)

/**
 * Integration settings atom with API persistence
 */
export const integrationSettingsAtom = atom(
  (get) => get(settingsAtom).integrations,
  async (get, set, updates: Partial<IntegrationSettings>) => {
    await set(updateSettingsAtom, { integrations: updates })
  },
)

/**
 * Productivity settings atom with API persistence
 */
export const productivitySettingsAtom = atom(
  (get) => get(settingsAtom).productivity,
  async (get, set, updates: Partial<ProductivitySettings>) => {
    await set(updateSettingsAtom, { productivity: updates })
  },
)

/**
 * Complete user settings atom - derived from individual setting atoms
 */
export const userSettingsAtom = atom<UserSettings>((get) => get(settingsAtom))

// =============================================================================
// APPEARANCE ACTION ATOMS
// =============================================================================

/**
 * Update theme setting
 */
export const updateThemeAtom = atom(null, async (get, set, theme: AppearanceSettings["theme"]) => {
  await set(updateSettingsAtom, { appearance: { theme } })
})

/**
 * Update interface density
 */
export const updateDensityAtom = atom(
  null,
  async (get, set, density: AppearanceSettings["density"]) => {
    await set(updateSettingsAtom, { appearance: { density } })
  },
)

/**
 * Update font scale
 */
export const updateFontScaleAtom = atom(null, async (get, set, fontScale: number) => {
  await set(updateSettingsAtom, {
    appearance: {
      fontScale: Math.max(0.8, Math.min(1.5, fontScale)),
    },
  })
})

/**
 * Update language
 */
export const updateLanguageAtom = atom(null, async (get, set, language: string) => {
  await set(updateSettingsAtom, { appearance: { language } })
})

/**
 * Toggle high contrast mode
 */
export const toggleHighContrastAtom = atom(null, async (get, set) => {
  const currentSettings = get(settingsAtom)
  await set(updateSettingsAtom, {
    appearance: {
      highContrast: !currentSettings.appearance.highContrast,
    },
  })
})

// =============================================================================
// BEHAVIOR ACTION ATOMS
// =============================================================================

/**
 * Update start view setting
 */
export const updateStartViewAtom = atom(null, async (get, set, startView: string) => {
  if (
    startView === "inbox" ||
    startView === "today" ||
    startView === "upcoming" ||
    startView === "all" ||
    startView === "analytics" ||
    startView === "lastViewed"
  ) {
    await set(updateSettingsAtom, { behavior: { startView } })
  }
})

/**
 * Update week start day
 */
export const updateWeekStartDayAtom = atom(
  null,
  async (get, set, weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6) => {
    await set(updateSettingsAtom, { behavior: { weekStartDay } })
  },
)

/**
 * Update default task priority
 */
export const updateDefaultPriorityAtom = atom(
  null,
  async (get, set, defaultTaskPriority: TaskPriority) => {
    await set(updateSettingsAtom, { behavior: { defaultTaskPriority } })
  },
)

/**
 * Toggle keyboard shortcuts
 */
export const toggleKeyboardShortcutsAtom = atom(null, async (get, set) => {
  const currentSettings = get(settingsAtom)
  await set(updateSettingsAtom, {
    behavior: {
      keyboardShortcuts: !currentSettings.behavior.keyboardShortcuts,
    },
  })
})

// =============================================================================
// PRODUCTIVITY ACTION ATOMS
// =============================================================================

/**
 * Update pomodoro work duration
 */
export const updatePomodoroWorkDurationAtom = atom(null, async (get, set, workDuration: number) => {
  const currentSettings = get(settingsAtom)
  await set(updateSettingsAtom, {
    productivity: {
      pomodoro: {
        ...currentSettings.productivity.pomodoro,
        workDuration,
      },
    },
  })
})

/**
 * Update daily task target
 */
export const updateDailyTaskTargetAtom = atom(null, async (get, set, dailyTaskTarget: number) => {
  const currentSettings = get(settingsAtom)
  await set(updateSettingsAtom, {
    productivity: {
      goals: {
        ...currentSettings.productivity.goals,
        dailyTaskTarget,
      },
    },
  })
})

/**
 * Toggle focus mode
 */
export const toggleFocusModeAtom = atom(null, async (get, set) => {
  const currentSettings = get(settingsAtom)
  await set(updateSettingsAtom, {
    productivity: {
      focusMode: {
        ...currentSettings.productivity.focusMode,
        enabled: !currentSettings.productivity.focusMode.enabled,
      },
    },
  })
})

// =============================================================================
// GENERIC UPDATE ACTIONS
// =============================================================================

/**
 * Generic action to update appearance settings
 */
export const updateAppearanceSettingsAtom = atom(
  null,
  async (get, set, updates: Partial<AppearanceSettings>) => {
    await set(updateSettingsAtom, { appearance: updates })
  },
)

/**
 * Generic action to update behavior settings
 */
export const updateBehaviorSettingsAtom = atom(
  null,
  async (get, set, updates: Partial<BehaviorSettings>) => {
    await set(updateSettingsAtom, { behavior: updates })
  },
)

/**
 * Generic action to update notification settings
 */
export const updateNotificationSettingsAtom = atom(
  null,
  async (get, set, updates: Partial<NotificationSettings>) => {
    await set(updateSettingsAtom, { notifications: updates })
  },
)

/**
 * Generic action to update data settings
 */
export const updateDataSettingsAtom = atom(
  null,
  async (get, set, updates: Partial<DataSettings>) => {
    await set(updateSettingsAtom, { data: updates })
  },
)

/**
 * Generic action to update integration settings
 */
export const updateIntegrationSettingsAtom = atom(
  null,
  async (get, set, updates: Partial<IntegrationSettings>) => {
    await set(updateSettingsAtom, { integrations: updates })
  },
)

/**
 * Generic action to update productivity settings
 */
export const updateProductivitySettingsAtom = atom(
  null,
  async (get, set, updates: Partial<ProductivitySettings>) => {
    await set(updateSettingsAtom, { productivity: updates })
  },
)

/**
 * Reset all settings to defaults
 */
export const resetAllSettingsAtom = atom(null, async (get, set) => {
  await set(updateSettingsAtom, {
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
  })
})

/**
 * Export settings for backup
 */
export const exportSettingsAtom = atom<UserSettings>((get) => get(userSettingsAtom))

/**
 * Import settings from backup
 */
export const importSettingsAtom = atom(null, async (get, set, settings: PartialUserSettings) => {
  await set(updateSettingsAtom, settings)
})
