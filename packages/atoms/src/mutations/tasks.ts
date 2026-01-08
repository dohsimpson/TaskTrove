/**
 * Task mutation atoms
 *
 * Contains mutation atoms for task operations:
 * - Creating tasks
 * - Updating tasks
 * - Deleting tasks
 */

import { atom } from "jotai";
import { v4 as uuidv4 } from "uuid";
import { type Project, type Task } from "@tasktrove/types/core";
import { TaskSerializationSchema } from "@tasktrove/types/serialization";
import {
  type CreateTaskRequest,
  type DeleteTaskRequest,
  type UpdateTaskRequest,
  type UpdateProjectRequest,
  type TaskUpdateUnion,
  TaskUpdateArraySerializationSchema,
  TaskDeleteSerializationSchema,
} from "@tasktrove/types/api-requests";
import {
  type CreateTaskResponse,
  CreateTaskResponseSchema,
  type UpdateTaskResponse,
  UpdateTaskResponseSchema,
  type DeleteTaskResponse,
  DeleteTaskResponseSchema,
} from "@tasktrove/types/api-responses";
import {
  createTaskId,
  GroupIdSchema,
  type GroupId,
  type ProjectId,
  type TaskId,
} from "@tasktrove/types/id";
import { INBOX_PROJECT_ID } from "@tasktrove/types/constants";
import {
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_TITLE,
  DEFAULT_TASK_COMPLETED,
  DEFAULT_TASK_LABELS,
  DEFAULT_TASK_SUBTASKS,
  DEFAULT_TASK_COMMENTS,
  DEFAULT_RECURRING_MODE,
  TASKS_QUERY_KEY,
  PROJECTS_QUERY_KEY,
} from "@tasktrove/constants";
import { getDefaultSectionId } from "@tasktrove/types/defaults";
import {
  addTaskToSection,
  removeTaskFromSection,
} from "@tasktrove/atoms/data/tasks/ordering";
import {
  clearNullValues,
  processRecurringTaskCompletion,
} from "@tasktrove/utils";
import { queryClientAtom } from "@tasktrove/atoms/data/base/query";
import { updateProjectsMutationAtom } from "@tasktrove/atoms/mutations/projects";
import { createMutation } from "./factory";
import { createEntityMutation } from "./entity-factory";

// =============================================================================
// TASK MUTATION ATOMS
// =============================================================================

export type TaskCreatePayload = Task & { sectionId?: GroupId };

export const TaskCreatePayloadSchema = TaskSerializationSchema.extend({
  sectionId: GroupIdSchema.optional(),
});

export const buildTaskCreatePayload = (
  taskData: CreateTaskRequest,
): TaskCreatePayload => {
  const baseTask: Task = {
    id: createTaskId(uuidv4()),
    title: taskData.title || DEFAULT_TASK_TITLE,
    description: taskData.description,
    completed: DEFAULT_TASK_COMPLETED,
    archived: taskData.archived,
    priority: taskData.priority ?? DEFAULT_TASK_PRIORITY,
    dueDate: taskData.dueDate
      ? taskData.dueDate instanceof Date
        ? taskData.dueDate
        : new Date(taskData.dueDate)
      : undefined,
    dueTime: taskData.dueTime,
    projectId: taskData.projectId ?? INBOX_PROJECT_ID,
    labels: taskData.labels ?? DEFAULT_TASK_LABELS,
    subtasks: taskData.subtasks ?? DEFAULT_TASK_SUBTASKS,
    comments: taskData.comments ?? DEFAULT_TASK_COMMENTS,
    createdAt: new Date(),
    completedAt: undefined,
    recurring: taskData.recurring,
    recurringMode: taskData.recurringMode ?? DEFAULT_RECURRING_MODE,
    estimation: taskData.estimation,
    trackingId: taskData.trackingId,
  };

  return clearNullValues({
    ...baseTask,
    sectionId: taskData.sectionId,
  });
};

// =============================================================================
// TASK UPDATE HELPERS
// =============================================================================

const cloneTaskSnapshot = (task: Task): Task => ({
  ...task,
  labels: [...task.labels],
  comments: [...task.comments],
  subtasks: task.subtasks.map((subtask) => ({ ...subtask })),
});

const createHistoryTaskFromSnapshot = (
  completedSnapshot: Task,
): TaskCreatePayload =>
  clearNullValues({
    ...cloneTaskSnapshot(completedSnapshot),
    id: createTaskId(uuidv4()),
    completed: true,
    recurring: undefined,
  });

