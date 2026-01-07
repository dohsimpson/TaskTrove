import { nextJsConfig } from "@repo/eslint-config/next-js"

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextJsConfig,
  {
    // Ignore built service worker output; source lives in lib/service-worker.ts
    ignores: ["public/**/*"],
  },
]

export default config
