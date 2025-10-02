import type { I18nConfig } from "@tasktrove/i18n"
import { languages, fallbackLng, namespaces, defaultNS, cookieName } from "./settings"

/**
 * App-specific language type
 * Narrowed from generic string to specific supported languages
 */
export type AppLanguage = (typeof languages)[number]

/**
 * App-specific namespace type
 * Narrowed from generic string to specific translation namespaces
 */
export type AppNamespace = (typeof namespaces)[number]

/**
 * Resource loader function for app-specific translation files
 *
 * Loads translations from multiple locations in priority order:
 * 1. Colocated translations (dialogs/, settings/, layout/, navigation/, task/, auth/)
 * 2. Main application translations (lib/i18n/locales/)
 *
 * For English, uses inline defaults and main translations only.
 */
async function loadResources(language: AppLanguage, namespace: AppNamespace): Promise<unknown> {
  // For English, skip colocated files and use inline defaults
  if (language === "en") {
    try {
      const mainTranslations = await import(`@/lib/i18n/locales/${language}/${namespace}.json`)
      return mainTranslations
    } catch (error) {
      // No English file found - let i18next use inline defaults
      throw error
    }
  }

  // For non-English languages, try colocated translations first
  if (namespace === "dialogs") {
    try {
      const dialogTranslations = await import(`@/components/dialogs/i18n/${language}/dialogs.json`)
      return dialogTranslations
    } catch (error) {
      console.warn(`Failed to load colocated dialogs translation for ${language}:`, error)
    }
  }

  if (namespace === "settings") {
    try {
      const settingsTranslations = await import(
        `@/components/dialogs/settings-forms/i18n/${language}/settings.json`
      )
      return settingsTranslations
    } catch (error) {
      console.warn(`Failed to load colocated settings translation for ${language}:`, error)
    }
  }

  if (namespace === "layout") {
    try {
      const layoutTranslations = await import(`@/components/layout/i18n/${language}/layout.json`)
      return layoutTranslations
    } catch (error) {
      console.warn(`Failed to load colocated layout translation for ${language}:`, error)
    }
  }

  if (namespace === "navigation") {
    try {
      const navigationTranslations = await import(
        `@/components/navigation/i18n/${language}/navigation.json`
      )
      return navigationTranslations
    } catch (error) {
      console.warn(`Failed to load colocated navigation translation for ${language}:`, error)
    }
  }

  if (namespace === "task") {
    try {
      const taskTranslations = await import(`@/components/task/i18n/${language}/task.json`)
      return taskTranslations
    } catch (error) {
      console.warn(`Failed to load colocated task translation for ${language}:`, error)
    }
  }

  if (namespace === "auth") {
    try {
      const authTranslations = await import(`@/components/auth/i18n/${language}/auth.json`)
      return authTranslations
    } catch (error) {
      console.warn(`Failed to load colocated auth translation for ${language}:`, error)
    }
  }

  // Fallback to main application translations
  try {
    const mainTranslations = await import(`@/lib/i18n/locales/${language}/${namespace}.json`)
    return mainTranslations
  } catch (error) {
    console.warn(`Failed to load main translation for ${language}/${namespace}:`, error)
    throw error
  }
}

/**
 * i18n configuration for TaskTrove web app
 *
 * This configuration is passed to the LanguageProvider from @tasktrove/i18n.
 * It defines:
 * - Supported languages (10 languages)
 * - Translation namespaces (7 namespaces)
 * - Resource loading strategy (colocated + main translations)
 * - Cookie-based language persistence
 */
export const i18nConfig: I18nConfig<AppLanguage, AppNamespace> = {
  languages,
  fallbackLng,
  namespaces,
  defaultNS,
  cookieName,
  // App-specific resource loading (knows about file paths)
  resourceLoader: loadResources,
}