const findSectionIdForTask = (
  taskId: TaskId,
  projects: Project[],
): GroupId | null => {
  for (const project of projects) {
    const section = project.sections.find((s) => s.items.includes(taskId));
    if (section) return section.id;
  }
  return null;
};

interface PreparedTaskUpdates {
  updates: UpdateTaskRequest[];
  historyTasks: TaskCreatePayload[];
}

export const buildTaskUpdatePayloads = (
  updates: TaskUpdateUnion,
  tasks: Task[],
  projects: Project[],
): PreparedTaskUpdates => {
  const updateArray = Array.isArray(updates) ? updates : [updates];
  const updatesForApi: UpdateTaskRequest[] = [];
  const historyTasks: TaskCreatePayload[] = [];
  const taskMap = new Map(tasks.map((task) => [task.id, task]));

  for (const update of updateArray) {
    const existingTask = taskMap.get(update.id);
    if (!existingTask) {
      updatesForApi.push(clearNullValues(update));
      continue;
    }

    const taskId = createTaskId(update.id);
    const sourceProjectId = existingTask.projectId;
    const targetProjectId =
      update.projectId !== undefined ? update.projectId : sourceProjectId;

    const targetProject = projects.find(
      (project) => project.id === targetProjectId,
    );
    const currentSectionId = findSectionIdForTask(taskId, projects);

    const targetSectionId: GroupId | null =
      update.sectionId !== undefined
        ? update.sectionId
        : targetProject && update.projectId !== undefined
          ? getDefaultSectionId(targetProject)
          : currentSectionId;

    const wasCompleted = existingTask.completed;
    let completedAt = existingTask.completedAt;

    if (update.completed !== undefined) {
      if (update.completed && !wasCompleted) {
        completedAt = new Date();
      } else if (!update.completed && wasCompleted) {
        completedAt = undefined;
      }
    }

    const baseUpdate = clearNullValues({
      ...update,
      projectId: targetProjectId,
      sectionId: targetSectionId === null ? undefined : targetSectionId,
      completedAt,
      trackingId: existingTask.trackingId ?? existingTask.id,
    });

    const shouldProcessRecurring =
      update.completed === true && !wasCompleted && !!existingTask.recurring;

    if (shouldProcessRecurring) {
      const completedSnapshot = cloneTaskSnapshot({
        ...existingTask,
        ...baseUpdate,
        completed: true,
        completedAt,
      });

      const nextInstance = processRecurringTaskCompletion(completedSnapshot);

      if (!nextInstance) {
        updatesForApi.push(
          clearNullValues({
            ...baseUpdate,
            completed: true,
            completedAt,
            recurring: undefined,
          }),
        );
        continue;
      }

      const historyTask = createHistoryTaskFromSnapshot(completedSnapshot);
      const historySectionId: GroupId | null =
        targetSectionId ??
        (targetProject ? getDefaultSectionId(targetProject) : currentSectionId);

      historyTasks.push(
        clearNullValues({
          ...historyTask,
          sectionId: historySectionId ?? undefined,
        }),
      );

      updatesForApi.push(
        clearNullValues({
          ...baseUpdate,
          completed: false,
          completedAt: undefined,
          subtasks: nextInstance.subtasks,
          dueDate: nextInstance.dueDate,
          recurring: nextInstance.recurring,
        }),
      );
      continue;
    }

    updatesForApi.push(baseUpdate);
  }

  return { updates: updatesForApi, historyTasks };
};

const cloneSections = (sections: Project["sections"]): Project["sections"] =>
  sections.map((section) => ({
    ...section,
    items: [...section.items],
  }));

const findSectionIdInSections = (
  taskId: TaskId,
  sections: Project["sections"],
): GroupId | null => {
  for (const section of sections) {
    if (section.items.includes(taskId)) return section.id;
  }
  return null;
};

