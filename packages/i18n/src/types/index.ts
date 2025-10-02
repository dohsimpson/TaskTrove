/**
 * Type definitions for the @tasktrove/i18n package
 *
 * These types provide a type-safe internationalization (i18n) layer
 * for TaskTrove applications using i18next and react-i18next.
 */

/**
 * Represents a language code
 *
 * Simple string type that can be narrowed by applications
 * to specific language codes (e.g., "en" | "zh" | "fr")
 */
export type Language = string;

/**
 * Configuration object for i18n initialization
 *
 * This interface defines the core configuration that applications
 * must provide to set up internationalization support.
 *
 * @template L - Language type (defaults to string, can be narrowed to specific codes)
 * @template NS - Namespace type (defaults to string, can be narrowed to specific namespaces)
 *
 * @example
 * ```typescript
 * const config: I18nConfig<"en" | "zh", "common" | "task"> = {
 *   languages: ["en", "zh"],
 *   fallbackLng: "en",
 *   namespaces: ["common", "task"],
 *   defaultNS: "common",
 *   cookieName: "tasktrove_language",
 *   resourceLoader: async (lang, ns) => {
 *     return await import(`./locales/${lang}/${ns}.json`)
 *   }
 * }
 * ```
 */
export interface I18nConfig<
  L extends string = string,
  NS extends string = string,
> {
  /**
   * Array of supported language codes
   *
   * Use readonly to prevent accidental mutations
   * @example ["en", "zh", "fr"]
   */
  readonly languages: readonly L[];

  /**
   * Default fallback language code
   *
   * This language will be used when:
   * - User's preferred language is not available
   * - A translation key is missing in the current language
   *
   * @example "en"
   */
  fallbackLng: L;

  /**
   * Array of translation namespaces
   *
   * Namespaces allow organizing translations by feature/domain
   * @example ["common", "task", "project", "settings"]
   */
  readonly namespaces: readonly NS[];

  /**
   * Default namespace to use when none is specified
   *
   * @example "common"
   */
  defaultNS: NS;

  /**
   * Optional cookie name for language persistence
   *
   * If provided, the selected language will be stored in a cookie
   * with this name for persistence across sessions.
   *
   * @example "tasktrove_language"
   */
  cookieName?: string;

  /**
   * Function to load translation resources
   *
   * Applications must provide this function to tell the package
   * how to load translation files. This allows flexibility in
   * where translations are stored (local files, API, etc.)
   *
   * @param language - The language code to load
   * @param namespace - The namespace to load
   * @returns Promise resolving to the translation resource object
   *
   * @example
   * ```typescript
   * resourceLoader: async (lang, ns) => {
   *   return await import(`./locales/${lang}/${ns}.json`)
   * }
   * ```
   */
  resourceLoader: (language: L, namespace: NS) => Promise<unknown>;
}

/**
 * Options for the useTranslation hook
 *
 * These options configure the behavior of the useTranslation hook
 * from react-i18next.
 *
 * @example
 * ```typescript
 * const { t } = useTranslation("task", { keyPrefix: "actions" });
 * // t("create") will look for "actions.create" in the "task" namespace
 * ```
 */
export interface UseTranslationOptions {
  /**
   * Optional key prefix for all translation keys
   *
   * When specified, this prefix is automatically prepended to all
   * translation keys used with the `t` function, reducing repetition.
   *
   * @example
   * ```typescript
   * // With keyPrefix: "task.actions"
   * t("create") // looks for "task.actions.create"
   * t("edit")   // looks for "task.actions.edit"
   * ```
   */
  keyPrefix?: string;
}
