import { defineConfig, mergeConfig } from "vitest/config";
import { baseConfig } from "@repo/vitest-config/base";

const shouldSilenceConsole = process.env.VITEST === "true";

export default defineConfig(
  mergeConfig(baseConfig, {
    test: {
      environment: "node",
      include: ["tests/**/*.test.ts"],
      onConsoleLog() {
        if (shouldSilenceConsole) {
          return false;
        }

        return undefined;
      },
    },
  }),
);
