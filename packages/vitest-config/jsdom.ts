import { defineConfig, mergeConfig } from "vitest/config";
import type { UserConfig } from "vitest/config";

// @ts-expect-error - TypeScript doesn't allow .ts extensions, but we need it for ESM
import { baseConfig } from "./base.ts";

/**
 * Vitest configuration for jsdom environment (base tests only).
 * Use this for testing React components and browser code.
 * Excludes Pro test files (*.pro.test.ts)
 */
export default defineConfig(
  mergeConfig(baseConfig, {
    test: {
      environment: "jsdom",
      exclude: [...(baseConfig.test?.exclude || []), "**/*.pro.test.ts"],
    },
  }),
);
