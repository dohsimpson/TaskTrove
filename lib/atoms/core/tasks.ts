import { atom } from "jotai"
import { isToday, isPast, isFuture } from "date-fns"
import { v4 as uuidv4 } from "uuid"
import {
  Task,
  TaskComment,
  TaskId,
  SectionId,
  ViewId,
  ProjectId,
  LabelId,
  LabelIdSchema,
  GroupIdSchema,
  Project,
  ProjectSection,
  GroupId,
  INBOX_PROJECT_ID,
  ensureTaskProjectId,
  createTaskId,
  createProjectId,
  createSectionId,
  createCommentId,
  UpdateTaskRequest,
  CreateTaskRequest,
  ViewStates,
} from "../../types"
import { matchesDueDateFilter } from "../../utils/date-filter-utils"
import { isTaskInInbox } from "../../utils"
import {
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_TITLE,
  DEFAULT_TASK_COMPLETED,
  DEFAULT_UUID,
  DEFAULT_TASK_SUBTASKS,
  DEFAULT_TASK_COMMENTS,
  DEFAULT_TASK_ATTACHMENTS,
  DEFAULT_TASK_STATUS,
  DEFAULT_RECURRING_MODE,
} from "../../constants/defaults"
import { handleAtomError, playSoundAtom } from "../utils"
import {
  currentViewAtom,
  currentViewStateAtom,
  viewStatesAtom,
  getViewStateOrDefault,
} from "../ui/views"
import { currentRouteContextAtom } from "../ui/navigation"
import { notificationAtoms } from "./notifications"
// Task ordering utilities - inline implementation after task-ordering-operations.ts removal
const getOrderedTasksForProject = (
  projectId: ProjectId,
  tasks: Task[],
  projects: Project[],
): Task[] => {
  const project = projects.find((p) => p.id === projectId)
  if (!project?.taskOrder) {
    return tasks.filter((task) => task.projectId === projectId)
  }

  const taskMap = new Map(tasks.map((task) => [task.id, task]))
  const orderedTasks = project.taskOrder
    .map((taskId) => taskMap.get(taskId))
    .filter((task): task is Task => task !== undefined && task.projectId === projectId)

  return orderedTasks
}

const moveTaskWithinProject = (
  projectId: ProjectId,
  taskId: TaskId,
  toIndex: number,
  projects: Project[],
): Project[] => {
  return projects.map((project) => {
    if (project.id !== projectId) return project

    const taskOrder = project.taskOrder || []
    const currentIndex = taskOrder.indexOf(taskId)
    if (currentIndex === -1) return project

    const newTaskOrder = [...taskOrder]
    newTaskOrder.splice(currentIndex, 1)
    newTaskOrder.splice(toIndex, 0, taskId)

    return { ...project, taskOrder: newTaskOrder }
  })
}
/**
 * Section-aware task reordering that maintains section boundaries.
 * Reorders a task within its section while preserving the project's global task order structure.
 */
export const moveTaskWithinSection = (
  projectId: ProjectId,
  taskId: TaskId,
  toIndex: number,
  sectionId: SectionId,
  projects: Project[],
  tasks: Task[],
): Project[] => {
  return projects.map((project) => {
    if (project.id !== projectId) return project

    const taskOrder = project.taskOrder || []

    // Get all tasks in the target section, ordered by current project taskOrder
    const sectionTasks = tasks
      .filter((task) => {
        // Handle DEFAULT_UUID section compatibility
        const taskSection = task.sectionId || DEFAULT_UUID
        const targetSection = sectionId || DEFAULT_UUID
        return task.projectId === projectId && taskSection === targetSection
      })
      .sort((a, b) => {
        const aIndex = taskOrder.indexOf(a.id)
        const bIndex = taskOrder.indexOf(b.id)

        // If both are in taskOrder, maintain that order
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex

        // If only one is in taskOrder, it comes first
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1

        // Neither in taskOrder, maintain creation order
        return a.createdAt.getTime() - b.createdAt.getTime()
      })

    const sectionTaskIds = sectionTasks.map((task) => task.id)
    const currentIndexInSection = sectionTaskIds.indexOf(taskId)

    if (currentIndexInSection === -1) return project

    // Reorder within the section
    const newSectionOrder = [...sectionTaskIds]
    newSectionOrder.splice(currentIndexInSection, 1)
    newSectionOrder.splice(toIndex, 0, taskId)

    // Rebuild the project's taskOrder by replacing section tasks with new order
    const newTaskOrder = [...taskOrder]

    // Find positions of section tasks in global order
    const sectionPositions = sectionTaskIds
      .map((id) => newTaskOrder.indexOf(id))
      .filter((pos) => pos !== -1)

    if (sectionPositions.length > 0) {
      // Remove all section tasks from their current positions
      sectionTaskIds.forEach((id) => {
        const index = newTaskOrder.indexOf(id)
        if (index !== -1) newTaskOrder.splice(index, 1)
      })

      // Insert reordered section tasks at the earliest position
      const insertPosition = Math.min(...sectionPositions)
      newTaskOrder.splice(insertPosition, 0, ...newSectionOrder)
    } else {
      // Section tasks aren't in global order yet, add them at the end
      newTaskOrder.push(...newSectionOrder)
    }

    return { ...project, taskOrder: newTaskOrder }
  })
}

