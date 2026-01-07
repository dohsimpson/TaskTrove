import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReact from "eslint-plugin-react";
import globals from "globals";
import pluginNext from "@next/eslint-plugin-next";
import { config as baseConfig } from "./base.js";

/**
 * A custom ESLint configuration for TaskTrove Next.js applications.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const nextJsConfig = [
  ...baseConfig,
  {
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.serviceworker,
      },
    },
  },
  {
    plugins: {
      "@next/next": pluginNext,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs["core-web-vitals"].rules,
      // TaskTrove specific: allow unescaped entities
      "react/no-unescaped-entities": "off",
      // Enforce keys for lists in JSX
      "react/jsx-key": "error",
      "react/prop-types": "off",
    },
  },
  {
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      // React scope no longer necessary with new JSX transform
      "react/react-in-jsx-scope": "off",
    },
  },
  {
    // test file overrides
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-unnecessary-condition": "off",
    },
  },
  {
    // Relax env-var linting for build/dev config surfaces that intentionally read from process.env.
    // Capacitor configs stay strict because they feed native builds.
    files: ["**/next.config.*", "**/scripts/**/*.{js,ts,mjs,cjs}"],
    rules: {
      "turbo/no-undeclared-env-vars": "off",
    },
  },
  {
    // Ignore tool/config entry points; they aren't part of the app bundle and often use Node APIs.
    ignores: ["**/*config.{js,ts,mjs,cjs}"],
  },
];
