import { atom } from "jotai";
import { isToday } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import {
  Task,
  TaskComment,
  TaskId,
  SectionId,
  ViewId,
  ProjectId,
  Project,
  ProjectSection,
  INBOX_PROJECT_ID,
  createTaskId,
  createProjectId,
  createSectionId,
  createCommentId,
  UpdateTaskRequest,
  CreateTaskRequest,
} from "@tasktrove/types";
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
} from "@tasktrove/constants";
import {
  handleAtomError,
  playSoundAtom,
  namedAtom,
  withErrorHandling,
} from "../utils/atom-helpers";
import { notificationAtoms } from "./notifications";
import {
  getOrderedTasksForProject,
  moveTaskWithinProject,
  moveTaskWithinSection as moveTaskWithinSectionUtil,
  addTaskToProjectOrder,
  removeTaskFromProjectOrder,
} from "../data/tasks/ordering";

// Re-export for backwards compatibility
export { moveTaskWithinSection } from "../data/tasks/ordering";
import {
  tasksAtom,
  createTaskMutationAtom,
  updateTasksMutationAtom,
  deleteTaskMutationAtom,
  projectsAtom,
} from "./base";
import { recordOperationAtom } from "./history";
import { log } from "../utils/atom-helpers";

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
export const addTaskAtom = namedAtom(
  "addTaskAtom",
  atom(null, async (get, set, taskData: CreateTaskRequest) => {
    try {
      // Get the create task mutation
      const createTaskMutation = get(createTaskMutationAtom);

      // taskData is already CreateTaskRequest type, no parsing needed
      const createTaskData = taskData;

      // Execute the mutation - this will handle optimistic updates and API persistence
      const result = await createTaskMutation.mutateAsync(createTaskData);

      // Get the created task ID from the response
      const createdTaskId = result.taskIds[0];
      if (!createdTaskId) {
        throw new Error("Failed to create task: no task ID returned");
      }

      // Record the operation for undo/redo feedback using the title from taskData
      const taskTitle = taskData.title || DEFAULT_TASK_TITLE;
      set(recordOperationAtom, `Added task: "${taskTitle}"`);

      // Play task creation sound
      set(playSoundAtom, { soundType: "confirm" });

      // Schedule notification if task has due date and time
      if (taskData.dueDate && taskData.dueTime) {
        // Get the task from the updated tasks list to have the full task object
        const tasks = get(tasksAtom);
        const createdTask = tasks.find((task) => task.id === createdTaskId);

        if (createdTask) {
          set(notificationAtoms.actions.scheduleTask, {
            taskId: createdTaskId,
            task: createdTask,
          });
          log.info(
            { taskId: createdTaskId, module: "tasks" },
            "Scheduled notification for new task",
          );
        }
      }

      log.info(
        { taskId: createdTaskId, title: taskTitle, module: "tasks" },
        "Task added",
      );

      // Since we use optimistic updates and invalidateQueries, the task will be available in cache
      // We return the task ID as the created task identifier
      return { id: createdTaskId, title: taskTitle }; // Return minimal task info for consumers
    } catch (error) {
      handleAtomError(error, "addTaskAtom");
      throw error; // Re-throw so the UI can handle the error
    }
  }),
);

/**
 * Updates multiple tasks with new data (bulk operation)
 * Follows the same simple pattern as updateProjectAtom and updateLabelAtom
 */
export const updateTasksAtom = namedAtom(
  "updateTasksAtom",
  atom(null, async (get, set, updateRequests: UpdateTaskRequest[]) => {
    try {
      // Use server mutation which handles optimistic updates automatically
      const updateTasksMutation = get(updateTasksMutationAtom);
      await updateTasksMutation.mutateAsync(updateRequests);
    } catch (error) {
      handleAtomError(error, "updateTasksAtom");
      throw error;
    }
  }),
);

/**
 * Updates an existing task with new data (single task)
 * Convenience wrapper around updateTasksAtom for single task updates
 */
export const updateTaskAtom = atom(
  null,
  async (get, set, { updateRequest }: { updateRequest: UpdateTaskRequest }) => {
    try {
      // Use the bulk updateTasksAtom internally
      await set(updateTasksAtom, [updateRequest]);
    } catch (error) {
      handleAtomError(error, "updateTaskAtom");
      throw error;
    }
  },
);
updateTaskAtom.debugLabel = "updateTaskAtom";

/**
 * Deletes multiple tasks permanently (bulk operation)
 * Uses the delete task mutation to persist to API
 * Plays deletion sound effect
 * History tracking enabled and tracks operation for undo/redo
 */
