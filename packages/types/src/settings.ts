/**
 * Settings Schemas
 *
 * User settings, notifications, data management, and general preferences.
 */

import { z } from "zod";
import { STANDARD_VIEW_IDS } from "@tasktrove/constants";

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

/**
 * Notification settings schema
 */
export const NotificationSettingsSchema = z.object({
  /** Whether notifications are globally enabled */
  enabled: z.boolean(),
  /** Whether notifications require user interaction to dismiss */
  requireInteraction: z.boolean(),
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
// UI SETTINGS
// =============================================================================

/**
 * UI-specific settings for client display preferences
 */
export const UiSettingsSchema = z.object({
  /**
   * First day of the week
   * 0 = Sunday, 6 = Saturday. Undefined falls back to Sunday.
   */
  weekStartsOn: z
    .union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
    ])
    .optional(),
  /**
   * Whether to display ISO week numbers in calendar surfaces
   */
  showWeekNumber: z.boolean().optional(),
});

export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type UiSettings = z.infer<typeof UiSettingsSchema> & {
  weekStartsOn?: WeekStartsOn;
  showWeekNumber?: boolean;
};

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
  uiSettings: UiSettingsSchema,
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
  uiSettings: UiSettingsSchema.partial().optional(),
});

/**
 * Partial user settings type for updates - allows nested partials
 */
export type PartialUserSettings = z.infer<typeof PartialUserSettingsSchema>;
