import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type {
  UserSettings,
  AppearanceSettings,
  BehaviorSettings,
  DataSettings,
  IntegrationSettings,
  ProductivitySettings,
  NotificationSettings,
} from "@/lib/types"

/**
 * Default appearance settings
 */
const defaultAppearanceSettings: AppearanceSettings = {
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
}

/**
 * Default behavior settings
 */
const defaultBehaviorSettings: BehaviorSettings = {
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
}

/**
 * Default notification settings
 */
const defaultNotificationSettings: NotificationSettings = {
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
}

/**
 * Default data settings
 */
const defaultDataSettings: DataSettings = {
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
}

/**
 * Default integration settings
 */
const defaultIntegrationSettings: IntegrationSettings = {
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
}

/**
 * Default productivity settings
 */
const defaultProductivitySettings: ProductivitySettings = {
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
}

// =============================================================================
// SETTINGS ATOMS WITH STORAGE
// =============================================================================

/**
 * Appearance settings atom with localStorage persistence
 */
export const appearanceSettingsAtom = atomWithStorage<AppearanceSettings>(
  "tasktrove-appearance-settings",
  defaultAppearanceSettings,
)

/**
 * Behavior settings atom with localStorage persistence
 */
export const behaviorSettingsAtom = atomWithStorage<BehaviorSettings>(
  "tasktrove-behavior-settings",
  defaultBehaviorSettings,
)

/**
 * Notification settings atom with localStorage persistence
 */
export const notificationSettingsAtom = atomWithStorage<NotificationSettings>(
  "tasktrove-notification-settings",
  defaultNotificationSettings,
)

/**
 * Data settings atom with localStorage persistence
 */
export const dataSettingsAtom = atomWithStorage<DataSettings>(
  "tasktrove-data-settings",
  defaultDataSettings,
)

/**
 * Integration settings atom with localStorage persistence
 */
export const integrationSettingsAtom = atomWithStorage<IntegrationSettings>(
  "tasktrove-integration-settings",
  defaultIntegrationSettings,
)

/**
 * Productivity settings atom with localStorage persistence
 */
export const productivitySettingsAtom = atomWithStorage<ProductivitySettings>(
  "tasktrove-productivity-settings",
  defaultProductivitySettings,
)

/**
 * Complete user settings atom - derived from individual setting atoms
 */
export const userSettingsAtom = atom<UserSettings>((get) => ({
  appearance: get(appearanceSettingsAtom),
  behavior: get(behaviorSettingsAtom),
  notifications: get(notificationSettingsAtom),
  data: get(dataSettingsAtom),
  integrations: get(integrationSettingsAtom),
  productivity: get(productivitySettingsAtom),
}))

// =============================================================================
// APPEARANCE ACTION ATOMS
// =============================================================================

/**
 * Update theme setting
 */
export const updateThemeAtom = atom(null, (get, set, theme: AppearanceSettings["theme"]) => {
  const settings = get(appearanceSettingsAtom)
  set(appearanceSettingsAtom, { ...settings, theme })
})

/**
 * Update interface density
 */
export const updateDensityAtom = atom(null, (get, set, density: AppearanceSettings["density"]) => {
  const settings = get(appearanceSettingsAtom)
  set(appearanceSettingsAtom, { ...settings, density })
})

/**
 * Update font scale
 */
export const updateFontScaleAtom = atom(null, (get, set, fontScale: number) => {
  const settings = get(appearanceSettingsAtom)
  set(appearanceSettingsAtom, {
    ...settings,
    fontScale: Math.max(0.8, Math.min(1.5, fontScale)),
  })
})

/**
 * Update language
 */
export const updateLanguageAtom = atom(null, (get, set, language: string) => {
  const settings = get(appearanceSettingsAtom)
  set(appearanceSettingsAtom, { ...settings, language })
})

/**
 * Toggle high contrast mode
 */
export const toggleHighContrastAtom = atom(null, (get, set) => {
  const settings = get(appearanceSettingsAtom)
  set(appearanceSettingsAtom, {
    ...settings,
    highContrast: !settings.highContrast,
  })
})

// =============================================================================
// BEHAVIOR ACTION ATOMS
// =============================================================================

/**
 * Update start view setting
 */
export const updateStartViewAtom = atom(null, (get, set, startView: string) => {
  const settings = get(behaviorSettingsAtom)
  if (
    startView === "inbox" ||
    startView === "today" ||
    startView === "upcoming" ||
    startView === "all" ||
    startView === "analytics" ||
    startView === "lastViewed"
  ) {
    set(behaviorSettingsAtom, { ...settings, startView })
  }
})

/**
 * Update week start day
 */
export const updateWeekStartDayAtom = atom(null, (get, set, weekStartDay: number) => {
  const settings = get(behaviorSettingsAtom)
  if (
    weekStartDay === 0 ||
    weekStartDay === 1 ||
    weekStartDay === 2 ||
    weekStartDay === 3 ||
    weekStartDay === 4 ||
    weekStartDay === 5 ||
    weekStartDay === 6
  ) {
    set(behaviorSettingsAtom, { ...settings, weekStartDay })
  }
})

