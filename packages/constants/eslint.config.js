import baseConfig from "@repo/eslint-config/base.js";

export default [
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        project: true,
      },
    },
  },
];