const buildProjectSectionUpdates = (
  updates: UpdateTaskRequest[],
  historyTasks: TaskCreatePayload[],
  tasks: Task[],
  projects: Project[],
): UpdateProjectRequest[] => {
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const sectionsByProject = new Map<ProjectId, Project["sections"]>();
  const touchedProjects = new Set<ProjectId>();

  const getWorkingSections = (
    projectId: ProjectId,
  ): Project["sections"] | undefined => {
    const existing = sectionsByProject.get(projectId);
    if (existing) return existing;

    const project = projectMap.get(projectId);
    if (!project) return undefined;

    const cloned = cloneSections(project.sections);
    sectionsByProject.set(projectId, cloned);
    return cloned;
  };

  for (const update of updates) {
    const existingTask = taskMap.get(update.id);
    if (!existingTask) continue;

    const sourceProjectId = existingTask.projectId ?? null;
    const targetProjectId =
      update.projectId !== undefined ? update.projectId : sourceProjectId;
    const projectChanging =
      update.projectId !== undefined && update.projectId !== sourceProjectId;

    const sourceSections = sourceProjectId
      ? getWorkingSections(sourceProjectId)
      : undefined;
    const currentSectionId = sourceSections
      ? findSectionIdInSections(existingTask.id, sourceSections)
      : null;

    const targetProject = targetProjectId
      ? projectMap.get(targetProjectId)
      : undefined;
    const targetSectionId =
      update.sectionId !== undefined
        ? update.sectionId
        : projectChanging && targetProject
          ? getDefaultSectionId(targetProject)
          : currentSectionId;

    const sectionChanging = targetSectionId !== currentSectionId;
    if (!projectChanging && !sectionChanging) continue;

    if (sourceProjectId && currentSectionId && sourceSections) {
      const updatedSections = removeTaskFromSection(
        existingTask.id,
        currentSectionId,
        sourceSections,
      );
      sectionsByProject.set(sourceProjectId, updatedSections);
      touchedProjects.add(sourceProjectId);
    }

    if (targetProjectId && targetSectionId) {
      const targetSections = getWorkingSections(targetProjectId);
      if (targetSections) {
        const updatedSections = addTaskToSection(
          existingTask.id,
          targetSectionId,
          undefined,
          targetSections,
        );
        sectionsByProject.set(targetProjectId, updatedSections);
        touchedProjects.add(targetProjectId);
      }
    }
  }

  for (const historyTask of historyTasks) {
    const projectId = historyTask.projectId;
    if (!projectId) continue;
    const project = projectMap.get(projectId);
    const sections = getWorkingSections(projectId);
    if (!project || !sections) continue;

    const targetSectionId =
      historyTask.sectionId ?? getDefaultSectionId(project);
    if (!targetSectionId) continue;

    const updatedSections = addTaskToSection(
      historyTask.id,
      targetSectionId,
      undefined,
      sections,
    );
    sectionsByProject.set(projectId, updatedSections);
    touchedProjects.add(projectId);
  }

  return Array.from(touchedProjects).flatMap((projectId) => {
    const sections = sectionsByProject.get(projectId);
    if (!sections) return [];
    return [
      {
        id: projectId,
        sections,
      },
    ];
  });
};

/**
 * Mutation atom for creating new tasks with optimistic updates
 *
 * Creates a new task and optimistically adds it to the task list.
 * The temporary ID will be replaced with the server-generated ID on success.
 */
export const createTaskMutationAtomBase = createMutation<
  CreateTaskResponse,
  TaskCreatePayload,
  Task[],
  Task
>({
  method: "POST",
  operationName: "Created task",
  resourceQueryKey: TASKS_QUERY_KEY,
  defaultResourceValue: [],
  responseSchema: CreateTaskResponseSchema,
  serializationSchema: TaskCreatePayloadSchema,
  testResponseFactory: () => {
    const taskId = createTaskId(uuidv4());
    return {
      success: true,
      taskIds: [taskId],
      message: "Task created successfully (test mode)",
    };
  },
  optimisticDataFactory: (taskPayload: TaskCreatePayload) => {
    const { sectionId, ...task } = taskPayload;
    void sectionId; // section placement handled client-side
    return task;
  },
  optimisticUpdateFn: (
    _taskData: TaskCreatePayload,
    oldTasks: Task[],
    optimisticTask?: Task,
  ) => {
    if (!optimisticTask) throw new Error("Optimistic task not provided");
    return [...oldTasks, optimisticTask];
  },
});

export const createTaskMutationAtom = atom((get) => {
  const baseMutation = get(createTaskMutationAtomBase);

  return {
    ...baseMutation,
    mutateAsync: async (taskData: CreateTaskRequest) => {
      const payload = buildTaskCreatePayload(taskData);
      return baseMutation.mutateAsync(payload);
    },
    mutate: (
      taskData: CreateTaskRequest,
      options?: Parameters<typeof baseMutation.mutate>[1],
    ) => baseMutation.mutate(buildTaskCreatePayload(taskData), options),
  };
});
createTaskMutationAtom.debugLabel = "createTaskMutationAtom";

/**
 * Mutation atom for updating tasks with optimistic updates
 *
 * Updates one or more tasks and optimistically applies changes.
 * Supports both single task and bulk updates.
 *
 * Note: Uses custom optimistic update to handle task-specific logic:
 * - Predicts completedAt changes based on completion status
 * - Converts null to undefined to match API behavior
 * - Invalidates projects cache when tasks move between projects/sections
 */
