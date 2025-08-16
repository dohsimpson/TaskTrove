/**
 * Migration utilities for converting from nextTask linked lists to taskOrder arrays
 */

import { log } from "@/lib/utils/logger"

/**
 * Legacy task interface with nextTask field
 */
interface LegacyTask {
  id: string
  projectId?: string
  nextTask?: string | null
  createdAt: Date
}

/**
 * Builds a taskOrder array from legacy nextTask linked list structure
 * This helps migrate from the old linked-list approach to the new array approach
 */
export function buildTaskOrderFromNextTask(projectId: string, tasks: LegacyTask[]): string[] {
  // Get tasks for this project
  const projectTasks = tasks.filter((task) => (task.projectId || "inbox") === projectId)

  if (projectTasks.length === 0) return []

  // Try to build order from nextTask links
  const taskOrder = buildOrderFromLinkedList(projectTasks)

  // If linked list is broken or incomplete, fallback to creation date order
  if (taskOrder.length !== projectTasks.length) {
    log.warn(
      { projectId, module: "migration" },
      `Linked list incomplete for project ${projectId}, falling back to creation date order`,
    )
    return projectTasks
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((t) => t.id)
  }

  return taskOrder
}

/**
 * Attempts to build order array from nextTask linked list
 */
function buildOrderFromLinkedList(tasks: LegacyTask[]): string[] {
  if (tasks.length === 0) return []

  // Find the first task (no other task points to it)
  const pointedToIds = new Set(
    tasks.map((t) => t.nextTask).filter((id): id is string => Boolean(id)),
  )

  const firstTask = tasks.find((t) => !pointedToIds.has(t.id))
  if (!firstTask) {
    // No clear first task, linked list is broken
    return []
  }

  // Traverse the linked list
  const order: string[] = []
  const visited = new Set<string>()
  let currentTask: LegacyTask | null = firstTask

  while (currentTask && !visited.has(currentTask.id)) {
    visited.add(currentTask.id)
    order.push(currentTask.id)

    if (!currentTask.nextTask) break

    const nextTask = tasks.find((t) => t.id === currentTask?.nextTask)
    currentTask = nextTask || null
  }

  return order
}

/**
 * Creates taskOrder for all projects in the given data
 */
export function migrateAllProjectTaskOrders(
  tasks: LegacyTask[],
  projects: Array<{ id: string }>,
): Map<string, string[]> {
  const taskOrders = new Map<string, string[]>()

  // Handle inbox separately
  const inboxOrder = buildTaskOrderFromNextTask("inbox", tasks)
  if (inboxOrder.length > 0) {
    taskOrders.set("inbox", inboxOrder)
  }

  // Handle each project
  for (const project of projects) {
    const projectOrder = buildTaskOrderFromNextTask(project.id, tasks)
    if (projectOrder.length > 0) {
      taskOrders.set(project.id, projectOrder)
    }
  }

  return taskOrders
}