/**
 * Update default task priority
 */
export const updateDefaultPriorityAtom = atom(null, (get, set, defaultTaskPriority: number) => {
  const settings = get(behaviorSettingsAtom)
  if (
    defaultTaskPriority === 1 ||
    defaultTaskPriority === 2 ||
    defaultTaskPriority === 3 ||
    defaultTaskPriority === 4
  ) {
    set(behaviorSettingsAtom, { ...settings, defaultTaskPriority })
  }
})

/**
 * Toggle keyboard shortcuts
 */
export const toggleKeyboardShortcutsAtom = atom(null, (get, set) => {
  const settings = get(behaviorSettingsAtom)
  set(behaviorSettingsAtom, {
    ...settings,
    keyboardShortcuts: !settings.keyboardShortcuts,
  })
})

// =============================================================================
// PRODUCTIVITY ACTION ATOMS
// =============================================================================

/**
 * Update pomodoro work duration
 */
export const updatePomodoroWorkDurationAtom = atom(null, (get, set, workDuration: number) => {
  const settings = get(productivitySettingsAtom)
  set(productivitySettingsAtom, {
    ...settings,
    pomodoro: { ...settings.pomodoro, workDuration },
  })
})

/**
 * Update daily task target
 */
export const updateDailyTaskTargetAtom = atom(null, (get, set, dailyTaskTarget: number) => {
  const settings = get(productivitySettingsAtom)
  set(productivitySettingsAtom, {
    ...settings,
    goals: { ...settings.goals, dailyTaskTarget },
  })
})

/**
 * Toggle focus mode
 */
export const toggleFocusModeAtom = atom(null, (get, set) => {
  const settings = get(productivitySettingsAtom)
  set(productivitySettingsAtom, {
    ...settings,
    focusMode: { ...settings.focusMode, enabled: !settings.focusMode.enabled },
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
  (get, set, updates: Partial<AppearanceSettings>) => {
    const settings = get(appearanceSettingsAtom)
    set(appearanceSettingsAtom, { ...settings, ...updates })
  },
)

/**
 * Generic action to update behavior settings
 */
export const updateBehaviorSettingsAtom = atom(
  null,
  (get, set, updates: Partial<BehaviorSettings>) => {
    const settings = get(behaviorSettingsAtom)
    set(behaviorSettingsAtom, { ...settings, ...updates })
  },
)

/**
 * Generic action to update notification settings
 */
export const updateNotificationSettingsAtom = atom(
  null,
  (get, set, updates: Partial<NotificationSettings>) => {
    const settings = get(notificationSettingsAtom)
    set(notificationSettingsAtom, { ...settings, ...updates })
  },
)

/**
 * Generic action to update data settings
 */
export const updateDataSettingsAtom = atom(null, (get, set, updates: Partial<DataSettings>) => {
  const settings = get(dataSettingsAtom)
  set(dataSettingsAtom, { ...settings, ...updates })
})

/**
 * Generic action to update integration settings
 */
export const updateIntegrationSettingsAtom = atom(
  null,
  (get, set, updates: Partial<IntegrationSettings>) => {
    const settings = get(integrationSettingsAtom)
    set(integrationSettingsAtom, { ...settings, ...updates })
  },
)

/**
 * Generic action to update productivity settings
 */
export const updateProductivitySettingsAtom = atom(
  null,
  (get, set, updates: Partial<ProductivitySettings>) => {
    const settings = get(productivitySettingsAtom)
    set(productivitySettingsAtom, { ...settings, ...updates })
  },
)

/**
 * Reset all settings to defaults
 */
export const resetAllSettingsAtom = atom(null, (get, set) => {
  set(appearanceSettingsAtom, defaultAppearanceSettings)
  set(behaviorSettingsAtom, defaultBehaviorSettings)
  set(notificationSettingsAtom, defaultNotificationSettings)
  set(dataSettingsAtom, defaultDataSettings)
  set(integrationSettingsAtom, defaultIntegrationSettings)
  set(productivitySettingsAtom, defaultProductivitySettings)
})

/**
 * Export settings for backup
 */
export const exportSettingsAtom = atom<UserSettings>((get) => get(userSettingsAtom))

/**
 * Import settings from backup
 */
export const importSettingsAtom = atom(null, (get, set, settings: Partial<UserSettings>) => {
  if (settings.appearance) {
    set(appearanceSettingsAtom, { ...defaultAppearanceSettings, ...settings.appearance })
  }
  if (settings.behavior) {
    set(behaviorSettingsAtom, { ...defaultBehaviorSettings, ...settings.behavior })
  }
  if (settings.notifications) {
    set(notificationSettingsAtom, { ...defaultNotificationSettings, ...settings.notifications })
  }
  if (settings.data) {
    set(dataSettingsAtom, { ...defaultDataSettings, ...settings.data })
  }
  if (settings.integrations) {
    set(integrationSettingsAtom, { ...defaultIntegrationSettings, ...settings.integrations })
  }
  if (settings.productivity) {
    set(productivitySettingsAtom, { ...defaultProductivitySettings, ...settings.productivity })
  }
})
