import { getGlobalSingleton } from "@tasktrove/utils"
import { Scheduler } from "@tasktrove/scheduler"

const SCHEDULER_STATE_KEY = "scheduler.state"

type SchedulerState = {
  instance: Scheduler | null
  signalsBound: boolean
}

function getSchedulerState(): SchedulerState {
  return getGlobalSingleton<SchedulerState>(SCHEDULER_STATE_KEY, () => ({
    instance: null,
    signalsBound: false,
  }))
}

export function getScheduler(): Scheduler {
  const state = getSchedulerState()

  if (!state.instance) {
    state.instance = new Scheduler()
  }

  if (!state.signalsBound) {
    bindSignalHandlers(state.instance)
    state.signalsBound = true
  }

  return state.instance
}

function bindSignalHandlers(scheduler: Scheduler) {
  const shutdown = (signal: NodeJS.Signals) => {
    console.log(`${signal} signal received. Stopping scheduler...`)
    scheduler.stop()
    process.exit(0)
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"))
  process.on("SIGINT", () => shutdown("SIGINT"))
}
