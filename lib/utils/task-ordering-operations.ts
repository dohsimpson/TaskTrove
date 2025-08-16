/**
 * Task ordering operations using array-based approach
 *
 * These utilities handle task ordering within projects using simple arrays
 * stored in the project's taskOrder field. Much simpler and more reliable
 * than the previous linked-list approach.
 */

import { Task, Project, TaskId, ProjectId } from "../types"

// =============================================================================
// CORE ORDERING OPERATIONS
// =============================================================================

/**
 * Gets ordered tasks for a project using the project's taskOrder array
 */
export function getOrderedTasksForProject(
  projectId: ProjectId,
  tasks: Task[],
  projects: Project[] = [],
): Task[] {
  const project = projects.find((p) => p.id === projectId)

  // If no project found or no taskOrder, fallback to creation date order
  if (!project || !project.taskOrder) {
    return tasks
      .filter((task) => (task.projectId || "inbox") === projectId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }

  // Create task map for efficient lookup
  const taskMap = new Map(tasks.map((t) => [t.id, t]))

  // Get tasks in order, filtering out any deleted task IDs
  const orderedTasks = project.taskOrder
    .map((taskId) => taskMap.get(taskId))
    .filter((task): task is Task => task !== undefined && (task.projectId || "inbox") === projectId)

  // Add any tasks that exist but aren't in taskOrder (newly created)
  const orderedTaskIds = new Set(orderedTasks.map((t) => t.id))
  const unorderedTasks = tasks.filter(
    (task) => (task.projectId || "inbox") === projectId && !orderedTaskIds.has(task.id),
  )

  // Append unordered tasks at the end
  return [...orderedTasks, ...unorderedTasks]
}

/**
 * Gets the current task order array for a project
 */
export function getTaskOrderForProject(projectId: ProjectId, projects: Project[]): TaskId[] {
  const project = projects.find((p) => p.id === projectId)
  return project?.taskOrder || []
}

/**
 * Updates the task order for a project
 */
export function updateProjectTaskOrder(
  projectId: ProjectId,
  newTaskOrder: TaskId[],
  projects: Project[],
): Project[] {
  return projects.map((project) => {
    if (project.id === projectId) {
      return {
        ...project,
        taskOrder: newTaskOrder,
      }
    }
    return project
  })
}

// =============================================================================
// TASK REORDERING OPERATIONS
// =============================================================================

/**
 * Moves a task from one position to another within the same project
 */
export function moveTaskWithinProject(
  taskId: TaskId,
  fromIndex: number,
  toIndex: number,
  projectId: ProjectId,
  projects: Project[],
): Project[] {
  const project = projects.find((p) => p.id === projectId)
  if (!project) return projects

  const taskOrder = [...(project.taskOrder || [])]

  // Ensure the task is in the order array
  if (!taskOrder.includes(taskId)) {
    taskOrder.push(taskId)
  }

  const currentIndex = taskOrder.indexOf(taskId)

  // Remove from current position
  taskOrder.splice(currentIndex, 1)

  // Insert at new position
  taskOrder.splice(toIndex, 0, taskId)

  return updateProjectTaskOrder(projectId, taskOrder, projects)
}

/**
 * Moves a task between different projects
 */
export function moveTaskBetweenProjects(
  taskId: TaskId,
  sourceProjectId: ProjectId,
  targetProjectId: ProjectId,
  targetPosition: number,
  projects: Project[],
): Project[] {
  let updatedProjects = projects

  // Remove from source project's order
  const sourceProject = projects.find((p) => p.id === sourceProjectId)
  if (sourceProject?.taskOrder) {
    const sourceOrder = sourceProject.taskOrder.filter((id) => id !== taskId)
    updatedProjects = updateProjectTaskOrder(sourceProjectId, sourceOrder, updatedProjects)
  }

  // Add to target project's order
  const targetProject = updatedProjects.find((p) => p.id === targetProjectId)
  const targetOrder = [...(targetProject?.taskOrder || [])]

  // Insert at specified position
  targetOrder.splice(targetPosition, 0, taskId)

  return updateProjectTaskOrder(targetProjectId, targetOrder, updatedProjects)
}

/**
 * Adds a task to a project's order at the specified position
 */
export function addTaskToProjectOrder(
  taskId: TaskId,
  projectId: ProjectId,
  position: number | "end",
  projects: Project[],
): Project[] {
  const project = projects.find((p) => p.id === projectId)
  const taskOrder = [...(project?.taskOrder || [])]

  // Don't add if already present
  if (taskOrder.includes(taskId)) {
    return projects
  }

  if (position === "end") {
    taskOrder.push(taskId)
  } else {
    taskOrder.splice(position, 0, taskId)
  }

  return updateProjectTaskOrder(projectId, taskOrder, projects)
}

/**
 * Removes a task from a project's order
 */
export function removeTaskFromProjectOrder(
  taskId: TaskId,
  projectId: ProjectId,
  projects: Project[],
): Project[] {
  const project = projects.find((p) => p.id === projectId)
  if (!project?.taskOrder) return projects

  const taskOrder = project.taskOrder.filter((id) => id !== taskId)
  return updateProjectTaskOrder(projectId, taskOrder, projects)
}
