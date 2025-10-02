"use client";

import { useTranslation as useI18nextTranslation } from "react-i18next";
import type { FlatNamespace, KeyPrefix } from "i18next";
import type { UseTranslationOptions } from "react-i18next";

/**
 * Translation hook matching current TaskTrove API
 * IMPORTANT: Language parameter comes FIRST (preserves current API)
 *
 * This is a thin wrapper around react-i18next's useTranslation hook.
 * The lng parameter is accepted for API compatibility but not used -
 * language management is handled by LanguageProvider.
 *
 * @param lng - Language code (accepted for API compatibility, not used)
 * @param ns - Namespace (e.g., "task", "common")
 * @param options - Additional i18next options
 * @returns Translation object with t function and i18n instance
 *
 * @example
 * ```typescript
 * const { language } = useLanguage()
 * const { t } = useTranslation(language, "task")
 * return <div>{t("task.title")}</div>
 * ```
 */
export function useTranslation<
  Ns extends FlatNamespace,
  KPrefix extends KeyPrefix<FlatNamespace> = undefined,
>(
  lng: string, // ← Language FIRST (matches current API)
  ns?: Ns,
  options?: UseTranslationOptions<KPrefix>,
) {
  // Thin wrapper for API compatibility - language management happens in LanguageProvider
  // Avoids re-render loops that occurred with useEffect syncing logic
  return useI18nextTranslation(ns, options);
}
