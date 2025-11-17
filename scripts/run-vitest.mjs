import { spawn } from "node:child_process"
import { createRequire } from "node:module"

const requireFromCwd = (() => {
  try {
    return createRequire(`${process.cwd()}/package.json`)
  } catch {
    return createRequire(import.meta.url)
  }
})()

const vitestBin = requireFromCwd.resolve("vitest/vitest.mjs")

const child = spawn(
  process.execPath,
  ["--disable-warning=ExperimentalWarning", vitestBin, ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: process.env,
  },
)

child.on("close", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
