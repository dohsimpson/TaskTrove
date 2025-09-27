import resourcesToBackend from "i18next-resources-to-backend"

/**
 * Combined resource backend that loads translations from multiple locations:
 * 1. Main application translations from ./locales/
 * 2. Colocated dialog translations from components/dialogs/
 * 3. Colocated settings translations from components/dialogs/settings-forms/
 * 4. Colocated layout translations from components/layout/
 * 5. Colocated navigation translations from components/navigation/
 * 6. Colocated task translations from components/task/
 * 7. Colocated auth translations from components/auth/
 */
export function createCombinedResourceBackend() {
  return resourcesToBackend(async (language: string, namespace: string) => {
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
        const dialogTranslations = await import(
          `@/components/dialogs/i18n/${language}/dialogs.json`
        )
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
  })
}
