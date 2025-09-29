import { defineConfig, mergeConfig } from "vitest/config";
import type { UserConfig } from "vitest/config";

// @ts-expect-error - TypeScript doesn't allow .ts extensions, but we need it for ESM
import { baseConfig } from "./base.ts";

/**
 * Vitest configuration for happy-dom environment.
 * Use this for testing React components with better performance than jsdom.
 * Used by the web app.
 */
export default defineConfig(
  mergeConfig(baseConfig, {
    test: {
      environment: "happy-dom",
    },
  }),
);