const updateTasksMutationAtomBase = createEntityMutation<
  Task, // TEntity (individual entity type)
  TaskUpdateUnion, // TRequest (variables)
  UpdateTaskResponse // TResponse
>({
  entity: "task",
  operation: "update",
  schemas: {
    request: TaskUpdateArraySerializationSchema,
    response: UpdateTaskResponseSchema,
  },
  // Task updates only invalidate tasks; project sections are updated client-side when needed
  invalidateQueryKeys: [TASKS_QUERY_KEY],
  // Custom optimistic update for task-specific behavior
  optimisticUpdateFn: (tasks: TaskUpdateUnion, oldTasks: Task[]) => {
    // Convert TaskUpdateUnion to array of individual task updates
    const taskUpdates = Array.isArray(tasks) ? tasks : [tasks];

    // Create a map of new tasks for efficient lookup
    const newTasksMap = new Map(taskUpdates.map((task) => [task.id, task]));

    // Update the tasks array with optimistic data
    return oldTasks.map((task: Task) => {
      const newTask = newTasksMap.get(task.id);
      if (!newTask) return task;

      const sanitizedNewTask: Partial<Task> = clearNullValues({ ...newTask });

      // Since update payloads are now prepared (including completedAt / recurring handling),
      // we only need to merge and normalize null -> undefined for parity with the API.
      return clearNullValues({ ...task, ...sanitizedNewTask });
    });
  },
});

export const updateTasksMutationAtom = atom((get) => {
  const baseMutation = get(updateTasksMutationAtomBase);
  const createMutation = get(createTaskMutationAtomBase);
  const queryClient = get(queryClientAtom);
  const updateProjectsMutation = get(updateProjectsMutationAtom);

  const prepareUpdates = (updates: TaskUpdateUnion): PreparedTaskUpdates => {
    const cachedTasks = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY) ?? [];
    const cachedProjects =
      queryClient.getQueryData<Project[]>(PROJECTS_QUERY_KEY) ?? [];
    return buildTaskUpdatePayloads(updates, cachedTasks, cachedProjects);
  };

  return {
    ...baseMutation,
    mutateAsync: async (updates: TaskUpdateUnion) => {
      const { updates: preparedUpdates, historyTasks } =
        prepareUpdates(updates);
      const cachedTasks =
        queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY) ?? [];
      const cachedProjects =
        queryClient.getQueryData<Project[]>(PROJECTS_QUERY_KEY) ?? [];
      const projectUpdates = buildProjectSectionUpdates(
        preparedUpdates,
        historyTasks,
        cachedTasks,
        cachedProjects,
      );

      const result = await baseMutation.mutateAsync(preparedUpdates);

      if (historyTasks.length > 0) {
        for (const historyTask of historyTasks) {
          await createMutation.mutateAsync(historyTask);
        }
      }

      if (projectUpdates.length > 0) {
        await updateProjectsMutation.mutateAsync(projectUpdates);
      }

      return result;
    },
    mutate: (
      updates: TaskUpdateUnion,
      options?: Parameters<typeof baseMutation.mutate>[1],
    ) => {
      const { updates: preparedUpdates, historyTasks } =
        prepareUpdates(updates);
      const cachedTasks =
        queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY) ?? [];
      const cachedProjects =
        queryClient.getQueryData<Project[]>(PROJECTS_QUERY_KEY) ?? [];
      const projectUpdates = buildProjectSectionUpdates(
        preparedUpdates,
        historyTasks,
        cachedTasks,
        cachedProjects,
      );

      baseMutation.mutate(preparedUpdates, options);

      if (historyTasks.length > 0) {
        historyTasks.forEach((historyTask) => {
          createMutation.mutate(historyTask);
        });
      }

      if (projectUpdates.length > 0) {
        updateProjectsMutation.mutate(projectUpdates);
      }
    },
  };
});
updateTasksMutationAtom.debugLabel = "updateTasksMutationAtom";

/**
 * Mutation atom for deleting tasks
 *
 * Deletes one or more tasks and optimistically removes them from the task list.
 * Supports bulk deletion.
 *
 * Note: Uses default factory - test response and optimistic update auto-generated.
 */
export const deleteTaskMutationAtom = createEntityMutation<
  Task[],
  DeleteTaskRequest,
  DeleteTaskResponse
>({
  entity: "task",
  operation: "delete",
  schemas: {
    request: TaskDeleteSerializationSchema,
    response: DeleteTaskResponseSchema,
  },
  // Everything else is auto-generated by convention!
});
deleteTaskMutationAtom.debugLabel = "deleteTaskMutationAtom";
