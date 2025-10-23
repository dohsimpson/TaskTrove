import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";

/**
 * A shared ESLint configuration for TaskTrove with strict TypeScript rules.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.strict,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "error",
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
        projectService: {
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 30,
          allowDefaultProject: [
            "*.pro.ts",
            "src/*.pro.ts",
            "src/*.pro.tsx",
            "src/*.pro.test.ts",
            "src/*.pro.test.tsx",
            "src/*/*.pro.ts",
            "src/*/*.pro.tsx",
            "src/*/*.pro.test.ts",
            "src/*/*.pro.test.tsx",
            "src/*/*/*.pro.ts",
            "src/*/*/*.pro.tsx",
            "src/*/*/*.pro.test.ts",
            "src/*/*/*.pro.test.tsx",
          ],
        },
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
      "@typescript-eslint/no-unnecessary-condition": "error",
    },
  },
  {
    ignores: ["dist/**", ".next/**", "node_modules/**"],
  },
];
