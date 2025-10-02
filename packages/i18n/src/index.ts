/**
 * @tasktrove/i18n
 *
 * Type-safe internationalization package for TaskTrove applications
 */

// Export all type definitions
export type { Language, I18nConfig, UseTranslationOptions } from "./types";

// Export all hooks
export { useTranslation } from "./hooks";

// Export providers and hooks
export { LanguageProvider, useLanguage } from "./providers/LanguageProvider";
