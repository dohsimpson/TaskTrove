import { defineConfig } from "i18next-cli"
import { languages, fallbackLng, namespaces, defaultNS } from "@/lib/i18n/settings"

const NAMESPACE_DIRECTORIES: Record<string, string> = {
  common: "lib/i18n/locales",
  dialogs: "components/dialogs/i18n",
  settings: "components/dialogs/settings-forms/i18n",
  layout: "components/layout/i18n",
  navigation: "components/navigation/i18n",
  task: "components/task/i18n",
  auth: "components/auth/i18n",
}

function getOutputPath(language: string, namespace?: string): string {
  const resolvedNamespace = namespace ?? defaultNS

  if (language === fallbackLng) {
    return `lib/i18n/locales/${language}/${resolvedNamespace}.json`
  }

  const baseDir = NAMESPACE_DIRECTORIES[resolvedNamespace] ?? "lib/i18n/locales"
  return `${baseDir}/${language}/${resolvedNamespace}.json`
}

export default defineConfig({
  locales: [...languages],
  extract: {
    input: [
      "app/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
      "hooks/**/*.{ts,tsx}",
      "lib/**/*.{ts,tsx}",
      "providers/**/*.{ts,tsx}",
      "middleware.ts",
      "auth.ts",
    ],
    ignore: [
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
      "**/*.stories.{ts,tsx}",
      "**/*.snap",
      "**/__tests__/**",
      "**/__mocks__/**",
      "node_modules/**",
    ],
    output: getOutputPath,
    defaultNS,
    keySeparator: ".",
    nsSeparator: ":",
    primaryLanguage: fallbackLng,
    secondaryLanguages: languages.filter((lng) => lng !== fallbackLng),
    functions: ["t", "i18next.t"],
    transComponents: ["Trans"],
    useTranslationNames: [
      "useTranslation",
      {
        name: "useLanguage",
      },
    ],
    ignoredAttributes: [
      "className",
      "data-testid",
      "data-state",
      "data-scope",
      "aria-label",
      "aria-labelledby",
      "role",
      "as",
      "variant",
      "size",
    ],
    ignoredTags: ["code", "pre", "style", "script"],
    defaultValue: (key, namespace, language, value) => {
      if (language === fallbackLng) {
        return value ?? key
      }
      return ""
    },
    sort: true,
    indentation: 2,
    removeUnusedKeys: true,
  },
  types: {
    input: ["lib/i18n/locales/en/*.json"],
    output: "types/i18next.d.ts",
    resourcesFile: "types/resources.d.ts",
    enableSelector: "optimize",
  },
})