export const deleteTasksAtom = atom(
  null,
  async (get, set, taskIds: TaskId[]) => {
    try {
      const tasks = get(tasksAtom); // Get current tasks from base atom
      const tasksToDelete = tasks.filter((task: Task) =>
        taskIds.includes(task.id),
      );

      if (tasksToDelete.length === 0) return;

      // Cancel any scheduled notifications for these tasks
      for (const taskId of taskIds) {
        set(notificationAtoms.actions.cancelTask, taskId);
      }

      // Get the delete task mutation
      const deleteTaskMutation = get(deleteTaskMutationAtom);

      // Execute the mutation - this will handle optimistic updates and API persistence
      await deleteTaskMutation.mutateAsync({ ids: taskIds });

      // Record the operation for undo/redo feedback
      const taskTitles = tasksToDelete
        .map((task) => `"${task.title}"`)
        .join(", ");
      const message =
        tasksToDelete.length === 1
          ? `Deleted task: ${taskTitles}`
          : `Deleted ${tasksToDelete.length} tasks: ${taskTitles}`;
      set(recordOperationAtom, message);

      // Play deletion sound
      set(playSoundAtom, { soundType: "whoosh" });

      log.info(
        { taskIds, count: tasksToDelete.length, module: "tasks" },
        "Tasks deleted permanently",
      );
    } catch (error) {
      handleAtomError(error, "deleteTasksAtom");
      throw error; // Re-throw so the UI can handle the error
    }
  },
);
deleteTasksAtom.debugLabel = "deleteTasksAtom";

/**
 * Deletes a task permanently (single task)
 * Convenience wrapper around deleteTasksAtom for single task deletion
 */
export const deleteTaskAtom = atom(null, async (get, set, taskId: TaskId) => {
  try {
    // Use the bulk deleteTasksAtom internally
    await set(deleteTasksAtom, [taskId]);
  } catch (error) {
    handleAtomError(error, "deleteTaskAtom");
    throw error; // Re-throw so the UI can handle the error
  }
});
deleteTaskAtom.debugLabel = "deleteTaskAtom";

/**
 * Toggles task completion status
 * Updates completed, completedAt, and status fields
 * Plays completion sound when task is marked as completed
 * History tracking enabled and tracks operation for undo/redo
 */
export const toggleTaskAtom = atom(null, (get, set, taskId: TaskId) => {
  try {
    const tasks = get(tasksAtom); // Get current tasks from base atom
    const task = tasks.find((t: Task) => t.id === taskId);

    if (!task) return;

    const wasCompleted = task.completed;
    const willBeCompleted = !wasCompleted;

    const updatedTasks = tasks.map((task: Task) =>
      task.id === taskId
        ? {
            ...task,
            completed: willBeCompleted,
            status: willBeCompleted ? "completed" : "active",
          }
        : task,
    );

    set(tasksAtom, updatedTasks);

    // Record the operation for undo/redo feedback
    const actionText = willBeCompleted ? "Completed" : "Uncompleted";
    set(recordOperationAtom, `${actionText} task: "${task.title}"`);

    // Play completion sound when task is marked as completed
    if (willBeCompleted) {
      // Use the new clear bell sound for todo completion
      // This provides instant, satisfying feedback perfect for todos
      set(playSoundAtom, { soundType: "bellClear" });
    }
  } catch (error) {
    handleAtomError(error, "toggleTaskAtom");
  }
});
toggleTaskAtom.debugLabel = "toggleTaskAtom";

/**
 * Adds a comment to a specific task
 * Creates a new comment with current user data and timestamp
 */
export const addCommentAtom = atom(
  null,
  (get, set, { taskId, content }: { taskId: TaskId; content: string }) => {
    try {
      const tasks = get(tasksAtom);
      const newComment: TaskComment = {
        id: createCommentId(uuidv4()),
        content,
        createdAt: new Date(),
      };

      const updatedTasks = tasks.map((task: Task) =>
        task.id === taskId
          ? { ...task, comments: [...task.comments, newComment] }
          : task,
      );

      set(tasksAtom, updatedTasks);
      log.info(
        { taskId, commentId: newComment.id, module: "tasks" },
        "Comment added to task",
      );
    } catch (error) {
      handleAtomError(error, "addCommentAtom");
    }
  },
);
addCommentAtom.debugLabel = "addCommentAtom";

