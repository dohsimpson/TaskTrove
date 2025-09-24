// i18next-parser configuration for components/dialogs colocated translations
export default {
  // Target only dialog components
  input: [
    "components/dialogs/**/*.{ts,tsx}",
    // Exclude test files
    "!components/dialogs/**/*.test.{ts,tsx}",
    "!components/dialogs/**/*.spec.{ts,tsx}",
  ],

  // Colocated translation files
  output: "components/dialogs/i18n/$LOCALE/dialogs.json",

  // Only generate non-English files (English uses inline defaults)
  locales: ["zh", "fr", "de", "es", "nl", "ko"],

  // Use dialogs as the namespace for all dialog components
  defaultNamespace: "dialogs",

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
    // For other languages, return empty string for new keys (preserves existing translations)
    return ""
  },

  // Don't create backup files when updating translations
  createOldCatalogs: false,

  // Clean up removed keys but preserve existing translations
  keepRemoved: false,

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