const addTaskToProjectOrder = (
  taskId: TaskId,
  projectId: ProjectId,
  position: number | undefined,
  projects: Project[],
): Project[] => {
  return projects.map((project) => {
    if (project.id !== projectId) return project

    const taskOrder = project.taskOrder || []
    if (taskOrder.includes(taskId)) return project

    const newTaskOrder = [...taskOrder]
    if (position === undefined) {
      newTaskOrder.push(taskId)
    } else {
      newTaskOrder.splice(position, 0, taskId)
    }

    return { ...project, taskOrder: newTaskOrder }
  })
}

const removeTaskFromProjectOrder = (
  taskId: TaskId,
  projectId: ProjectId,
  projects: Project[],
): Project[] => {
  return projects.map((project) => {
    if (project.id !== projectId) return project

    const taskOrder = project.taskOrder || []
    const filteredOrder = taskOrder.filter((id) => id !== taskId)

    return { ...project, taskOrder: filteredOrder }
  })
}
import { collectProjectIdsFromGroup } from "../../utils/group-utils"
import {
  tasksAtom,
  createTaskMutationAtom,
  updateTasksMutationAtom,
  deleteTaskMutationAtom,
  projectsAtom,
} from "./base"
import { allGroupsAtom } from "./groups"
import { recordOperationAtom } from "./history"
import { log } from "../../utils/logger"

/**
 * Core task management atoms for TaskTrove's Jotai migration
 *
 * This file contains the atomic state management for tasks, migrated from
 * the existing useTaskManager hook (570+ lines) to provide better performance
 * and more granular state updates.
 */

// =============================================================================
// BASE ATOMS
// =============================================================================

// tasksAtom now imported from './base' to avoid circular dependencies

// =============================================================================
// WRITE-ONLY ACTION ATOMS
// =============================================================================

/**
 * Adds a new task with proper defaults
 * Uses the create task mutation to persist to API
 * Plays confirmation sound when task is added
 * History tracking enabled and tracks operation for undo/redo
 */
export const addTaskAtom = atom(null, async (get, set, taskData: CreateTaskRequest) => {
  try {
    // Get the create task mutation
    const createTaskMutation = get(createTaskMutationAtom)

    // taskData is already CreateTaskRequest type, no parsing needed
    const createTaskData = taskData

    // Execute the mutation - this will handle optimistic updates and API persistence
    const result = await createTaskMutation.mutateAsync(createTaskData)

    // Get the created task ID from the response
    const createdTaskId = result.taskIds[0]

    // Record the operation for undo/redo feedback using the title from taskData
    const taskTitle = taskData.title || DEFAULT_TASK_TITLE
    set(recordOperationAtom, `Added task: "${taskTitle}"`)

    // Play task creation sound
    set(playSoundAtom, { soundType: "confirm" })

    // Schedule notification if task has due date and time
    if (taskData.dueDate && taskData.dueTime) {
      // Get the task from the updated tasks list to have the full task object
      const tasks = get(tasksAtom)
      const createdTask = tasks.find((task) => task.id === createdTaskId)

      if (createdTask) {
        set(notificationAtoms.actions.scheduleTask, { taskId: createdTaskId, task: createdTask })
        log.info({ taskId: createdTaskId, module: "tasks" }, "Scheduled notification for new task")
      }
    }

    log.info({ taskId: createdTaskId, title: taskTitle, module: "tasks" }, "Task added")

    // Since we use optimistic updates and invalidateQueries, the task will be available in cache
    // We return the task ID as the created task identifier
    return { id: createdTaskId, title: taskTitle } // Return minimal task info for consumers
  } catch (error) {
    handleAtomError(error, "addTaskAtom")
    throw error // Re-throw so the UI can handle the error
  }
})
addTaskAtom.debugLabel = "addTaskAtom"

/**
 * Updates an existing task with new data
 * Follows the same simple pattern as updateProjectAtom and updateLabelAtom
 */
export const updateTaskAtom = atom(
  null,
  async (get, set, { updateRequest }: { updateRequest: UpdateTaskRequest }) => {
    try {
      // Use server mutation which handles optimistic updates automatically
      const updateTasksMutation = get(updateTasksMutationAtom)
      await updateTasksMutation.mutateAsync([updateRequest])
    } catch (error) {
      handleAtomError(error, "updateTaskAtom")
      throw error
    }
  },
)
updateTaskAtom.debugLabel = "updateTaskAtom"

/**
 * Deletes a task permanently
 * Uses the delete task mutation to persist to API
 * Plays deletion sound effect
 * History tracking enabled and tracks operation for undo/redo
 */
export const deleteTaskAtom = atom(null, async (get, set, taskId: TaskId) => {
  try {
    const tasks = get(tasksAtom) // Get current tasks from base atom
    const taskToDelete = tasks.find((task: Task) => task.id === taskId)

    if (!taskToDelete) return

    // Cancel any scheduled notification for this task
    set(notificationAtoms.actions.cancelTask, taskId)

    // Get the delete task mutation
    const deleteTaskMutation = get(deleteTaskMutationAtom)

    // Execute the mutation - this will handle optimistic updates and API persistence
    await deleteTaskMutation.mutateAsync({ id: taskId })

    // Record the operation for undo/redo feedback
    set(recordOperationAtom, `Deleted task: "${taskToDelete.title}"`)

    // Play deletion sound
    set(playSoundAtom, { soundType: "whoosh" })

    log.info({ taskId, module: "tasks" }, "Task deleted permanently")
  } catch (error) {
    handleAtomError(error, "deleteTaskAtom")
    throw error // Re-throw so the UI can handle the error
  }
})
deleteTaskAtom.debugLabel = "deleteTaskAtom"

/**
 * Toggles task completion status
 * Updates completed, completedAt, and status fields
 * Plays completion sound when task is marked as completed
 * History tracking enabled and tracks operation for undo/redo
 */
