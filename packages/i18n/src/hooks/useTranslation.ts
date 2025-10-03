"use client";

/**
 * Re-export react-i18next's useTranslation hook
 *
 * Language management is handled globally by LanguageProvider via i18next.changeLanguage().
 * No need for a custom wrapper - just use the official hook directly.
 *
 * @example
 * ```typescript
 * import { useTranslation } from "@tasktrove/i18n"
 *
 * function MyComponent() {
 *   const { t } = useTranslation("task") // namespace only
 *   return <div>{t("task.title")}</div>
 * }
 * ```
 */
export { useTranslation } from "react-i18next";
