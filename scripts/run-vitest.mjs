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
const isMac = process.platform === "darwin"

const skipTaskpolicy = Boolean(process.env.VITEST_FAST)
const useBackground = Boolean(process.env.VITEST_BACKGROUND)
const niceLevel = process.env.VITEST_NICE ?? "19"

const baseArgs = ["--disable-warning=ExperimentalWarning", vitestBin, ...process.argv.slice(2)]

const command = isMac && !skipTaskpolicy ? (useBackground ? "taskpolicy" : "nice") : process.execPath
const args = (() => {
  if (!isMac || skipTaskpolicy) return baseArgs
  if (useBackground) return ["-b", process.execPath, ...baseArgs]
  return ["-n", niceLevel, process.execPath, ...baseArgs]
})()

const child = spawn(command, args, {
  stdio: "inherit",
  env: process.env,
})

child.on("close", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