export const toggleTaskAtom = atom(null, (get, set, taskId: TaskId) => {
  try {
    const tasks = get(tasksAtom) // Get current tasks from base atom
    const task = tasks.find((t: Task) => t.id === taskId)

    if (!task) return

    const wasCompleted = task.completed
    const willBeCompleted = !wasCompleted

    const updatedTasks = tasks.map((task: Task) =>
      task.id === taskId
        ? {
            ...task,
            completed: willBeCompleted,
            status: willBeCompleted ? "completed" : "active",
          }
        : task,
    )

    set(tasksAtom, updatedTasks)

    // Record the operation for undo/redo feedback
    const actionText = willBeCompleted ? "Completed" : "Uncompleted"
    set(recordOperationAtom, `${actionText} task: "${task.title}"`)

    // Play completion sound when task is marked as completed
    if (willBeCompleted) {
      // Use the new clear bell sound for todo completion
      // This provides instant, satisfying feedback perfect for todos
      set(playSoundAtom, { soundType: "bellClear" })
    }
  } catch (error) {
    handleAtomError(error, "toggleTaskAtom")
  }
})
toggleTaskAtom.debugLabel = "toggleTaskAtom"

/**
 * Adds a comment to a specific task
 * Creates a new comment with current user data and timestamp
 */
export const addCommentAtom = atom(
  null,
  (get, set, { taskId, content }: { taskId: TaskId; content: string }) => {
    try {
      const tasks = get(tasksAtom)
      const newComment: TaskComment = {
        id: createCommentId(uuidv4()),
        content,
        createdAt: new Date(),
      }

      const updatedTasks = tasks.map((task: Task) =>
        task.id === taskId ? { ...task, comments: [...task.comments, newComment] } : task,
      )

      set(tasksAtom, updatedTasks)
      log.info({ taskId, commentId: newComment.id, module: "tasks" }, "Comment added to task")
    } catch (error) {
      handleAtomError(error, "addCommentAtom")
    }
  },
)
addCommentAtom.debugLabel = "addCommentAtom"

/**
 * Handles bulk operations on multiple tasks
 * Supports complete, delete, and archive actions
 */
export const bulkActionsAtom = atom(
  null,
  (
    get,
    set,
    { action, taskIds }: { action: "complete" | "delete" | "archive"; taskIds: TaskId[] },
  ) => {
    try {
      const tasks = get(tasksAtom)

      switch (action) {
        case "complete":
          const completedTasks = tasks.map((task: Task) =>
            taskIds.includes(task.id)
              ? { ...task, completed: true, completedAt: new Date(), status: "completed" }
              : task,
          )
          set(tasksAtom, completedTasks)
          break

        case "delete":
          const filteredTasks = tasks.filter((task: Task) => !taskIds.includes(task.id))
          set(tasksAtom, filteredTasks)
          break

        case "archive":
          const archivedTasks = tasks.map((task: Task) =>
            taskIds.includes(task.id) ? { ...task, status: "archived" } : task,
          )
          set(tasksAtom, archivedTasks)
          break
      }
    } catch (error) {
      handleAtomError(error, "bulkActionsAtom")
    }
  },
)
bulkActionsAtom.debugLabel = "bulkActionsAtom"

// =============================================================================
// DERIVED READ ATOMS
// =============================================================================

/**
 * Active (non-archived) tasks
 * Filters out archived tasks for normal display
 * History tracking enabled through tasksHistoryAtom for undo/redo support
 */
export const activeTasksAtom = atom((get) => {
  try {
    const tasks = get(tasksAtom) // Get current tasks from base atom
    return tasks.filter((task: Task) => task.status !== "archived")
  } catch (error) {
    handleAtomError(error, "activeTasksAtom")
    return []
  }
})
activeTasksAtom.debugLabel = "activeTasksAtom"

/**
 * Completed tasks
 * Filters active tasks to show only completed ones
 */
export const completedTasksAtom = atom((get) => {
  try {
    const activeTasks = get(activeTasksAtom)
    return activeTasks.filter((task: Task) => task.completed)
  } catch (error) {
    handleAtomError(error, "completedTasksAtom")
    return []
  }
})
completedTasksAtom.debugLabel = "completedTasksAtom"

/**
 * Project group tasks atom
 * Returns a function that takes a groupId and returns all tasks from projects in that group (and nested groups)
 * This supports the flat task view for project groups
 */
export const projectGroupTasksAtom = atom((get) => {
  return (groupId: GroupId) => {
    try {
      const groups = get(allGroupsAtom)
      const activeTasks = get(activeTasksAtom)

      // Get all project IDs from this group and its nested groups
      const projectIds = collectProjectIdsFromGroup(groups, groupId)

      // Return all tasks from these projects
      return activeTasks.filter(
        (task: Task) => task.projectId && projectIds.includes(task.projectId),
      )
    } catch (error) {
      handleAtomError(error, "projectGroupTasksAtom")
      return []
    }
  }
})
projectGroupTasksAtom.debugLabel = "projectGroupTasksAtom"

/**
 * Inbox tasks - tasks with no project or assigned to the special inbox project
 * Uses isTaskInInbox utility for filtering
 */
export const inboxTasksAtom = atom((get) => {
  try {
    const activeTasks = get(activeTasksAtom)
    return activeTasks.filter((task: Task) => {
      const taskWithProject = ensureTaskProjectId(task)
      return isTaskInInbox(taskWithProject.projectId)
    })
  } catch (error) {
    handleAtomError(error, "inboxTasksAtom")
    return []
  }
})
inboxTasksAtom.debugLabel = "inboxTasksAtom"

