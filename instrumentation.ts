export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Import pino first, then next-logger with explicit "all" preset for console patching
    await require("pino")
    await require("next-logger/presets/all")
  }
}
