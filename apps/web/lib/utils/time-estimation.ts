import type { Task } from "@/lib/types"

/**
 * Formats time in seconds to human readable format (e.g., "1h", "30m", "1h 30m")
 */
export function formatTime(seconds: number): string {
  if (seconds === 0) return ""

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)

  if (h === 0) {
    return `${m}m`
  } else if (m === 0) {
    return `${h}h`
  } else {
    return `${h}h ${m}m`
  }
}

/**
 * Gets the effective estimation for a task, either direct or calculated from subtasks
 */
export function getEffectiveEstimation(task: Task): {
  estimation: number
  isFromSubtasks: boolean
} {
  const subtaskEstimationSum = task.subtasks.reduce(
    (total, subtask) => total + (subtask.estimation || 0),
    0,
  )
  const isFromSubtasks = (!task.estimation || task.estimation === 0) && subtaskEstimationSum > 0

  return {
    estimation: task.estimation && task.estimation > 0 ? task.estimation : subtaskEstimationSum,
    isFromSubtasks,
  }
}
