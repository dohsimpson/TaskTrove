/**
 * Notification Types
 *
 * Re-exports notification types from settings module.
 * All notification-related types are defined in settings.ts to keep them colocated
 * with NotificationSettingsSchema.
 */

export type {
  NotificationChannels,
  NotificationSchedule,
  NotificationTypes,
  NotificationFrequency,
  NotificationSound,
} from "./settings";
