export const fallbackLng = "en"
export const languages = [
  fallbackLng,
  "zh",
  "fr",
  "de",
  "es",
  "nl",
  "ko",
  "ja",
  "it",
  "pt",
] as const
export const defaultNS = "common"
export const cookieName = "i18next"

// Available namespaces
export const namespaces = [
  "common",
  "dialogs",
  "settings",
  "layout",
  "navigation",
  "task",
  "auth",
] as const

export type Language = (typeof languages)[number]

export function isValidLanguage(lng: string): lng is Language {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return languages.includes(lng as Language)
}

export function getOptions(lng = fallbackLng, ns = defaultNS) {
  return {
    // debug: true,
    supportedLngs: languages,
    fallbackLng,
    lng,
    fallbackNS: defaultNS,
    defaultNS,
    ns: Array.isArray(ns) ? ns : [ns],
    // Preload all namespaces for better performance
    load: "all" as const,
    preload: languages,
  }
}
