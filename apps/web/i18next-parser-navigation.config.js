// i18next-parser configuration for components/navigation colocated translations
export default {
  // Target only navigation components
  input: [
    "components/navigation/**/*.{ts,tsx}",
    // Exclude test files
    "!components/navigation/**/*.test.{ts,tsx}",
    "!components/navigation/**/*.spec.{ts,tsx}",
  ],

  // Colocated translation files
  output: "components/navigation/i18n/$LOCALE/navigation.json",

  // Only generate non-English files (English uses inline defaults)
  locales: ["zh", "fr", "de", "es", "nl"],

  // Use navigation as the namespace for all navigation components
  defaultNamespace: "navigation",

  // Configure lexers for TypeScript React
  lexers: {
    ts: ["JsxLexer"],
    tsx: ["JsxLexer"],
  },

  // Handle inline defaults: t('key', 'default value')
  defaultValue: function (locale, namespace, key, value) {
    // For English, use the provided default value from t('key', 'default')
    if (locale === "en") {
      return value || key
    }
    // For other languages, return undefined so keys are omitted (allowing fallback to defaults)
    return undefined
  },

  // Preserve existing translations when re-running
  keepRemoved: true,

  // Sort keys alphabetically for consistency
  sort: true,

  // JSON formatting options
  jsonIndent: 2,
  lineEnding: "\n",

  // Namespace separator configuration
  nsSeparator: ":",
  keySeparator: ".",

  // Function and component recognition
  options: {
    func: {
      list: ["t", "i18n.t"],
      extensions: [".ts", ".tsx"],
    },
    trans: {
      component: "Trans",
      i18nKey: "i18nKey",
      extensions: [".ts", ".tsx"],
    },
  },
}
