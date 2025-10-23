import { defineConfig, mergeConfig } from "vitest/config";
import type { UserConfig } from "vitest/config";

// @ts-expect-error - TypeScript doesn't allow .ts extensions, but we need it for ESM
import { baseConfig } from "./base.ts";

/**
 * Vitest configuration for Node.js environment (base tests only).
 * Use this for testing Node.js code (utilities, APIs, etc.)
 * Excludes Pro test files (*.pro.test.ts)
 */
export default defineConfig(
  mergeConfig(baseConfig, {
    test: {
      environment: "node",
      exclude: [...(baseConfig.test?.exclude || []), "**/*.pro.test.ts"],
    },
  }),
);
