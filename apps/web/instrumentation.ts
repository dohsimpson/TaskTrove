// import { bootstrapScheduler } from "@/lib/scheduler/bootstrap"

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return
  }

  try {
    const { bootstrapScheduler } = await import("@/lib/scheduler/bootstrap")
    await bootstrapScheduler()
  } catch (error) {
    console.error("Failed to initialize scheduler:", error)
  }
}