/**
 * Tasks due exactly today (strict date match)
 * Maintains the original "today only" logic for specific use cases
 */
export const todayOnlyAtom = atom((get) => {
  try {
    const activeTasks = get(activeTasksAtom)
    return activeTasks.filter((task: Task) => {
      if (!task.dueDate) return false
      return isToday(task.dueDate)
    })
  } catch (error) {
    handleAtomError(error, "todayOnlyAtom")
    return []
  }
})
todayOnlyAtom.debugLabel = "todayOnlyAtom"

/**
 * Tasks due today (including overdue tasks)
 */
export const todayTasksAtom = atom((get) => {
  try {
    const activeTasks = get(activeTasksAtom)

    return activeTasks.filter((task: Task) => {
      if (!task.dueDate) return false

      // Always include tasks due exactly today
      if (isToday(task.dueDate)) {
        return true
      }

      // Include overdue tasks (past but not today)
      if (isPast(task.dueDate) && !isToday(task.dueDate)) {
        return true
      }

      return false
    })
  } catch (error) {
    handleAtomError(error, "todayTasksAtom")
    return []
  }
})
todayTasksAtom.debugLabel = "todayTasksAtom"

/**
 * Upcoming tasks (due after today)
 * Uses the same date comparison logic as main-content.tsx filtering
 */
export const upcomingTasksAtom = atom((get) => {
  try {
    const activeTasks = get(activeTasksAtom)
    return activeTasks.filter((task: Task) => {
      if (!task.dueDate) return false
      // Upcoming = future tasks that are not today (i.e. tomorrow onwards)
      return isFuture(task.dueDate) && !isToday(task.dueDate)
    })
  } catch (error) {
    handleAtomError(error, "upcomingTasksAtom")
    return []
  }
})
upcomingTasksAtom.debugLabel = "upcomingTasksAtom"

/**
 * Overdue tasks
 * Filters active tasks with due dates before today (date-only comparison)
 */
export const overdueTasksAtom = atom((get) => {
  try {
    const activeTasks = get(activeTasksAtom)
    return activeTasks.filter((task: Task) => {
      if (!task.dueDate) return false
      return isPast(task.dueDate) && !isToday(task.dueDate)
    })
  } catch (error) {
    handleAtomError(error, "overdueTasksAtom")
    return []
  }
})
overdueTasksAtom.debugLabel = "overdueTasksAtom"

/**
 * Calendar tasks - tasks with due dates
 * Filters active tasks that have a due date for calendar view
 */
export const calendarTasksAtom = atom((get) => {
  try {
    const activeTasks = get(activeTasksAtom)
    return activeTasks.filter((task: Task) => task.dueDate)
  } catch (error) {
    handleAtomError(error, "calendarTasksAtom")
    return []
  }
})
calendarTasksAtom.debugLabel = "calendarTasksAtom"

/**
 * Task counts for different categories
 * Uses the same derived atoms as filtering to ensure consistency
 */
export const taskCountsAtom = atom((get) => {
  try {
    const activeTasks = get(activeTasksAtom)
    const inboxTasks = get(inboxTasksAtom)
    const todayTasks = get(todayTasksAtom)
    const upcomingTasks = get(upcomingTasksAtom)
    const overdueTasks = get(overdueTasksAtom)
    const calendarTasks = get(calendarTasksAtom)
    const completedTasks = get(completedTasksAtom)
    const rawViewStates = get(viewStatesAtom)
    const viewStates: ViewStates = rawViewStates

    // Get view-specific showCompleted settings
    const getViewShowCompleted = (viewId: ViewId) => {
      return getViewStateOrDefault(viewStates, viewId).showCompleted
    }

    // Filter tasks based on each view's individual showCompleted setting
    const filterByViewCompleted = (tasks: Task[], viewId: ViewId) => {
      return getViewShowCompleted(viewId) ? tasks : tasks.filter((task: Task) => !task.completed)
    }

    return {
      total: activeTasks.length,
      inbox: filterByViewCompleted(inboxTasks, "inbox").length,
      today: filterByViewCompleted(todayTasks, "today").length,
      upcoming: filterByViewCompleted(upcomingTasks, "upcoming").length,
      calendar: filterByViewCompleted(calendarTasks, "calendar").length,
      overdue: filterByViewCompleted(overdueTasks, "today").length,
      completed: completedTasks.length, // Always show all completed tasks in completed section
      all: filterByViewCompleted(activeTasks, "all").length,
      active: activeTasks.filter((task: Task) => !task.completed).length,
    }
  } catch (error) {
    handleAtomError(error, "taskCountsAtom")
    return {
      total: 0,
      inbox: 0,
      today: 0,
      upcoming: 0,
      calendar: 0,
      overdue: 0,
      completed: 0,
      all: 0,
      active: 0,
    }
  }
})
taskCountsAtom.debugLabel = "taskCountsAtom"

// =============================================================================
// UTILITY ATOMS
// =============================================================================

/**
 * Gets completed tasks for today (for analytics)
 * Returns count of tasks completed today
 */
export const completedTasksTodayAtom = atom((get) => {
  try {
    const tasks = get(activeTasksAtom)
    return tasks.filter(
      (task: Task) => task.completed && task.completedAt && isToday(task.completedAt),
    )
  } catch (error) {
    handleAtomError(error, "completedTasksTodayAtom")
    return 0
  }
})
completedTasksTodayAtom.debugLabel = "completedTasksTodayAtom"

/**
 * Base tasks for current view atom (performance optimized)
 * Uses specific task atoms as foundation for better Jotai memoization
 * Only recomputes when base data or view changes, not UI state
 */
