import { config as baseConfig } from "@repo/eslint-config/base";

export default [
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        project: true,
      },
    },
  },
  {
    ignores: ["eslint.config.js"],
  },
];
