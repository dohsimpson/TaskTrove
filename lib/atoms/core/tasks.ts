import { atom } from "jotai"
import { isToday } from "date-fns"
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
  Project,
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
import {
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_TITLE,
  DEFAULT_TASK_COMPLETED,
  DEFAULT_SECTION_ID,
  DEFAULT_TASK_SUBTASKS,
  DEFAULT_TASK_COMMENTS,
  DEFAULT_TASK_ATTACHMENTS,
  DEFAULT_TASK_STATUS,
  DEFAULT_RECURRING_MODE,
} from "../../constants/defaults"
import { handleAtomError } from "../utils"
import { currentViewAtom, currentViewStateAtom, viewStatesAtom } from "../ui/views"
import { currentRouteContextAtom } from "../ui/navigation"
import {
  getOrderedTasksForProject,
  moveTaskWithinProject,
  addTaskToProjectOrder,
  removeTaskFromProjectOrder,
} from "../../utils/task-ordering-operations"
import { playSound } from "../../utils/audio"
import { tasksAtom, createTaskMutationAtom, deleteTaskMutationAtom, projectsAtom } from "./base"
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
    playSound("confirm").catch((error) => {
      log.warn({ error, module: "tasks" }, "Failed to play task creation sound")
    })

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
 * Preserves existing fields while updating specified ones
 */
export const updateTaskAtom = atom(
  null,
  (get, set, { updateRequest }: { updateRequest: UpdateTaskRequest }) => {
    try {
      const tasks = get(tasksAtom)
      const updatedTasks = tasks.map((task: Task) =>
        task.id === updateRequest.id ? { ...task, ...updateRequest } : task,
      )
      set(tasksAtom, updatedTasks)
    } catch (error) {
      handleAtomError(error, "updateTaskAtom")
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

    // Get the delete task mutation
    const deleteTaskMutation = get(deleteTaskMutationAtom)

    // Execute the mutation - this will handle optimistic updates and API persistence
    await deleteTaskMutation.mutateAsync({ id: taskId })

    // Record the operation for undo/redo feedback
    set(recordOperationAtom, `Deleted task: "${taskToDelete.title}"`)

    // Play deletion sound
    playSound("whoosh").catch((error) => {
      log.warn({ error, module: "tasks" }, "Failed to play deletion sound")
    })

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
      playSound("bellClear").catch((error) => {
        log.warn({ error, module: "tasks" }, "Failed to play completion sound")
      })
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
        task.id === taskId ? { ...task, comments: [...(task.comments || []), newComment] } : task,
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
 * Inbox tasks - tasks assigned to the special inbox project
 * Uses projectId === INBOX_PROJECT_ID for filtering
 */
export const inboxTasksAtom = atom((get) => {
  try {
    const activeTasks = get(activeTasksAtom)
    return activeTasks.filter((task: Task) => {
      const taskWithProject = ensureTaskProjectId(task)
      return taskWithProject.projectId === INBOX_PROJECT_ID
    })
  } catch (error) {
    handleAtomError(error, "inboxTasksAtom")
    return []
  }
})
inboxTasksAtom.debugLabel = "inboxTasksAtom"

/**
 * Tasks due today
 * Uses the same date comparison logic as main-content.tsx filtering
 */
export const todayTasksAtom = atom((get) => {
  try {
    const activeTasks = get(activeTasksAtom)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return activeTasks.filter((task: Task) => {
      if (!task.dueDate) return false
      const taskDate = new Date(task.dueDate)
      taskDate.setHours(0, 0, 0, 0)
      return taskDate.getTime() === today.getTime()
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
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return activeTasks.filter((task: Task) => {
      if (!task.dueDate) return false
      const taskDate = new Date(task.dueDate)
      taskDate.setHours(0, 0, 0, 0)
      // Correct logic: all tasks from tomorrow onwards (for counts/analytics)
      return taskDate.getTime() >= tomorrow.getTime()
    })
  } catch (error) {
    handleAtomError(error, "upcomingTasksAtom")
    return []
  }
})
upcomingTasksAtom.debugLabel = "upcomingTasksAtom"

/**
 * Overdue tasks
 * Filters active tasks with due dates in the past
 */
export const overdueTasksAtom = atom((get) => {
  try {
    const activeTasks = get(activeTasksAtom)
    const now = new Date()
    return activeTasks.filter((task: Task) => task.dueDate && task.dueDate < now)
  } catch (error) {
    handleAtomError(error, "overdueTasksAtom")
    return []
  }
})
overdueTasksAtom.debugLabel = "overdueTasksAtom"

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
    const completedTasks = get(completedTasksAtom)
    const rawViewStates = get(viewStatesAtom)
    const viewStates: ViewStates =
      rawViewStates && typeof rawViewStates === "object" && !Array.isArray(rawViewStates)
        ? rawViewStates
        : {}

    // Get view-specific showCompleted settings
    const getViewShowCompleted = (viewId: ViewId) => {
      return viewStates[viewId]?.showCompleted ?? false
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
      } else if (activeFilters.labels && activeFilters.labels.length > 0) {
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
          params.taskId,
          params.fromIndex,
          params.toIndex,
          projectId,
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
          const tasks = get(tasksAtom)
          const task = tasks.find((t: Task) => t.id === params.taskId)
          projectId = task?.projectId || INBOX_PROJECT_ID
        }
      }

      const updatedProjects = moveTaskWithinProject(
        params.taskId,
        params.fromIndex,
        params.toIndex,
        projectId,
        projects,
      )

      set(projectsAtom, updatedProjects)
      log.info(
        {
          taskId: params.taskId,
          projectId,
          fromIndex: params.fromIndex,
          toIndex: params.toIndex,
          module: "tasks",
        },
        "Task moved within project",
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
        sectionId: params.taskData.sectionId || createSectionId(DEFAULT_SECTION_ID),
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
      const position = params.position !== undefined ? params.position : "end"
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
      if (!tasks) return []

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
    upcomingTasks: upcomingTasksAtom,
    overdueTasks: overdueTasksAtom,
    taskCounts: taskCountsAtom,
    completedTasksToday: completedTasksTodayAtom,
    baseTasksForView: baseTasksForViewAtom,
    filteredTasks: filteredTasksAtom,
    getTasksForView: getTasksForViewAtom,
  },
}

// Individual exports for backward compatibility
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

export { tasksAtom } from "./base"