export const baseTasksForViewAtom = atom((get) => {
  try {
    const currentView = get(currentViewAtom)

    // Use specific pre-filtered atoms for better performance
    switch (currentView) {
      case "today":
        return get(todayTasksAtom)
      case "upcoming":
        return get(upcomingTasksAtom)
      case "inbox":
        return get(inboxTasksAtom)
      case "completed":
        return get(completedTasksAtom)
      default:
        // Use route context to determine if this is a project or label view
        const routeContext = get(currentRouteContextAtom)
        const activeTasks = get(activeTasksAtom)

        if (routeContext.routeType === "project") {
          // Use the viewId from route context which contains the project ID for project routes
          return activeTasks.filter((task: Task) => task.projectId === routeContext.viewId)
        }

        if (routeContext.routeType === "label") {
          // For labels, we need to validate viewId is a LabelId before using it
          try {
            const labelId = LabelIdSchema.parse(currentView)
            return activeTasks.filter((task: Task) => task.labels.includes(labelId))
          } catch {
            // Invalid label ID, return empty array
            return []
          }
        }

        if (routeContext.routeType === "projectgroup") {
          // For project groups, get all tasks from projects within the group
          try {
            const groupId = GroupIdSchema.parse(routeContext.viewId)
            const getProjectGroupTasks = get(projectGroupTasksAtom)
            return getProjectGroupTasks(groupId)
          } catch {
            // Invalid group ID, return empty array
            return []
          }
        }

        return activeTasks
    }
  } catch (error) {
    handleAtomError(error, "baseTasksForViewAtom")
    return []
  }
})
baseTasksForViewAtom.debugLabel = "baseTasksForViewAtom"

/**
 * Comprehensive filtered tasks atom (refactored for performance)
 * Uses baseTasksForViewAtom as foundation, then applies UI filters
 * Now only recomputes UI concerns (search, show completed, sorting)
 */
