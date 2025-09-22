export default {
  input: [
    "components/dialogs/settings-forms/**/*.{ts,tsx}",
    "!components/dialogs/settings-forms/**/*.test.{ts,tsx}",
    "!components/dialogs/settings-forms/**/*.spec.{ts,tsx}",
  ],
  output: "components/dialogs/settings-forms/i18n/$LOCALE/$NAMESPACE.json",
  locales: ["zh", "fr", "de", "es", "nl"], // Only generate non-English files (English uses inline defaults)
  defaultNamespace: "settings",
  lexers: {
    ts: ["JsxLexer"],
    tsx: ["JsxLexer"],
  },
  defaultValue: function (locale, namespace, key, value) {
    // English files not generated - inline defaults used instead
    // For non-English: return undefined to omit keys (allows fallback to inline defaults)
    return undefined
  },
  keepRemoved: false,
  sort: true,
  jsonIndent: 2,
  lineEnding: "\n",
  nsSeparator: ":",
  keySeparator: ".",
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
