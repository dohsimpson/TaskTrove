import { config as baseConfig } from "@repo/eslint-config/base";
import pluginReactHooks from "eslint-plugin-react-hooks";

export default [
  ...baseConfig,
  {
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
    },
  },
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
