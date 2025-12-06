import { defineConfig, type UserConfig } from "vitest/config";

/**
 * Base Vitest configuration with common exclude patterns.
 * Prevents tests from being discovered in build output directories.
 */
export const baseConfig: UserConfig = {
  test: {
    globals: true,
    silent: "passed-only",
    testTimeout: 15_000, // Increased from default 5000ms as we have increased vitest nice value
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
      "**/.next/**", // Exclude Next.js build output (including standalone)
      "**/.turbo/**", // Exclude Turbo cache
    ],
  },
};

export default defineConfig(baseConfig);