/**
 * Handles bulk operations on multiple tasks
 * Supports complete, delete, and archive actions
 */
export const bulkActionsAtom = atom(
  null,
  (
    get,
    set,
    {
      action,
      taskIds,
    }: { action: "complete" | "delete" | "archive"; taskIds: TaskId[] },
  ) => {
    try {
      const tasks = get(tasksAtom);

      switch (action) {
        case "complete":
          const completedTasks = tasks.map((task: Task) =>
            taskIds.includes(task.id)
              ? {
                  ...task,
                  completed: true,
                  completedAt: new Date(),
                  status: "completed",
                }
              : task,
          );
          set(tasksAtom, completedTasks);
          break;

        case "delete":
          const filteredTasks = tasks.filter(
            (task: Task) => !taskIds.includes(task.id),
          );
          set(tasksAtom, filteredTasks);
          break;

        case "archive":
          const archivedTasks = tasks.map((task: Task) =>
            taskIds.includes(task.id) ? { ...task, status: "archived" } : task,
          );
          set(tasksAtom, archivedTasks);
          break;
      }
    } catch (error) {
      handleAtomError(error, "bulkActionsAtom");
    }
  },
);
bulkActionsAtom.debugLabel = "bulkActionsAtom";

// =============================================================================
// DERIVED READ ATOMS
// =============================================================================

// Filtering atoms moved to ../data/tasks/filters.ts
// Re-exported below for backward compatibility
import {
  activeTasksAtom,
  inboxTasksAtom,
  todayTasksAtom,
  upcomingTasksAtom,
  calendarTasksAtom,
  overdueTasksAtom,
  completedTasksAtom,
  projectGroupTasksAtom,
  baseFilteredTasksForViewAtom,
} from "../data/tasks/filters";

/**
 * Tasks due exactly today (strict date match)
 * Maintains the original "today only" logic for specific use cases
 */
export const todayOnlyAtom = namedAtom(
  "todayOnlyAtom",
  atom((get) =>
    withErrorHandling(
      () => {
        const activeTasks = get(activeTasksAtom);
        return activeTasks.filter((task: Task) => {
          if (!task.dueDate) return false;
          return isToday(task.dueDate);
        });
      },
      "todayOnlyAtom",
      [],
    ),
  ),
);

/**
 * Task counts for different categories
 */
/**
 * DEPRECATED: This atom has UI dependencies and should be moved to ui/task-counts.ts
 * or refactored to use uiFilteredTasksForViewAtom from ui/filtered-tasks.ts
 *
 * For now, commented out to eliminate circular dependencies.
 * Components should use baseFilteredTasksForViewAtom directly or create
 * a new UI-layer atom that uses uiFilteredTasksForViewAtom.
 */
// export const taskCountsAtom = atom((get) => {
//   try {
//     const activeTasks = get(activeTasksAtom);
//     const completedTasks = get(completedTasksAtom);
//     const calendarTasks = get(calendarTasksAtom);
//     const viewStates = get(viewStatesAtom);
//
//     return {
//       total: activeTasks.length,
//       inbox: get(baseFilteredTasksForViewAtom("inbox")).length,
//       today: get(baseFilteredTasksForViewAtom("today")).length,
//       upcoming: get(baseFilteredTasksForViewAtom("upcoming")).length,
//       calendar: getViewStateOrDefault(viewStates, "calendar").showCompleted
//         ? calendarTasks.length
//         : calendarTasks.filter((task: Task) => !task.completed).length,
//       overdue: get(overdueTasksAtom).filter((task: Task) => {
//         const showCompleted = getViewStateOrDefault(
//           viewStates,
//           "today",
//         ).showCompleted;
//         return showCompleted || !task.completed;
//       }).length,
//       completed: completedTasks.length,
//       all: get(baseFilteredTasksForViewAtom("all")).length,
//       active: activeTasks.filter((task: Task) => !task.completed).length,
//     };
//   } catch (error) {
//     handleAtomError(error, "taskCountsAtom");
//     return {
//       total: 0,
//       inbox: 0,
//       today: 0,
//       upcoming: 0,
//       calendar: 0,
//       overdue: 0,
//       completed: 0,
//       all: 0,
//       active: 0,
//     };
//   }
// });
// taskCountsAtom.debugLabel = "taskCountsAtom";

// =============================================================================
// UTILITY ATOMS
// =============================================================================

/**
 * Gets completed tasks for today (for analytics)
 * Returns count of tasks completed today
 */
