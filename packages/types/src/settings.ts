/**
 * Settings Schemas
 *
 * User settings, notifications, data management, and general preferences.
 */

import { z } from "zod";
import { STANDARD_VIEW_IDS } from "@tasktrove/constants";
import { ProjectIdSchema } from "./id";

// =============================================================================
// DATA SETTINGS
// =============================================================================

/**
 * Data management and backup settings
 */
export const DataSettingsSchema = z.object({
  /** Auto backup configuration */
  autoBackup: z.object({
    enabled: z.boolean(),
    /** Time to run daily backup in HH:MM format (24-hour) */
    backupTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    /** Maximum number of backup files to keep (-1 for unlimited) */
    maxBackups: z.number(),
  }),
});

/**
 * Data settings type
 */
export type DataSettings = z.infer<typeof DataSettingsSchema>;

// =============================================================================
// NOTIFICATION SETTINGS
// =============================================================================

// Advanced notification schemas - commented out for future implementation
/*
export const NotificationChannelsSchema = z.object({
  push: z.boolean(),
  email: z.boolean(),
  desktop: z.boolean(),
  mobile: z.boolean(),
})

export const NotificationScheduleSchema = z.object({
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string(),
    end: z.string(),
  }),
  weekends: z.boolean(),
  holidays: z.boolean(),
})

export const NotificationTypesSchema = z.object({
  reminders: z.boolean(),
  deadlines: z.boolean(),
  collaboration: z.boolean(),
  achievements: z.boolean(),
  system: z.boolean(),
})

export const NotificationFrequencySchema = z.object({
  immediate: z.boolean(),
  digest: z.enum(["never", "daily", "weekly"]),
  digestTime: z.string(),
})

export const NotificationSoundSchema = z.object({
  enabled: z.boolean(),
  volume: z.number().min(0).max(100),
})
*/

/**
 * Notification settings schema
 */
export const NotificationSettingsSchema = z.object({
  /** Whether notifications are globally enabled */
  enabled: z.boolean(),
  /** Whether notifications require user interaction to dismiss */
  requireInteraction: z.boolean(),
  /** Notification channels */
  // channels: NotificationChannelsSchema,
  /** Schedule settings */
  // schedule: NotificationScheduleSchema,
  /** Type preferences */
  // types: NotificationTypesSchema,
  /** Frequency settings */
  // frequency: NotificationFrequencySchema,
  /** Sound settings */
  // sound: NotificationSoundSchema,
});

/**
 * Complete notification settings
 */
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;

// =============================================================================
// GENERAL SETTINGS
// =============================================================================

/**
 * General application settings
 */
export const GeneralSettingsSchema = z.object({
  /** Default view on app launch */
  startView: z.union([z.enum(STANDARD_VIEW_IDS), z.literal("lastViewed")]),
  /** Enable/disable sound effects */
  soundEnabled: z.boolean(),
  /** Enable/disable auto-linkification of URLs in task titles */
  linkifyEnabled: z.boolean(),
  /** Enable/disable markdown rendering in task descriptions */
  markdownEnabled: z.boolean(),
  /** Enable/disable popover hover open behavior */
  popoverHoverOpen: z.boolean(),
});

/**
 * General settings type
 */
export type GeneralSettings = z.infer<typeof GeneralSettingsSchema>;

// =============================================================================
// APPEARANCE SETTINGS
// =============================================================================

/**
 * Appearance settings schema - Minimal placeholder for future implementation
 */
export const AppearanceSettingsSchema = z.object({}).optional();

/**
 * Appearance and theme settings interface
 */
export interface AppearanceSettings {
  /** Theme preference */
  theme: "light" | "dark" | "system";
  /** Custom color scheme */
  colorScheme?: string;
  /** Interface density */
  density: "compact" | "comfortable" | "spacious";
  /** Font size multiplier */
  fontScale: number;
  /** Sidebar position */
  sidebarPosition: "left" | "right";
  /** Language preference */
  language: string;
  /** High contrast mode */
  highContrast: boolean;
  /** Reduced motion preference */
  reducedMotion: boolean;
  /** Show task metadata by default */
  showTaskMetadata: boolean;
  /** Priority colors enabled */
  priorityColors: boolean;
  /** Date format preference */
  dateFormat: "MM/dd/yyyy" | "dd/MM/yyyy" | "yyyy-MM-dd";
}

