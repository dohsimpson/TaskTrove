export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Import pino first, then next-logger with explicit "all" preset for console patching
    await require("pino")
    await require("next-logger/presets/all")

    // Initialize the scheduler for automatic backups
    try {
      console.log("Attempting to import scheduler...")
      const { initializeScheduler } = await import("./lib/backup")
      console.log("Scheduler imported successfully. Initializing...")
      initializeScheduler()
      console.log("Scheduler initialization called.")
    } catch (error) {
      console.error("Failed to import or initialize scheduler:", error)
    }
  }
}