export const filteredTasksAtom = atom((get) => {
  try {
    // Use optimized base tasks that are pre-filtered by view
    const baseTasks = get(baseTasksForViewAtom)
    const viewState = get(currentViewStateAtom)
    const currentView = get(currentViewAtom)
    const searchQuery = viewState.searchQuery

    let result = baseTasks

    // Apply show completed filter (only UI concern now)
    // Skip this filter for the "completed" view since it should always show completed tasks
    if (!viewState.showCompleted && currentView !== "completed") {
      result = result.filter((task: Task) => !task.completed)
    }

    // Apply show overdue filter (only UI concern now)
    if (!viewState.showOverdue) {
      result = result.filter((task: Task) => {
        if (!task.dueDate) return true
        return !(isPast(task.dueDate) && !isToday(task.dueDate))
      })
    }

    // Apply search query filter (only UI concern now)
    if (searchQuery) {
      result = result.filter(
        (task: Task) =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Apply advanced filters from viewState.activeFilters
    const activeFilters = viewState.activeFilters
    if (activeFilters) {
      // Filter by project IDs
      if (activeFilters.projectIds?.length) {
        result = result.filter(
          (task: Task) => task.projectId && activeFilters.projectIds?.includes(task.projectId),
        )
      }

      // Filter by labels
      if (activeFilters.labels === null) {
        // Show only tasks with NO labels
        result = result.filter((task: Task) => task.labels.length === 0)
      } else if (activeFilters.labels.length > 0) {
        // Show tasks with specific labels
        const labelFilter = activeFilters.labels
        result = result.filter((task: Task) =>
          task.labels.some((label: LabelId) => labelFilter.includes(label)),
        )
      }
      // If activeFilters.labels is [], show all tasks (no filtering)

      // Filter by priorities
      if (activeFilters.priorities?.length) {
        result = result.filter((task: Task) => activeFilters.priorities?.includes(task.priority))
      }

      // Filter by completion status
      if (activeFilters.completed !== undefined) {
        result = result.filter((task: Task) => task.completed === activeFilters.completed)
      }

      // Filter by due date (preset or custom range)
      if (activeFilters.dueDateFilter) {
        const { preset, customRange } = activeFilters.dueDateFilter
        result = result.filter((task: Task) => {
          return matchesDueDateFilter(task.dueDate, task.completed, preset, customRange)
        })
      }

      // Filter by assigned team members (currently not supported in Task schema)
      // TODO: Add assignedTo field to Task schema when team features are implemented
      // if (activeFilters.assignedTo?.length) {
      //   result = result.filter((task) =>
      //     task.assignedTo?.some((userId) => activeFilters.assignedTo!.includes(userId))
      //   );
      // }

      // Filter by task status
      if (activeFilters.status?.length) {
        result = result.filter(
          (task: Task) => task.status && activeFilters.status?.includes(task.status),
        )
      }
    }

    // Apply sorting based on viewState.sortBy
    return result.sort((a: Task, b: Task) => {
      const direction = viewState.sortDirection === "asc" ? 1 : -1

      switch (viewState.sortBy) {
        case "default":
          // Default sort: completed tasks at bottom, maintain existing order otherwise
          if (a.completed !== b.completed) {
            return (a.completed ? 1 : 0) - (b.completed ? 1 : 0)
          }
          // Within same completion status, maintain existing order (no additional sorting)
          return 0
        case "priority":
          return direction * (a.priority - b.priority)
        case "dueDate":
          // Regular due date sorting (mixed completed/incomplete)
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return direction
          if (!b.dueDate) return -direction
          return direction * (a.dueDate.getTime() - b.dueDate.getTime())
        case "title":
          return direction * a.title.localeCompare(b.title)
        case "createdAt":
          return direction * (a.createdAt.getTime() - b.createdAt.getTime())
        case "status":
          // Sort by completion status only
          if (a.completed !== b.completed) {
            return direction * ((a.completed ? 1 : 0) - (b.completed ? 1 : 0))
          }
          return 0
        default:
          return 0
      }
    })
  } catch (error) {
    handleAtomError(error, "filteredTasksAtom")
    return []
  }
})
filteredTasksAtom.debugLabel = "filteredTasksAtom"

/**
 * Reorders tasks within projects using task order arrays
 * Handles position updates within project views
 */
export const moveTaskAtom = atom(
  null,
  (
    get,
    set,
    params: {
      taskId: TaskId
      viewId?: ViewId
      fromIndex?: number
      toIndex?: number
      taskOrder?: Array<{ taskId: TaskId; order: number }> // Legacy support
    },
  ) => {
    try {
      const tasks = get(tasksAtom)

      // Legacy support for old taskOrder format
      if (params.taskOrder) {
        log.warn(
          { module: "tasks" },
          "Using legacy taskOrder format - consider migrating to nextTask",
        )
        const updatedTasks = tasks.map((task: Task) => {
          const orderInfo = params.taskOrder?.find((t) => t.taskId === task.id)
          if (orderInfo) {
            return { ...task, order: orderInfo.order }
          }
          return task
        })
        set(tasksAtom, updatedTasks)
        return
      }

      // Handle reordering within a project using taskOrder arrays
      if (params.viewId && params.fromIndex !== undefined && params.toIndex !== undefined) {
        // Determine project ID from view ID
        const projects = get(projectsAtom)
        let projectId: ProjectId

        if (params.viewId === "inbox") {
          projectId = INBOX_PROJECT_ID
        } else {
          // Find the project that matches the viewId
          const matchingProject = projects.find((p: Project) => p.id === params.viewId)
          if (matchingProject) {
            // ViewId is confirmed to be a ProjectId by project lookup
            projectId = matchingProject.id
          } else {
            // ViewId is likely a StandardViewId or LabelId - get project from task
            const task = tasks.find((t: Task) => t.id === params.taskId)
            projectId = task?.projectId || INBOX_PROJECT_ID
          }
        }

        const updatedProjects = moveTaskWithinProject(
          projectId,
          params.taskId,
          params.toIndex,
          projects,
        )
        set(projectsAtom, updatedProjects)
      }
    } catch (error) {
      handleAtomError(error, "moveTaskAtom")
    }
  },
)
moveTaskAtom.debugLabel = "moveTaskAtom"

/**
 * Moves a task between project sections
 * Updates the sectionId field and maintains view ordering
 */
export const moveTaskBetweenSectionsAtom = atom(
  null,
  (
    get,
    set,
    params: {
      taskId: TaskId
      projectId: ProjectId
      newSectionId: SectionId // section ID
      toIndex?: number // position within the new section
    },
  ) => {
    try {
      const tasks = get(tasksAtom)

      // Update the task's sectionId
      const updatedTasks = tasks.map((task: Task) =>
        task.id === params.taskId
          ? {
              ...task,
              sectionId: params.newSectionId,
              projectId: createProjectId(params.projectId), // Ensure task is in the correct project
            }
          : task,
      )

      set(tasksAtom, updatedTasks)

      // If a specific position is requested, also reorder within the view
      if (params.toIndex !== undefined) {
        const viewId = params.projectId // ProjectId is now directly a ViewId
        set(reorderTaskInViewAtom, {
          taskId: params.taskId,
          viewId,
          fromIndex: 0, // We'll let the reorder logic figure out the current position
          toIndex: params.toIndex,
        })
      }

      log.info(
        {
          taskId: params.taskId,
          sectionId: params.newSectionId,
          projectId: params.projectId,
          module: "tasks",
        },
        "Task moved to section",
      )
    } catch (error) {
      handleAtomError(error, "moveTaskBetweenSectionsAtom")
    }
  },
)
moveTaskBetweenSectionsAtom.debugLabel = "moveTaskBetweenSectionsAtom"

/**
 * Reorders a task within a specific project using nextTask
 * This is the primary atom for handling drag-and-drop reordering
 */
export const reorderTaskInViewAtom = atom(
  null,
  (
    get,
    set,
    params: {
      taskId: TaskId
      viewId: ViewId
      fromIndex: number
      toIndex: number
    },
  ) => {
    try {
      // Get current tasks and projects
      const tasks = get(tasksAtom)
      const projects = get(projectsAtom)

      // Find the task being reordered
      const task = tasks.find((t: Task) => t.id === params.taskId)
      if (!task) {
        log.warn({ taskId: params.taskId }, "Task not found for reordering")
        return
      }

      // Determine project ID from view ID or task
      let projectId: ProjectId
      if (params.viewId === "inbox") {
        projectId = INBOX_PROJECT_ID
      } else {
        // Find the project that matches the viewId
        const matchingProject = projects.find((p: Project) => p.id === params.viewId)
        if (matchingProject) {
          // ViewId is confirmed to be a ProjectId by project lookup
          projectId = matchingProject.id
        } else {
          // ViewId is likely a StandardViewId or LabelId - get project from task
          projectId = task.projectId || INBOX_PROJECT_ID
        }
      }

      // Use section-aware reordering that maintains section boundaries
      const taskSectionId = task.sectionId || createSectionId(DEFAULT_UUID)

      const updatedProjects = moveTaskWithinSection(
        projectId,
        params.taskId,
        params.toIndex,
        taskSectionId,
        projects,
        tasks,
      )

      set(projectsAtom, updatedProjects)
      log.info(
        {
          taskId: params.taskId,
          projectId,
          sectionId: taskSectionId,
          fromIndex: params.fromIndex,
          toIndex: params.toIndex,
          module: "tasks",
        },
        "Task reordered within section",
      )
    } catch (error) {
      handleAtomError(error, "reorderTaskInViewAtom")
    }
  },
)
reorderTaskInViewAtom.debugLabel = "reorderTaskInViewAtom"

/**
 * Adds a new task to a specific position in a project
 * Automatically manages nextTask for the new task
 */
export const addTaskToViewAtom = atom(
  null,
  (
    get,
    set,
    params: {
      taskData: CreateTaskRequest
      viewId: ViewId
      position?: number // If not specified, adds to end
    },
  ) => {
    try {
      const tasks = get(tasksAtom)

      // Create the new task first
      const newTask: Task = {
        id: createTaskId(uuidv4()),
        description: params.taskData.description,
        completed: DEFAULT_TASK_COMPLETED,
        priority: params.taskData.priority || DEFAULT_TASK_PRIORITY,
        sectionId: params.taskData.sectionId || createSectionId(DEFAULT_UUID),
        dueDate: params.taskData.dueDate,
        projectId: params.taskData.projectId || INBOX_PROJECT_ID,
        labels: params.taskData.labels || [],
        subtasks: DEFAULT_TASK_SUBTASKS,
        comments: DEFAULT_TASK_COMMENTS,
        attachments: DEFAULT_TASK_ATTACHMENTS,
        createdAt: new Date(),
        status: DEFAULT_TASK_STATUS,
        order: 0,
        ...params.taskData,
        title: params.taskData.title || DEFAULT_TASK_TITLE,
        recurringMode: params.taskData.recurringMode || DEFAULT_RECURRING_MODE,
      }

      // Add task to tasks array
      const tasksWithNew = [...tasks, newTask]
      set(tasksAtom, tasksWithNew)

      // Add to project's taskOrder array
      const projectId = newTask.projectId || INBOX_PROJECT_ID
      const projects = get(projectsAtom)
      const position = params.position
      const updatedProjects = addTaskToProjectOrder(newTask.id, projectId, position, projects)
      set(projectsAtom, updatedProjects)

      log.info(
        { taskId: newTask.id, taskTitle: newTask.title, projectId, module: "tasks" },
        "Task added to project",
      )
    } catch (error) {
      handleAtomError(error, "addTaskToViewAtom")
    }
  },
)
addTaskToViewAtom.debugLabel = "addTaskToViewAtom"

/**
 * Removes a task from a specific view (but keeps the task in other views)
 * If task is only in this view, removes it completely
 */
export const removeTaskFromViewAtom = atom(
  null,
  (get, set, params: { taskId: TaskId; viewId: ViewId }) => {
    try {
      const tasks = get(tasksAtom)
      const task = tasks.find((t: Task) => t.id === params.taskId)

      if (!task) return

      // Determine project ID from view ID
      const projects = get(projectsAtom)
      let projectId: ProjectId

      if (params.viewId === "inbox") {
        projectId = INBOX_PROJECT_ID
      } else {
        // Find the project that matches the viewId
        const matchingProject = projects.find((p: Project) => p.id === params.viewId)
        if (matchingProject) {
          // ViewId is confirmed to be a ProjectId by project lookup
          projectId = matchingProject.id
        } else {
          // ViewId is likely a StandardViewId or LabelId - get project from task
          projectId = task.projectId || INBOX_PROJECT_ID
        }
      }

      // Remove from project's taskOrder array
      const updatedProjects = removeTaskFromProjectOrder(params.taskId, projectId, projects)
      set(projectsAtom, updatedProjects)

      log.info(
        { taskId: params.taskId, projectId, module: "tasks" },
        "Task removed from project ordering",
      )
    } catch (error) {
      handleAtomError(error, "removeTaskFromViewAtom")
    }
  },
)
removeTaskFromViewAtom.debugLabel = "removeTaskFromViewAtom"

/**
 * Gets ordered tasks for a specific view using project taskOrder arrays
 * This replaces the old linked-list approach with array-based ordering
 */
export const getTasksForViewAtom = atom((get) => {
  return (viewId: ViewId) => {
    try {
      const tasks = get(tasksAtom)
      const projects = get(projectsAtom)

      // Determine project ID from view ID
      let projectId: ProjectId

      if (viewId === "inbox") {
        projectId = INBOX_PROJECT_ID
      } else {
        // Find the project that matches the viewId
        const matchingProject = projects.find((p: Project) => p.id === viewId)
        if (matchingProject) {
          // ViewId is confirmed to be a ProjectId by project lookup
          projectId = matchingProject.id
        } else {
          // ViewId is likely a StandardViewId or LabelId - default to inbox
          projectId = INBOX_PROJECT_ID
        }
      }

      return getOrderedTasksForProject(projectId, tasks, projects)
    } catch (error) {
      handleAtomError(error, "getTasksForViewAtom")
      return []
    }
  }
})
getTasksForViewAtom.debugLabel = "getTasksForViewAtom"

// =============================================================================
// DERIVED ATOMS
// =============================================================================

/**
 * Derived atom that pre-computes ordered tasks for all projects.
 * This prevents redundant calculations when displaying multiple sections.
 */
export const orderedTasksByProjectAtom = atom((get) => {
  const tasks = get(tasksAtom)
  const projects = get(projectsAtom)

  // Create a map of projectId -> ordered tasks
  const orderedTasksMap = new Map<string, Task[]>()

  // Process all projects
  for (const project of projects) {
    const orderedTasks = getOrderedTasksForProject(project.id, tasks, projects)
    orderedTasksMap.set(project.id, orderedTasks)
  }

  // Special case for inbox (tasks without projectId)
  orderedTasksMap.set("inbox", getOrderedTasksForProject(INBOX_PROJECT_ID, tasks, projects))

  return orderedTasksMap
})
orderedTasksByProjectAtom.debugLabel = "orderedTasksByProjectAtom"

/**
 * Shared atom for getting ordered tasks by section with orphan handling
 * Returns a function that takes (projectId, sectionId) and returns ordered tasks
 * Handles orphaned tasks (tasks with invalid section IDs) by showing them in the default section
 */
export const orderedTasksBySectionAtom = atom((get) => {
  return (projectId: ProjectId | "inbox", sectionId: string | null) => {
    try {
      const tasks = get(filteredTasksAtom) // Use already filtered tasks
      const currentViewState = get(currentViewStateAtom)
      const allProjects = get(projectsAtom)
      const orderedTasksByProject = get(orderedTasksByProjectAtom)

      // Find the specific project to get its sections
      const project =
        projectId === "inbox" ? null : allProjects.find((p: Project) => p.id === projectId)

      // Get list of existing section IDs for orphan detection
      const existingSectionIds = new Set([
        DEFAULT_UUID,
        ...(project?.sections.map((s: ProjectSection) => s.id) || []),
      ])

      // Filter tasks for this section from the passed tasks (already sorted by filteredTasksAtom)
      const sectionTasks = tasks.filter((task: Task) => {
        // First filter by project
        const taskProjectId = task.projectId || INBOX_PROJECT_ID
        const targetProjectId = projectId === "inbox" ? INBOX_PROJECT_ID : projectId
        if (taskProjectId !== targetProjectId) return false

        // Then filter by section - handle orphaned tasks
        if (sectionId === null || sectionId === DEFAULT_UUID) {
          // Include tasks that belong to default section OR tasks with orphaned section IDs
          return (
            task.sectionId === DEFAULT_UUID ||
            !task.sectionId ||
            !existingSectionIds.has(task.sectionId)
          )
        }
        return task.sectionId === sectionId
      })

      // If user has selected a specific sort (not "default"), respect it fully
      if (currentViewState.sortBy !== "default") {
        return sectionTasks // tasks are already sorted by filteredTasksAtom
      }

      // For "default" sort, maintain the legacy behavior for better UX in project views:
      // Use project ordering for incomplete tasks, keep completed tasks at bottom
      const projectIdForOrdering = projectId === "inbox" ? "inbox" : projectId
      const orderedProjectTasks = orderedTasksByProject.get(projectIdForOrdering) || []
      const projectTaskOrder = orderedProjectTasks.map((t) => t.id)

      const sortedTasks = sectionTasks.sort((a: Task, b: Task) => {
        // If completion status differs, completed tasks go to bottom (matches main-content.tsx)
        if (a.completed && !b.completed) return 1
        if (!a.completed && b.completed) return -1

        // Both have same completion status, use project order for "default" sort
        const aIndex = projectTaskOrder.indexOf(a.id)
        const bIndex = projectTaskOrder.indexOf(b.id)

        // If both tasks are in project order, maintain that order
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex
        }

        // If only one is in project order, it comes first
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1

        // Neither in project order, maintain original order (by creation date)
        return a.createdAt.getTime() - b.createdAt.getTime()
      })

      return sortedTasks
    } catch (error) {
      handleAtomError(error, "orderedTasksBySectionAtom")
      return []
    }
  }
})
orderedTasksBySectionAtom.debugLabel = "orderedTasksBySectionAtom"

// =============================================================================
// EXPORT STRUCTURE
// =============================================================================

/**
 * Organized export of all task-related atoms
 * Provides clear separation between different types of atoms
 */
export const taskAtoms = {
  // Base state atoms
  tasks: tasksAtom,

  // Action atoms (write-only)
  actions: {
    addTask: addTaskAtom,
    updateTask: updateTaskAtom,
    deleteTask: deleteTaskAtom,
    toggleTask: toggleTaskAtom,
    addComment: addCommentAtom,
    bulkActions: bulkActionsAtom,
    moveTask: moveTaskAtom,
    moveTaskBetweenSections: moveTaskBetweenSectionsAtom,
    reorderTaskInView: reorderTaskInViewAtom,
    addTaskToView: addTaskToViewAtom,
    removeTaskFromView: removeTaskFromViewAtom,
    createTaskMutation: createTaskMutationAtom,
    deleteTaskMutation: deleteTaskMutationAtom,
  },

  // Derived read atoms
  derived: {
    activeTasks: activeTasksAtom,
    completedTasks: completedTasksAtom,
    inboxTasks: inboxTasksAtom,
    todayTasks: todayTasksAtom,
    todayOnly: todayOnlyAtom,
    upcomingTasks: upcomingTasksAtom,
    overdueTasks: overdueTasksAtom,
    calendarTasks: calendarTasksAtom,
    taskCounts: taskCountsAtom,
    completedTasksToday: completedTasksTodayAtom,
    baseTasksForView: baseTasksForViewAtom,
    filteredTasks: filteredTasksAtom,
    getTasksForView: getTasksForViewAtom,
    orderedTasksByProject: orderedTasksByProjectAtom,
    orderedTasksBySection: orderedTasksBySectionAtom,
  },
}

export { tasksAtom } from "./base"