// =============================================================================
// BEHAVIOR SETTINGS
// =============================================================================

/**
 * Behavior and preference settings interface
 */
export interface BehaviorSettings {
  /** Default view on app launch */
  startView:
    | "inbox"
    | "today"
    | "upcoming"
    | "completed"
    | "all"
    | "analytics"
    | "search"
    | "lastViewed";
  /** First day of week */
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, etc.
  /** Working days of the week */
  workingDays: number[];
  /** Time format preference */
  timeFormat: "12h" | "24h";
  /** System locale */
  systemLocale: string;
  /** Default task priority */
  defaultTaskPriority: 1 | 2 | 3 | 4;
  /** Auto-assign new tasks to current project */
  autoAssignToCurrentProject: boolean;
  /** Auto-focus title field when creating tasks */
  autoFocusTaskTitle: boolean;
  /** Default project for new tasks */
  defaultProjectId?: z.infer<typeof ProjectIdSchema>;
  /** Enable keyboard shortcuts */
  keyboardShortcuts: boolean;
  /** Confirmation dialogs */
  confirmations: {
    deleteTask: boolean;
    deleteProject: boolean;
    deleteLabel: boolean;
    markAllComplete: boolean;
  };
}

// =============================================================================
// PRODUCTIVITY SETTINGS
// =============================================================================

/**
 * Productivity and analytics settings interface
 */
export interface ProductivitySettings {
  /** Pomodoro timer configuration */
  pomodoro: {
    workDuration: number; // minutes
    shortBreakDuration: number; // minutes
    longBreakDuration: number; // minutes
    longBreakInterval: number; // number of sessions
    autoStartBreaks: boolean;
    autoStartWork: boolean;
    soundEnabled: boolean;
  };
  /** Goal tracking settings */
  goals: {
    dailyTaskTarget: number;
    weeklyTaskTarget: number;
    trackingEnabled: boolean;
    showProgress: boolean;
  };
  /** Analytics preferences */
  analytics: {
    dataCollection: boolean;
    showMetrics: boolean;
    metricVisibility: {
      productivity: boolean;
      streak: boolean;
      timeSpent: boolean;
      completion: boolean;
    };
  };
  /** Focus mode settings */
  focusMode: {
    enabled: boolean;
    hideDistractions: boolean;
    minimalUI: boolean;
    blockNotifications: boolean;
  };
}

// =============================================================================
// USER SETTINGS
// =============================================================================

/**
 * Complete user settings schema
 */
export const UserSettingsSchema = z.object({
  data: DataSettingsSchema,
  notifications: NotificationSettingsSchema,
  general: GeneralSettingsSchema,
});

/**
 * Complete user settings type
 */
export type UserSettings = z.infer<typeof UserSettingsSchema>;

/**
 * Schema for partial user settings updates
 */
export const PartialUserSettingsSchema = z.object({
  data: DataSettingsSchema.partial().optional(),
  notifications: NotificationSettingsSchema.partial().optional(),
  general: GeneralSettingsSchema.partial().optional(),
  // Optional future settings (not stored yet):
  // appearance: AppearanceSettingsSchema.partial().optional(),
  // productivity: ProductivitySettingsSchema.partial().optional(),
});

/**
 * Partial user settings type for updates - allows nested partials
 */
export type PartialUserSettings = z.infer<typeof PartialUserSettingsSchema>;

// =============================================================================
// NOTIFICATION INTERFACES
// =============================================================================

// Simplified interfaces for basic notification functionality
export interface NotificationChannels {
  /** Desktop notifications */
  desktop: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NotificationSchedule {
  // Simplified - no complex scheduling for now
}

export interface NotificationTypes {
  /** Deadline notifications */
  deadlines: boolean;
}

/**
 * Notification frequency settings
 */
export interface NotificationFrequency {
  /** Send notifications immediately */
  immediate: boolean;
  /** Digest frequency */
  digest: "never" | "daily" | "weekly";
  /** Time to send digest (HH:MM format) */
  digestTime: string;
}

/**
 * Sound settings for notifications
 */
export interface NotificationSound {
  /** Whether sound is enabled */
  enabled: boolean;
  /** Volume level (0-100) */
  volume: number;
  /** Custom sound file path */
  soundFile?: string;
}
