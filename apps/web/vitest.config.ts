import { defineConfig } from "vitest/config"
import { resolve } from "path"

export default defineConfig({
  test: {
    environment: "happy-dom",
    setupFiles: ["./test-setup.ts"],
    globals: true,
    pool: "threads",
    onConsoleLog(log: string, type: "stdout" | "stderr"): boolean | void {
      // Only filter out happy-dom internal teardown abort errors
      const isHappyDomAbort =
        log.includes("happy-dom") &&
        log.includes("AsyncTaskManager") &&
        (log.includes("AbortError") || log.includes("The operation was aborted"))

      if (isHappyDomAbort) {
        return false // Suppress only happy-dom teardown abort errors
      }

      // Let all other logs through, including legitimate test errors
      return undefined
    },
    // poolOptions: {
    //   threads: {
    //     singleThread: false,
    //     minThreads: 1,
    //     maxThreads: 4,
    //   }
    // },
    // fileParallelism: true,
    // maxConcurrency: 5,
    // cache: {
    //   dir: 'node_modules/.vitest'
    // },
    // deps: {
    //   optimizer: {
    //     web: {
    //       enabled: true
    //     }
    //   }
    // },
    // css: {
    //   modules: {
    //     classNameStrategy: 'non-scoped'
    //   }
    // },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["components/**/*.{ts,tsx}"],
      exclude: [
        "components/**/*.stories.{ts,tsx}",
        "components/**/*.test.{ts,tsx}",
        "components/ui/**/*.{ts,tsx}", // Exclude shadcn/ui components
        "node_modules/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
    },
  },
  esbuild: {
    jsx: "automatic",
  },
})
