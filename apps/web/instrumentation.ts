export async function register() {
  // Only skip when explicitly running in the edge runtime. In standalone prod builds
  // NEXT_RUNTIME is often undefined, so allow initialization by default.
  if (process.env.NEXT_RUNTIME === "edge") {
    return
  }

  try {
    // eslint-disable-next-line no-restricted-syntax -- dynamic import required during instrumentation bootstrap
    const { bootstrapScheduler } = await import("./lib/scheduler/bootstrap")
    await bootstrapScheduler()
  } catch (error) {
    console.error("Failed to initialize scheduler:", error)
  }
}
