/**
 * Notification Types
 *
 * Re-exports notification types from settings module.
 * Notification-related types are defined beside UserSettingsSchema to keep them
 * colocated with persisted settings.
 */

export { NotificationSettingsSchema } from "./settings";
export type { NotificationSettings } from "./settings";
