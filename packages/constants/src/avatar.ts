/**
 * Avatar validation constants for TaskTrove applications
 */

/**
 * Supported image MIME types for avatars
 */
export const SUPPORTED_AVATAR_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
] as const;

/**
 * Regular expression to validate base64 encoded image data URLs
 */
export const AVATAR_DATA_URL_REGEX =
  /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/]+=*$/;

/**
 * Type for supported avatar MIME types
 */
export type SupportedAvatarMimeType =
  (typeof SUPPORTED_AVATAR_MIME_TYPES)[number];