export const completedTasksTodayAtom = namedAtom(
  "completedTasksTodayAtom",
  atom((get) =>
    withErrorHandling(
      () => {
        const tasks = get(activeTasksAtom);
        return tasks.filter(
          (task: Task) =>
            task.completed && task.completedAt && isToday(task.completedAt),
        );
      },
      "completedTasksTodayAtom",
      [],
    ),
  ),
);

/**
 * Comprehensive filtered tasks atom - Layer 2: UI-specific filtering
 * Uses baseFilteredTasksForViewAtom as foundation, then applies UI-only filters
 * Only handles search, advanced filters, and sorting
 */
/**
 * MOVED to ui/filtered-tasks.ts
 * This atom has UI dependencies and belongs in the UI layer
 *
 * The filteredTasksAtom applies UI-specific filters (showCompleted, showOverdue, search, activeFilters)
 * on top of the base filtered tasks from baseFilteredTasksForViewAtom.
 *
 * Import from: @tasktrove/atoms/ui/filtered-tasks
 */
// export const filteredTasksAtom = atom(...)
// filteredTasksAtom.debugLabel = "filteredTasksAtom";

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
      taskId: TaskId;
      viewId?: ViewId;
      fromIndex?: number;
      toIndex?: number;
      taskOrder?: Array<{ taskId: TaskId; order: number }>; // Legacy support
    },
  ) => {
    try {
      const tasks = get(tasksAtom);

      // Legacy support for old taskOrder format
      if (params.taskOrder) {
        log.warn(
          { module: "tasks" },
          "Using legacy taskOrder format - consider migrating to nextTask",
        );
        const updatedTasks = tasks.map((task: Task) => {
          const orderInfo = params.taskOrder?.find((t) => t.taskId === task.id);
          if (orderInfo) {
            return { ...task, order: orderInfo.order };
          }
          return task;
        });
        set(tasksAtom, updatedTasks);
        return;
      }

      // Handle reordering within a project using taskOrder arrays
      if (
        params.viewId &&
        params.fromIndex !== undefined &&
        params.toIndex !== undefined
      ) {
        // Determine project ID from view ID
        const projects = get(projectsAtom);
        let projectId: ProjectId;

        if (params.viewId === "inbox") {
          projectId = INBOX_PROJECT_ID;
        } else {
          // Find the project that matches the viewId
          const matchingProject = projects.find(
            (p: Project) => p.id === params.viewId,
          );
          if (matchingProject) {
            // ViewId is confirmed to be a ProjectId by project lookup
            projectId = matchingProject.id;
          } else {
            // ViewId is likely a StandardViewId or LabelId - get project from task
            const task = tasks.find((t: Task) => t.id === params.taskId);
            projectId = task?.projectId || INBOX_PROJECT_ID;
          }
        }

        const updatedProjects = moveTaskWithinProject(
          projectId,
          params.taskId,
          params.toIndex,
          projects,
        );
        set(projectsAtom, updatedProjects);
      }
    } catch (error) {
      handleAtomError(error, "moveTaskAtom");
    }
  },
);
moveTaskAtom.debugLabel = "moveTaskAtom";

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
      taskId: TaskId;
      projectId: ProjectId;
      newSectionId: SectionId; // section ID
      toIndex?: number; // position within the new section
    },
  ) => {
    try {
      const tasks = get(tasksAtom);

      // Update the task's sectionId
      const updatedTasks = tasks.map((task: Task) =>
        task.id === params.taskId
          ? {
              ...task,
              sectionId: params.newSectionId,
              projectId: createProjectId(params.projectId), // Ensure task is in the correct project
            }
          : task,
      );

      set(tasksAtom, updatedTasks);

      // If a specific position is requested, also reorder within the view
      if (params.toIndex !== undefined) {
        const viewId = params.projectId; // ProjectId is now directly a ViewId
        set(reorderTaskInViewAtom, {
          taskId: params.taskId,
          viewId,
          fromIndex: 0, // We'll let the reorder logic figure out the current position
          toIndex: params.toIndex,
        });
      }

      log.info(
        {
          taskId: params.taskId,
          sectionId: params.newSectionId,
          projectId: params.projectId,
          module: "tasks",
        },
        "Task moved to section",
      );
    } catch (error) {
      handleAtomError(error, "moveTaskBetweenSectionsAtom");
    }
  },
);
moveTaskBetweenSectionsAtom.debugLabel = "moveTaskBetweenSectionsAtom";

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
      taskId: TaskId;
      viewId: ViewId;
      fromIndex: number;
      toIndex: number;
    },
  ) => {
    try {
      // Get current tasks and projects
      const tasks = get(tasksAtom);
      const projects = get(projectsAtom);

      // Find the task being reordered
      const task = tasks.find((t: Task) => t.id === params.taskId);
      if (!task) {
        log.warn({ taskId: params.taskId }, "Task not found for reordering");
        return;
      }

      // Determine project ID from view ID or task
      let projectId: ProjectId;
      if (params.viewId === "inbox") {
        projectId = INBOX_PROJECT_ID;
      } else {
        // Find the project that matches the viewId
        const matchingProject = projects.find(
          (p: Project) => p.id === params.viewId,
        );
        if (matchingProject) {
          // ViewId is confirmed to be a ProjectId by project lookup
          projectId = matchingProject.id;
        } else {
          // ViewId is likely a StandardViewId or LabelId - get project from task
          projectId = task.projectId || INBOX_PROJECT_ID;
        }
      }

      // Use section-aware reordering that maintains section boundaries
      const taskSectionId = task.sectionId || createSectionId(DEFAULT_UUID);

      const updatedProjects = moveTaskWithinSectionUtil(
        projectId,
        params.taskId,
        params.toIndex,
        taskSectionId,
        projects,
        tasks,
      );

      set(projectsAtom, updatedProjects);
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
      );
    } catch (error) {
      handleAtomError(error, "reorderTaskInViewAtom");
    }
  },
);
reorderTaskInViewAtom.debugLabel = "reorderTaskInViewAtom";

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
      taskData: CreateTaskRequest;
      viewId: ViewId;
      position?: number; // If not specified, adds to end
    },
  ) => {
    try {
      const tasks = get(tasksAtom);

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
      };

      // Add task to tasks array
      const tasksWithNew = [...tasks, newTask];
      set(tasksAtom, tasksWithNew);

      // Add to project's taskOrder array
      const projectId = newTask.projectId || INBOX_PROJECT_ID;
      const projects = get(projectsAtom);
      const position = params.position;
      const updatedProjects = addTaskToProjectOrder(
        newTask.id,
        projectId,
        position,
        projects,
      );
      set(projectsAtom, updatedProjects);

      log.info(
        {
          taskId: newTask.id,
          taskTitle: newTask.title,
          projectId,
          module: "tasks",
        },
        "Task added to project",
      );
    } catch (error) {
      handleAtomError(error, "addTaskToViewAtom");
    }
  },
);
addTaskToViewAtom.debugLabel = "addTaskToViewAtom";

