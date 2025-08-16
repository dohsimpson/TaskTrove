import { defineConfig } from "vitest/config"
import { resolve } from "path"

export default defineConfig({
  test: {
    environment: "happy-dom",
    setupFiles: ["./test-setup.ts"],
    globals: true,
    pool: "threads",
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
