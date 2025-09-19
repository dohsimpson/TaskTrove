import { headers } from "next/headers"
import { fallbackLng, type Language, isValidLanguage } from "./settings"

export async function getLanguage(): Promise<Language> {
  const headersList = await headers()
  const lng = headersList.get("x-lng")

  // Validate that the language is in our supported languages
  if (lng && isValidLanguage(lng)) {
    return lng
  }

  return fallbackLng
}