/**
 * Removes a task from a specific view (but keeps the task in other views)
 * If task is only in this view, removes it completely
 */
export const removeTaskFromViewAtom = atom(
  null,
  (get, set, params: { taskId: TaskId; viewId: ViewId }) => {
    try {
      const tasks = get(tasksAtom);
      const task = tasks.find((t: Task) => t.id === params.taskId);

      if (!task) return;

      // Determine project ID from view ID
      const projects = get(projectsAtom);
      let projectId: ProjectId;

      if (params.viewId === "inbox") {
        projectId = INBOX_PROJECT_ID;
      } else {
        // Find the project that matches the viewId
        const matchingProject = projects.find(
          (p: Project) => p.id === params.viewId,
        );
        if (matchingProject) {
          // ViewId is confirmed to be a ProjectId by project lookup
          projectId = matchingProject.id;
        } else {
          // ViewId is likely a StandardViewId or LabelId - get project from task
          projectId = task.projectId || INBOX_PROJECT_ID;
        }
      }

      // Remove from project's taskOrder array
      const updatedProjects = removeTaskFromProjectOrder(
        params.taskId,
        projectId,
        projects,
      );
      set(projectsAtom, updatedProjects);

      log.info(
        { taskId: params.taskId, projectId, module: "tasks" },
        "Task removed from project ordering",
      );
    } catch (error) {
      handleAtomError(error, "removeTaskFromViewAtom");
    }
  },
);
removeTaskFromViewAtom.debugLabel = "removeTaskFromViewAtom";

/**
 * Gets ordered tasks for a specific view using project taskOrder arrays
 * This replaces the old linked-list approach with array-based ordering
 */
