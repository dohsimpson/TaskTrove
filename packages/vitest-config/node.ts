import { defineConfig, mergeConfig } from "vitest/config";
import type { UserConfig } from "vitest/config";

// @ts-expect-error - TypeScript doesn't allow .ts extensions, but we need it for ESM
import { baseConfig } from "./base.ts";

/**
 * Vitest configuration for Node.js environment.
 * Use this for testing Node.js code (utilities, APIs, etc.)
 */
export default defineConfig(
  mergeConfig(baseConfig, {
    test: {
      environment: "node",
    },
  }),
);