export const getTasksForViewAtom = namedAtom(
  "getTasksForViewAtom",
  atom((get) => {
    return (viewId: ViewId) =>
      withErrorHandling(
        () => {
          const tasks = get(tasksAtom);
          const projects = get(projectsAtom);

          // Determine project ID from view ID
          let projectId: ProjectId;

          if (viewId === "inbox") {
            projectId = INBOX_PROJECT_ID;
          } else {
            // Find the project that matches the viewId
            const matchingProject = projects.find(
              (p: Project) => p.id === viewId,
            );
            if (matchingProject) {
              // ViewId is confirmed to be a ProjectId by project lookup
              projectId = matchingProject.id;
            } else {
              // ViewId is likely a StandardViewId or LabelId - default to inbox
              projectId = INBOX_PROJECT_ID;
            }
          }

          return getOrderedTasksForProject(projectId, tasks, projects);
        },
        "getTasksForViewAtom",
        [],
      );
  }),
);

// =============================================================================
// DERIVED ATOMS
// =============================================================================

/**
 * Derived atom that pre-computes ordered tasks for all projects.
 * This prevents redundant calculations when displaying multiple sections.
 */
export const orderedTasksByProjectAtom = atom((get) => {
  const tasks = get(tasksAtom);
  const projects = get(projectsAtom);

  // Create a map of projectId -> ordered tasks
  const orderedTasksMap = new Map<string, Task[]>();

  // Process all projects
  for (const project of projects) {
    const orderedTasks = getOrderedTasksForProject(project.id, tasks, projects);
    orderedTasksMap.set(project.id, orderedTasks);
  }

  // Special case for inbox (tasks without projectId)
  orderedTasksMap.set(
    "inbox",
    getOrderedTasksForProject(INBOX_PROJECT_ID, tasks, projects),
  );

  return orderedTasksMap;
});
orderedTasksByProjectAtom.debugLabel = "orderedTasksByProjectAtom";

/**
 * Returns tasks for a specific section within a project
 * Handles orphaned tasks (tasks with invalid section IDs) by including them in the default section
 */
export const orderedTasksBySectionAtom = namedAtom(
  "orderedTasksBySectionAtom",
  atom((get) => {
    return (projectId: ProjectId | "inbox", sectionId: SectionId | null) =>
      withErrorHandling(
        () => {
          const allTasks = get(tasksAtom);
          const allProjects = get(projectsAtom);

          // Filter tasks by project
          const tasks =
            projectId === "inbox"
              ? allTasks.filter(
                  (task: Task) =>
                    !task.projectId || task.projectId === INBOX_PROJECT_ID,
                )
              : allTasks.filter((task: Task) => task.projectId === projectId);

          // Get project for section validation
          const project =
            projectId === "inbox"
              ? null
              : allProjects.find((p: Project) => p.id === projectId);

          // Get list of existing section IDs for orphan detection
          const existingSectionIds = new Set([
            createSectionId(DEFAULT_UUID),
            ...(project?.sections.map((s: ProjectSection) => s.id) || []),
          ]);

          // Filter tasks and handle orphaned tasks
          const sectionTasks = tasks.filter((task: Task) => {
            if (sectionId === null || sectionId === DEFAULT_UUID) {
              // Default section: include tasks with no section ID, default section ID,
              // or orphaned section IDs (section IDs that don't exist in the project)
              return (
                task.sectionId === createSectionId(DEFAULT_UUID) ||
                !task.sectionId ||
                !existingSectionIds.has(task.sectionId)
              );
            }
            return task.sectionId === sectionId;
          });

          // Sort by creation date for consistency
          return sectionTasks.sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
          );
        },
        "orderedTasksBySectionAtom",
        [],
      );
  }),
);

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
    updateTasks: updateTasksAtom,
    deleteTask: deleteTaskAtom,
    deleteTasks: deleteTasksAtom,
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
    // Note: taskCountsAtom disabled (has UI dependencies, needs refactoring)
    completedTasksToday: completedTasksTodayAtom,
    baseFilteredTasksForView: baseFilteredTasksForViewAtom,
    // Note: filteredTasksAtom moved to ui/filtered-tasks.ts (UI-dependent)
    getTasksForView: getTasksForViewAtom,
    orderedTasksByProject: orderedTasksByProjectAtom,
    orderedTasksBySection: orderedTasksBySectionAtom,
  },
};

export { tasksAtom } from "./base";

// Re-export filtering atoms for backward compatibility
export {
  activeTasksAtom,
  inboxTasksAtom,
  todayTasksAtom,
  upcomingTasksAtom,
  calendarTasksAtom,
  overdueTasksAtom,
  completedTasksAtom,
  projectGroupTasksAtom,
  baseFilteredTasksForViewAtom,
} from "../data/tasks/filters";
