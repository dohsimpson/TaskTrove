/**
 * Base atoms for TaskTrove core state management
 *
 * This file contains the raw base atoms without history wrapping
 * to avoid circular dependencies between history.ts and other atom files.
 */

import { atom } from "jotai";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import {
  Task,
  Project,
  Label,
  DataFile,
  INBOX_PROJECT_ID,
  createTaskId,
  createProjectId,
  createSectionId,
  createLabelId,
  TaskUpdateArraySerializationSchema,
  TaskCreateSerializationSchema,
  TaskDeleteSerializationSchema,
  DataFileSchema,
  TaskUpdateUnion,
  UpdateTaskResponseSchema,
  UpdateTaskResponse,
  DeleteTaskResponse,
  DeleteTaskResponseSchema,
  DeleteTaskRequest,
  CreateTaskResponseSchema,
  CreateTaskResponse,
  CreateTaskRequest,
  CreateProjectRequest,
  CreateProjectResponse,
  CreateProjectResponseSchema,
  ProjectCreateSerializationSchema,
  UpdateProjectResponse,
  ProjectUpdateUnion,
  UpdateProjectResponseSchema,
  ProjectUpdateArraySerializationSchema,
  DeleteProjectRequest,
  DeleteProjectResponse,
  DeleteProjectResponseSchema,
  ProjectDeleteSerializationSchema,
  UpdateLabelResponse,
  UpdateLabelResponseSchema,
  LabelUpdateArraySerializationSchema,
  CreateLabelRequest,
  CreateLabelResponse,
  CreateLabelResponseSchema,
  LabelCreateSerializationSchema,
  UpdateTaskRequest,
  DeleteLabelRequest,
  DeleteLabelResponse,
  DeleteLabelResponseSchema,
  LabelDeleteSerializationSchema,
  UpdateSettingsResponse,
  UpdateSettingsResponseSchema,
  UpdateSettingsRequest,
  UpdateSettingsRequestSchema,
  UserSettings,
  PartialUserSettings,
  // User-related types
  User,
  UpdateUserRequest,
  UpdateUserResponse,
  UpdateUserResponseSchema,
  UserUpdateSerializationSchema,
  AvatarFilePath,
  // Group-related types
  ProjectGroup,
  GroupId,
  CreateGroupRequest,
  CreateGroupResponseSchema,
  UpdateProjectGroupRequest,
  UpdateProjectGroupRequestSchema,
  UpdateGroupResponseSchema,
  DeleteGroupRequest,
  DeleteGroupResponseSchema,
  CreateGroupRequestSchema,
  DeleteGroupRequestSchema,
  BulkGroupUpdate,
  BulkGroupUpdateSchema,
  createGroupId,
} from "@tasktrove/types";
import {
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_TITLE,
  DEFAULT_TASK_COMPLETED,
  DEFAULT_PROJECT_COLORS,
  DEFAULT_TASK_STATUS,
  DEFAULT_UUID,
  DEFAULT_TASK_SUBTASKS,
  DEFAULT_TASK_COMMENTS,
  DEFAULT_TASK_ATTACHMENTS,
  DEFAULT_LABEL_COLORS,
  DEFAULT_RECURRING_MODE,
  DEFAULT_AUTO_BACKUP_ENABLED,
  DEFAULT_BACKUP_TIME,
  DEFAULT_MAX_BACKUPS,
} from "@tasktrove/constants";
import {
  ROOT_PROJECT_GROUP_ID,
  ROOT_LABEL_GROUP_ID,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_USER,
} from "@tasktrove/types/defaults";

import {
  createSafeProjectNameSlug,
  createSafeLabelNameSlug,
  createSafeProjectGroupNameSlug,
} from "@tasktrove/utils/routing";
import {
  atomWithQuery,
  atomWithMutation,
  queryClientAtom,
} from "jotai-tanstack-query";

// Re-export queryClientAtom for use in other atoms
export { queryClientAtom };
import { log, toast } from "../utils/atom-helpers";

// =============================================================================
// MUTATION UTILITIES
// =============================================================================

/**
 * Generic mutation context for rollback operations
 */
interface MutationContext<TData = unknown, TVariables = unknown> {
  previousData: unknown;
  variables?: TVariables;
  optimisticData?: TData;
}

/**
 * Utility for creating test environment responses
 */
function createTestResponse<T extends Record<string, unknown>>(
  data: T,
  message: string,
): T & { success: true; message: string } {
  return {
    success: true,
    message: `${message} (test mode)`,
    ...data,
  };
}

/**
 * Utility for handling API errors with detailed messages
 */
async function handleApiError(
  response: Response,
  module: string,
): Promise<never> {
  let errorDetails = `${response.status} ${response.statusText}`;
  try {
    const errorData = await response.json();
    errorDetails = errorData.message || errorData.error || errorDetails;
    log.error({ errorData, module }, "API Error Details");
  } catch (parseError) {
    log.error({ parseError, module }, "Could not parse error response");
  }
  throw new Error(`Failed API request: ${errorDetails}`);
}

/**
 * Default empty cache data structure that matches DataFile schema
 */
const EMPTY_CACHE_DATA: DataFile = {
  tasks: [],
  projects: [],
  labels: [],
  projectGroups: {
    type: "project",
    id: ROOT_PROJECT_GROUP_ID,
    name: "All Projects",
    slug: "all-projects",
    items: [],
  },
  labelGroups: {
    type: "label",
    id: ROOT_LABEL_GROUP_ID,
    name: "All Labels",
    slug: "all-labels",
    items: [],
  },
  settings: {
    data: {
      autoBackup: {
        enabled: DEFAULT_AUTO_BACKUP_ENABLED,
        backupTime: DEFAULT_BACKUP_TIME,
        maxBackups: DEFAULT_MAX_BACKUPS,
      },
    },
    notifications: DEFAULT_NOTIFICATION_SETTINGS,
    general: DEFAULT_GENERAL_SETTINGS,
  },
  user: DEFAULT_USER,
};

/**
 * Type guard to check if data has the expected structure
 */
// TODO: is this function needed?
function isValidCacheData(data: unknown): data is DataFile {
  if (!data || typeof data !== "object") return false;

  // Type narrowing without assertion
  if (!("tasks" in data && "projects" in data && "labels" in data)) {
    return false;
  }

  return !!(
    Array.isArray(data.tasks) &&
    Array.isArray(data.projects) &&
    Array.isArray(data.labels)
  );
}

/**
 * Generic utility for optimistic cache updates
 */
function updateCache(
  queryClient: {
    getQueryData: (key: string[]) => unknown;
    setQueryData: (
      key: string[],
      updater: (oldData: unknown) => unknown,
    ) => void;
  },
  queryKey: string[],
  updater: (oldData: DataFile) => DataFile,
): unknown {
  const previousData = queryClient.getQueryData(queryKey);
  queryClient.setQueryData(queryKey, (oldData: unknown) => {
    if (!isValidCacheData(oldData)) return oldData;
    return updater(oldData);
  });
  return previousData;
}

// =============================================================================
// MUTATION FACTORY ABSTRACTION
// =============================================================================

/**
 * Configuration for creating a generic mutation atom
 */
interface MutationConfig<TResponse, TRequest, TOptimisticData = unknown> {
  method: "POST" | "PATCH" | "DELETE";
  operationName: string;
  responseSchema: z.ZodType<TResponse>;
  serializationSchema: z.ZodType;
  testResponseFactory: (variables: TRequest) => TResponse;
  optimisticUpdateFn: (
    variables: TRequest,
    oldData: DataFile,
    optimisticData?: TOptimisticData,
  ) => DataFile;
  optimisticDataFactory?: (
    variables: TRequest,
    oldData?: DataFile,
  ) => TOptimisticData;
  logModule?: string;
  apiEndpoint?: string; // Optional API endpoint (defaults to '/api/tasks')
  queryKey?: string[]; // Optional query key (defaults to ['tasks'])
}

function createMutation<TResponse, TVariables, TOptimisticData = unknown>(
  config: MutationConfig<TResponse, TVariables, TOptimisticData>,
) {
  const {
    method,
    operationName,
    responseSchema,
    serializationSchema,
    testResponseFactory,
    optimisticUpdateFn,
    optimisticDataFactory,
    logModule = "tasks",
    apiEndpoint = "/api/tasks",
    queryKey = ["tasks"],
  } = config;

  return atomWithMutation<
    TResponse,
    TVariables,
    Error,
    MutationContext<TOptimisticData, TVariables>
  >((get) => ({
    mutationFn: async (variables: TVariables): Promise<TResponse> => {
      // 1. Test environment check - standardized
      if (typeof window === "undefined" || process.env.NODE_ENV === "test") {
        log.info(
          { module: "test" },
          `Test environment: Simulating ${operationName.toLowerCase()}`,
        );
        return testResponseFactory(variables);
      }

      // 2. Input validation/serialization - if schema provided
      let serializedData: unknown = variables;
      const serialized = serializationSchema.safeParse(variables, {
        reportInput: true,
      });
      if (!serialized.success) {
        throw new Error(
          `Failed to serialize ${operationName.toLowerCase()} data: ${serialized.error.message || "Unknown validation error"}`,
        );
      }
      serializedData = serialized.data;

      // 3. API request - standardized
      const response = await fetch(apiEndpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serializedData),
      });

      if (!response.ok) {
        await handleApiError(response, logModule);
      }

      // 4. Response validation - standardized
      const data = await response.json();
      const responseValidation = responseSchema.safeParse(data, {
        reportInput: true,
      });
      if (!responseValidation.success) {
        throw new Error(
          `Failed to parse ${operationName.toLowerCase()} response: ${responseValidation.error.message || "Unknown validation error"}`,
        );
      }

      if (!responseValidation.data) {
        throw new Error(
          `No data returned from ${operationName.toLowerCase()} response`,
        );
      }

      return responseValidation.data;
    },
    onMutate: async (variables: TVariables) => {
      const queryClient = get(queryClientAtom);

      // Cancel queries - standardized
      await queryClient.cancelQueries({ queryKey });

      // Get current data for optimistic factory context
      const currentData = queryClient.getQueryData(queryKey);
      const validCurrentData = isValidCacheData(currentData)
        ? currentData
        : EMPTY_CACHE_DATA;

      // Create optimistic data if factory provided
      const optimisticData = optimisticDataFactory
        ? optimisticDataFactory(variables, validCurrentData)
        : undefined;

      // Optimistic cache update - parameterized logic
      const previousData = updateCache(queryClient, queryKey, (oldData) =>
        optimisticUpdateFn(variables, oldData, optimisticData),
      );

      return { previousData, variables, optimisticData };
    },
    onSuccess: (response: TResponse) => {
      // Success logging - standardized with dynamic count extraction
      // Type guard to check if response has taskIds property
      function hasTaskIds(obj: unknown): obj is { taskIds: string[] } {
        return obj !== null && typeof obj === "object" && "taskIds" in obj;
      }

      const count = hasTaskIds(response) ? response.taskIds.length : 1;
      log.info({ count, module: logModule }, `${operationName} via API`);

      // Success toast notification
      toast.success(`${operationName} successfully`);

      // Cache invalidation - standardized
      const queryClient = get(queryClientAtom);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (
      error: Error,
      variables: TVariables,
      context: MutationContext<TOptimisticData, TVariables> | undefined,
    ) => {
      // Error logging - standardized
      log.error(
        { error, module: logModule },
        `Failed to ${operationName.toLowerCase()} via API`,
      );

      // Error toast notification
      toast.error(`Failed to ${operationName.toLowerCase()}: ${error.message}`);

      // Rollback - standardized
      const queryClient = get(queryClientAtom);
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
  }));
}

// =============================================================================
// BASE TASKS ATOM
// =============================================================================

export const dataQueryAtom = atomWithQuery(() => ({
  queryKey: ["tasks"],
  queryFn: async (): Promise<DataFile> => {
    // Check if we're in a test environment or if API is unavailable
    if (typeof window === "undefined" || process.env.NODE_ENV === "test") {
      // In test environment, return basic test data structure that matches test expectations
      log.info(
        { module: "test" },
        "Test environment: Using test data structure",
      );
      return {
        tasks: [],
        projects: [
          {
            id: createProjectId("12345678-1234-4234-8234-123456789abc"),
            name: "Test Project 1",
            slug: "test-project-1",
            color: "#ef4444",
            shared: false,
            sections: [],
          },
          {
            id: createProjectId("12345678-1234-4234-8234-123456789abd"),
            name: "Test Project 2",
            slug: "test-project-2",
            color: "#10b981",
            shared: false,
            sections: [],
          },
        ],
        labels: [
          {
            id: createLabelId("abcdef01-abcd-4bcd-8bcd-abcdefabcdef"),
            name: "test-urgent",
            slug: "test-urgent",
            color: "#ef4444",
          },
          {
            id: createLabelId("abcdef01-abcd-4bcd-8bcd-abcdefabcde0"),
            name: "test-personal",
            slug: "test-personal",
            color: "#3b82f6",
          },
        ],
        projectGroups: {
          type: "project" as const,
          id: createGroupId("33333333-3333-4333-8333-333333333333"),
          name: "All Projects",
          slug: "all-projects",
          items: [
            {
              type: "project" as const,
              id: createGroupId("11111111-1111-4111-8111-111111111111"),
              name: "Work Projects",
              slug: "work-projects",
              description: "Projects related to work",
              color: "#3b82f6",
              items: [createProjectId("44444444-4444-4444-8444-444444444444")],
            },
            {
              type: "project" as const,
              id: createGroupId("22222222-2222-4222-8222-222222222222"),
              name: "Development",
              slug: "development",
              items: [createProjectId("55555555-5555-4555-8555-555555555555")],
            },
          ],
        },
        labelGroups: {
          type: "label" as const,
          id: createGroupId("88888888-8888-4888-8888-888888888888"),
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
        settings: {
          data: {
            autoBackup: {
              enabled: DEFAULT_AUTO_BACKUP_ENABLED,
              backupTime: DEFAULT_BACKUP_TIME,
              maxBackups: DEFAULT_MAX_BACKUPS,
            },
          },
          notifications: DEFAULT_NOTIFICATION_SETTINGS,
          general: DEFAULT_GENERAL_SETTINGS,
        },
        user: DEFAULT_USER,
      };
    }

    const response = await fetch("/api/tasks");

    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.statusText}`);
    }

    const data = await response.json();
    const parsedResult = DataFileSchema.safeParse(data, { reportInput: true });

    if (!parsedResult.success) {
      console.error(parsedResult.error);
      throw new Error(`Failed to parse tasks: ${parsedResult.error.message}`);
    } else {
      return parsedResult.data;
    }
  },
  // Reduce aggressive refetching to prevent race conditions with optimistic updates
  staleTime: 1000, // Consider data fresh for 1 second
  refetchOnMount: false, // Don't refetch on component mount
  refetchOnWindowFocus: false, // Don't refetch when window regains focus
  refetchInterval: false, // No automatic polling
}));
dataQueryAtom.debugLabel = "dataQueryAtom";

// Mutation atom for updating tasks with optimistic updates
export const updateTasksMutationAtom = createMutation<
  UpdateTaskResponse,
  TaskUpdateUnion,
  Task[]
>({
  method: "PATCH",
  operationName: "Updated tasks",
  responseSchema: UpdateTaskResponseSchema,
  serializationSchema: TaskUpdateArraySerializationSchema,
  testResponseFactory: (tasks: TaskUpdateUnion) => {
    const taskArray = Array.isArray(tasks) ? tasks : [tasks];
    return {
      success: true,
      taskIds: taskArray.map((t) => t.id),
      message: `${taskArray.length} task(s) updated successfully (test mode)`,
    };
  },
  optimisticUpdateFn: (tasks: TaskUpdateUnion, oldData: DataFile) => {
    // Convert TaskUpdateUnion to array of individual task updates
    const taskUpdates = Array.isArray(tasks) ? tasks : [tasks];

    // Create a map of new tasks for efficient lookup
    const newTasksMap = new Map(taskUpdates.map((task) => [task.id, task]));

    // Update the tasks array with optimistic data
    const updatedTasks = oldData.tasks.map((task: Task) => {
      const newTask = newTasksMap.get(task.id);
      if (!newTask) return task;

      // Smart optimistic update: predict what the server will do
      const optimisticTask = { ...task, ...newTask };

      // If completion status is changing, predict completedAt behavior like the backend
      if (
        newTask.completed !== undefined &&
        newTask.completed !== task.completed
      ) {
        if (newTask.completed === true && task.completed === false) {
          // Transitioning from incomplete to complete - set completedAt
          optimisticTask.completedAt = new Date();
        } else if (newTask.completed === false && task.completed === true) {
          // Transitioning from complete to incomplete - clear completedAt
          optimisticTask.completedAt = undefined;
        }
      }

      // Predict null-to-undefined conversion that the API will do
      // This ensures the optimistic update matches what the API will return
      const cleanedTask: Task = {
        ...optimisticTask,
        dueDate:
          optimisticTask.dueDate === null ? undefined : optimisticTask.dueDate,
        dueTime:
          optimisticTask.dueTime === null ? undefined : optimisticTask.dueTime,
        recurring:
          optimisticTask.recurring === null
            ? undefined
            : optimisticTask.recurring,
        estimation:
          optimisticTask.estimation === null
            ? undefined
            : optimisticTask.estimation,
        projectId:
          optimisticTask.projectId === null
            ? undefined
            : optimisticTask.projectId,
      };

      return cleanedTask;
    });

    return {
      ...oldData,
      tasks: updatedTasks,
    };
  },
});
updateTasksMutationAtom.debugLabel = "updateTasksMutationAtom";

// Mutation atom for creating new tasks with optimistic updates
export const createTaskMutationAtom = createMutation<
  CreateTaskResponse,
  CreateTaskRequest,
  Task
>({
  method: "POST",
  operationName: "Created task",
  responseSchema: CreateTaskResponseSchema,
  serializationSchema: TaskCreateSerializationSchema,
  testResponseFactory: () => {
    const taskId = createTaskId(uuidv4());
    return createTestResponse(
      {
        taskIds: [taskId],
      },
      "Task created successfully",
    );
  },
  optimisticDataFactory: (taskData: CreateTaskRequest) => {
    // Create optimistic task with temporary ID
    return {
      id: createTaskId(uuidv4()), // Temporary ID that will be replaced by server response
      completed: DEFAULT_TASK_COMPLETED,
      subtasks: DEFAULT_TASK_SUBTASKS,
      comments: DEFAULT_TASK_COMMENTS,
      attachments: DEFAULT_TASK_ATTACHMENTS,
      status: DEFAULT_TASK_STATUS,
      order: 0,
      createdAt: new Date(), // Always set for new tasks
      completedAt: undefined, // Never set for new tasks
      // Apply all provided data
      ...taskData,
      // Ensure required fields have defaults
      title: taskData.title || DEFAULT_TASK_TITLE,
      priority: taskData.priority || DEFAULT_TASK_PRIORITY,
      sectionId: taskData.sectionId || createSectionId(DEFAULT_UUID),
      projectId: taskData.projectId || INBOX_PROJECT_ID,
      labels: taskData.labels || [],
      // Ensure dates are properly converted if they come in as strings
      dueDate: taskData.dueDate
        ? taskData.dueDate instanceof Date
          ? taskData.dueDate
          : new Date(taskData.dueDate)
        : undefined,
      recurringMode: taskData.recurringMode || DEFAULT_RECURRING_MODE,
    };
  },
  optimisticUpdateFn: (
    taskData: CreateTaskRequest,
    oldData: DataFile,
    optimisticTask?: Task,
  ) => {
    if (!optimisticTask) throw new Error("Optimistic task not provided");

    return {
      ...oldData,
      tasks: [...oldData.tasks, optimisticTask],
    };
  },
});
createTaskMutationAtom.debugLabel = "createTaskMutationAtom";

// Mutation atom for deleting tasks
export const deleteTaskMutationAtom = createMutation<
  DeleteTaskResponse,
  DeleteTaskRequest,
  Task[]
>({
  method: "DELETE",
  operationName: "Deleted task",
  responseSchema: DeleteTaskResponseSchema,
  serializationSchema: TaskDeleteSerializationSchema,
  testResponseFactory: (deleteRequest: DeleteTaskRequest) => {
    const count = deleteRequest.ids.length;
    const message =
      count === 1
        ? "Task deleted successfully"
        : `${count} tasks deleted successfully`;
    return createTestResponse(
      {
        taskIds: deleteRequest.ids,
      },
      message,
    );
  },
  optimisticUpdateFn: (deleteRequest: DeleteTaskRequest, oldData: DataFile) => {
    // Filter out the tasks to be deleted
    const updatedTasks = oldData.tasks.filter(
      (task: Task) => !deleteRequest.ids.includes(task.id),
    );

    return {
      ...oldData,
      tasks: updatedTasks,
    };
  },
});
deleteTaskMutationAtom.debugLabel = "deleteTaskMutationAtom";

// Mutation atom for creating labels
export const createLabelMutationAtom = createMutation<
  CreateLabelResponse,
  CreateLabelRequest,
  Label
>({
  method: "POST",
  operationName: "Created label",
  responseSchema: CreateLabelResponseSchema,
  serializationSchema: LabelCreateSerializationSchema,
  apiEndpoint: "/api/labels",
  logModule: "labels",
  testResponseFactory: () => {
    const labelId = createLabelId(uuidv4());
    return {
      success: true,
      labelIds: [labelId],
      message: "Label created successfully (test mode)",
    };
  },
  optimisticDataFactory: (
    labelData: CreateLabelRequest,
    oldData?: DataFile,
  ) => {
    // Create optimistic label with temporary ID
    return {
      id: createLabelId(uuidv4()), // Temporary ID that will be replaced by server response
      name: labelData.name,
      slug:
        labelData.slug ??
        createSafeLabelNameSlug(labelData.name, oldData?.labels || []),
      color: labelData.color || DEFAULT_LABEL_COLORS[0],
    };
  },
  optimisticUpdateFn: (
    labelData: CreateLabelRequest,
    oldData: DataFile,
    optimisticLabel?: Label,
  ) => {
    if (!optimisticLabel) throw new Error("Optimistic label not provided");

    return {
      ...oldData,
      labels: [...oldData.labels, optimisticLabel],
    };
  },
});
createLabelMutationAtom.debugLabel = "createLabelMutationAtom";

// Mutation atom for creating projects
export const createProjectMutationAtom = createMutation<
  CreateProjectResponse,
  CreateProjectRequest,
  Project
>({
  method: "POST",
  operationName: "Created project",
  responseSchema: CreateProjectResponseSchema,
  serializationSchema: ProjectCreateSerializationSchema,
  apiEndpoint: "/api/projects",
  logModule: "projects",
  testResponseFactory: () => {
    const projectId = createProjectId(uuidv4());
    return {
      success: true,
      projectIds: [projectId],
      message: "Project created successfully (test mode)",
    };
  },
  optimisticDataFactory: (
    projectData: CreateProjectRequest,
    oldData?: DataFile,
  ) => {
    // Create optimistic project with temporary ID
    return {
      id: createProjectId(uuidv4()), // Temporary ID that will be replaced by server response
      name: projectData.name,
      slug:
        projectData.slug ??
        createSafeProjectNameSlug(projectData.name, oldData?.projects || []),
      color: projectData.color ?? DEFAULT_PROJECT_COLORS[0],
      shared: projectData.shared ?? false,
      sections: [
        {
          id: createSectionId(DEFAULT_UUID),
          name: "Default",
          color: "#6b7280",
        },
      ],
    };
  },
  optimisticUpdateFn: (
    projectData: CreateProjectRequest,
    oldData: DataFile,
    optimisticProject?: Project,
  ) => {
    if (!optimisticProject) throw new Error("Optimistic project not provided");

    return {
      ...oldData,
      projects: [...oldData.projects, optimisticProject],
    };
  },
});
createProjectMutationAtom.debugLabel = "createProjectMutationAtom";

// Mutation atom for deleting projects
export const deleteProjectMutationAtom = createMutation<
  DeleteProjectResponse,
  DeleteProjectRequest,
  Project[]
>({
  method: "DELETE",
  operationName: "Deleted project",
  responseSchema: DeleteProjectResponseSchema,
  serializationSchema: ProjectDeleteSerializationSchema,
  apiEndpoint: "/api/projects",
  logModule: "projects",
  testResponseFactory: (deleteRequest: DeleteProjectRequest) => {
    return {
      success: true,
      projectIds: deleteRequest.ids,
      message: "Project(s) deleted successfully (test mode)",
    };
  },
  optimisticUpdateFn: (
    deleteRequest: DeleteProjectRequest,
    oldData: DataFile,
  ) => {
    // Filter out the projects to be deleted
    const updatedProjects = oldData.projects.filter(
      (project: Project) => !deleteRequest.ids.includes(project.id),
    );

    return {
      ...oldData,
      projects: updatedProjects,
    };
  },
});
// Mutation atom for deleting labels
export const deleteLabelMutationAtom = createMutation<
  DeleteLabelResponse,
  DeleteLabelRequest,
  Label[]
>({
  method: "DELETE",
  operationName: "Deleted label",
  responseSchema: DeleteLabelResponseSchema,
  serializationSchema: LabelDeleteSerializationSchema,
  apiEndpoint: "/api/labels",
  logModule: "labels",
  testResponseFactory: (labelId: DeleteLabelRequest) => {
    return {
      success: true,
      labelIds: [labelId.id],
      message: "Label deleted successfully (test mode)",
    };
  },
  optimisticUpdateFn: (labelId: DeleteLabelRequest, oldData: DataFile) => {
    // Filter out the label to be deleted
    const updatedLabels = oldData.labels.filter(
      (label: Label) => label.id !== labelId.id,
    );

    return {
      ...oldData,
      labels: updatedLabels,
    };
  },
});
deleteLabelMutationAtom.debugLabel = "deleteLabelMutationAtom";
deleteProjectMutationAtom.debugLabel = "deleteProjectMutationAtom";

// =============================================================================
// GROUP CRUD MUTATION ATOMS
// =============================================================================

// Mutation atom for creating project groups
export const createProjectGroupMutationAtom = createMutation({
  method: "POST",
  operationName: "Created group",
  responseSchema: CreateGroupResponseSchema,
  serializationSchema: CreateGroupRequestSchema,
  apiEndpoint: "/api/groups",
  logModule: "groups",
  testResponseFactory: () => ({
    success: true,
    groupIds: [createGroupId(uuidv4())],
    message: "Group created successfully (test mode)",
  }),
  optimisticDataFactory: (request: CreateGroupRequest): ProjectGroup => {
    if (request.type !== "project") {
      throw new Error(
        "Create project group mutation received non-project group request",
      );
    }
    return {
      type: "project",
      id: createGroupId(uuidv4()),
      name: request.name,
      slug: createSafeProjectGroupNameSlug(request.name, undefined),
      description: request.description,
      color: request.color,
      items: [],
    };
  },
  optimisticUpdateFn: (
    request: CreateGroupRequest,
    oldData: DataFile,
    optimisticGroup?: ProjectGroup,
  ) => {
    if (!optimisticGroup) throw new Error("Optimistic group not provided");

    return {
      ...oldData,
      projectGroups: {
        ...oldData.projectGroups,
        items: [...oldData.projectGroups.items, optimisticGroup],
      },
    };
  },
});
createProjectGroupMutationAtom.debugLabel = "createProjectGroupMutationAtom";

// Mutation atom for updating project groups
export const updateProjectGroupMutationAtom = createMutation({
  method: "PATCH",
  operationName: "Updated group",
  responseSchema: UpdateGroupResponseSchema,
  serializationSchema: UpdateProjectGroupRequestSchema,
  apiEndpoint: "/api/groups",
  logModule: "groups",
  testResponseFactory: (request: UpdateProjectGroupRequest) => {
    return {
      success: true,
      groups: [
        {
          type: "project" as const,
          id: request.id,
          name: request.name || "Updated Group",
          slug: request.slug || "updated-group",
          description: request.description,
          color: request.color,
          items: request.items || [],
        },
      ],
      count: 1,
      message: "Group updated successfully (test mode)",
    };
  },
  optimisticUpdateFn: (
    request: UpdateProjectGroupRequest,
    oldData: DataFile,
  ) => {
    const updateRequest = Array.isArray(request) ? request : [request];

    // Helper function to recursively update groups within ROOT structure
    const updateGroupInTree = (group: ProjectGroup): ProjectGroup => {
      const update = updateRequest.find((u) => u.id === group.id);
      if (update) {
        return {
          ...group,
          ...(update.name && { name: update.name }),
          ...(update.description && { description: update.description }),
          ...(update.color && { color: update.color }),
          ...(update.items && { items: update.items }),
        };
      }

      // Recursively update nested groups in items
      return {
        ...group,
        items: group.items.map((item) => {
          if (typeof item === "string") {
            return item; // ProjectId, leave unchanged
          } else {
            return updateGroupInTree(item); // Nested ProjectGroup, recurse
          }
        }),
      };
    };

    return {
      ...oldData,
      projectGroups: updateGroupInTree(oldData.projectGroups),
    };
  },
});
updateProjectGroupMutationAtom.debugLabel = "updateProjectGroupMutationAtom";

// Mutation atom for deleting project groups
export const deleteProjectGroupMutationAtom = createMutation({
  method: "DELETE",
  operationName: "Deleted group",
  responseSchema: DeleteGroupResponseSchema,
  serializationSchema: DeleteGroupRequestSchema,
  apiEndpoint: "/api/groups",
  logModule: "groups",
  testResponseFactory: (request: DeleteGroupRequest) => ({
    success: true,
    deletedCount: 1,
    groupIds: [request.id],
    message: "Group deleted successfully (test mode)",
  }),
  optimisticUpdateFn: (request: DeleteGroupRequest, oldData: DataFile) => {
    // Cannot delete the ROOT group itself
    if (oldData.projectGroups.id === request.id) {
      return oldData;
    }

    // Remove the group recursively from ROOT group structure
    const removeGroupFromTree = (
      group: ProjectGroup,
      targetId: GroupId,
    ): ProjectGroup => {
      return {
        ...group,
        items: group.items
          .filter((item) => {
            if (typeof item === "string") return true; // Keep project IDs
            return item.id !== targetId; // Remove matching groups
          })
          .map((item) => {
            if (typeof item === "string") return item; // ProjectId, leave unchanged
            return removeGroupFromTree(item, targetId); // Recursively clean nested groups
          }),
      };
    };

    return {
      ...oldData,
      projectGroups: removeGroupFromTree(oldData.projectGroups, request.id),
    };
  },
});
deleteProjectGroupMutationAtom.debugLabel = "deleteProjectGroupMutationAtom";

// Mutation atom for bulk group updates (reordering)
export const bulkUpdateGroupsMutationAtom = createMutation({
  method: "PATCH",
  operationName: "Bulk updated groups",
  responseSchema: UpdateGroupResponseSchema,
  serializationSchema: BulkGroupUpdateSchema,
  apiEndpoint: "/api/groups",
  logModule: "groups",
  testResponseFactory: (request: BulkGroupUpdate) => ({
    success: true,
    groups: request.groups,
    count: request.groups.length,
    message: `${request.groups.length} ${request.type} group(s) bulk updated successfully (test mode)`,
  }),
  optimisticUpdateFn: (request: BulkGroupUpdate, oldData: DataFile) => {
    // Replace ROOT group's items array based on type
    if (request.type === "project") {
      return {
        ...oldData,
        projectGroups: {
          ...oldData.projectGroups,
          items: request.groups,
        },
      };
    } else {
      return {
        ...oldData,
        labelGroups: {
          ...oldData.labelGroups,
          items: request.groups,
        },
      };
    }
    return oldData;
  },
});
bulkUpdateGroupsMutationAtom.debugLabel = "bulkUpdateGroupsMutationAtom";

export const tasksAtom = atom(
  (get) => {
    const result = get(dataQueryAtom);
    if ("data" in result) {
      return result.data?.tasks ?? [];
    }
    return [];
  },
  async (get, set, tasks: UpdateTaskRequest[]) => {
    try {
      // Get the mutation function
      const mutation = get(updateTasksMutationAtom);

      // Execute the mutation - this will handle invalidation automatically
      await mutation.mutateAsync(tasks);
    } catch (error) {
      log.error(
        { error, module: "tasks" },
        "Failed to update tasks in createTaskMutationAtom",
      );
      throw error;
    }
  },
);
tasksAtom.debugLabel = "tasksAtom";

// =============================================================================
// BASE PROJECTS ATOM
// =============================================================================

// Mutation atom for updating projects with optimistic updates
export const updateProjectsMutationAtom = createMutation<
  UpdateProjectResponse,
  ProjectUpdateUnion,
  Project[]
>({
  method: "PATCH",
  operationName: "Updated projects",
  responseSchema: UpdateProjectResponseSchema,
  serializationSchema: ProjectUpdateArraySerializationSchema,
  apiEndpoint: "/api/projects",
  logModule: "projects",
  testResponseFactory: (projects: ProjectUpdateUnion) => {
    const projectArray = Array.isArray(projects) ? projects : [projects];
    return {
      success: true,
      projectIds: projectArray.map((p) => p.id),
      message: `${projectArray.length} project(s) updated successfully (test mode)`,
    };
  },
  optimisticUpdateFn: (projects: ProjectUpdateUnion, oldData: DataFile) => {
    // Convert ProjectUpdateUnion to array of individual project updates
    const projectUpdates = Array.isArray(projects) ? projects : [projects];

    // Create a map of new projects for efficient lookup
    const newProjectsMap = new Map(
      projectUpdates.map((project) => [project.id, project]),
    );

    // Update the projects array with optimistic data
    const updatedProjects = oldData.projects.map((project: Project) => {
      const newProject = newProjectsMap.get(project.id);
      if (!newProject) return project;

      // Smart optimistic update: merge the changes
      return { ...project, ...newProject };
    });

    return {
      ...oldData,
      projects: updatedProjects,
    };
  },
});
updateProjectsMutationAtom.debugLabel = "updateProjectsMutationAtom";

export const projectsAtom = atom(
  (get) => {
    const result = get(dataQueryAtom);
    if ("data" in result) {
      return result.data?.projects ?? [];
    }
    return [];
  },
  async (get, set, projects: Project[]) => {
    try {
      // Get the mutation function
      const mutation = get(updateProjectsMutationAtom);

      // Execute the mutation - this will handle optimistic updates automatically
      await mutation.mutateAsync(projects);
    } catch (error) {
      log.error({ error, module: "projects" }, "Failed to update projects");
      throw error;
    }
  },
);
projectsAtom.debugLabel = "projectsAtom";

// =============================================================================
// BASE LABELS ATOM
// =============================================================================

// Mutation atom for updating labels with optimistic updates
export const updateLabelsMutationAtom = createMutation<
  UpdateLabelResponse,
  Label[],
  Label[]
>({
  method: "PATCH",
  operationName: "Updated labels",
  responseSchema: UpdateLabelResponseSchema,
  serializationSchema: LabelUpdateArraySerializationSchema,
  apiEndpoint: "/api/labels",
  logModule: "labels",
  testResponseFactory: (labels: Label[]) => {
    return {
      success: true,
      labelIds: labels.map((l) => l.id),
      message: `${labels.length} label(s) updated successfully (test mode)`,
    };
  },
  optimisticUpdateFn: (newLabels: Label[], oldData: DataFile) => {
    return {
      ...oldData,
      labels: newLabels,
    };
  },
});
updateLabelsMutationAtom.debugLabel = "updateLabelsMutationAtom";

export const labelsAtom = atom(
  (get) => {
    const result = get(dataQueryAtom);
    if ("data" in result) {
      return result.data?.labels ?? [];
    }
    return [];
  },
  async (get, set, labels: Label[]) => {
    try {
      // Get the mutation function
      const mutation = get(updateLabelsMutationAtom);

      // Execute the mutation - this will handle optimistic updates automatically
      await mutation.mutateAsync(labels);
    } catch (error) {
      log.error({ error, module: "labels" }, "Failed to update labels");
      throw error;
    }
  },
);
labelsAtom.debugLabel = "labelsAtom";

// =============================================================================
// SETTINGS ATOMS
// =============================================================================

/**
 * Settings query atom - follows same pattern as dataQueryAtom but for settings
 */

// Mutation atom for updating settings with optimistic updates
export const updateSettingsMutationAtom = createMutation<
  UpdateSettingsResponse,
  UpdateSettingsRequest
>({
  method: "PATCH",
  operationName: "Updated settings",
  responseSchema: UpdateSettingsResponseSchema,
  serializationSchema: UpdateSettingsRequestSchema,
  apiEndpoint: "/api/settings",
  logModule: "settings",
  testResponseFactory: (variables: UpdateSettingsRequest) => {
    // For test mode, construct a complete UserSettings from the partial updates
    const testUserSettings: UserSettings = {
      data: {
        autoBackup: {
          enabled:
            variables.settings.data?.autoBackup?.enabled ??
            DEFAULT_AUTO_BACKUP_ENABLED,
          backupTime:
            variables.settings.data?.autoBackup?.backupTime ??
            DEFAULT_BACKUP_TIME,
          maxBackups:
            variables.settings.data?.autoBackup?.maxBackups ??
            DEFAULT_MAX_BACKUPS,
        },
      },
      notifications: {
        enabled:
          variables.settings.notifications?.enabled ??
          DEFAULT_NOTIFICATION_SETTINGS.enabled,
        requireInteraction:
          variables.settings.notifications?.requireInteraction ??
          DEFAULT_NOTIFICATION_SETTINGS.requireInteraction,
      },
      general: {
        startView:
          variables.settings.general?.startView ??
          DEFAULT_GENERAL_SETTINGS.startView,
        soundEnabled:
          variables.settings.general?.soundEnabled ??
          DEFAULT_GENERAL_SETTINGS.soundEnabled,
        linkifyEnabled:
          variables.settings.general?.linkifyEnabled ??
          DEFAULT_GENERAL_SETTINGS.linkifyEnabled,
        popoverHoverOpen:
          variables.settings.general?.popoverHoverOpen ??
          DEFAULT_GENERAL_SETTINGS.popoverHoverOpen,
      },
    };
    return {
      success: true,
      settings: testUserSettings,
      message: "Settings updated successfully (test mode)",
    };
  },
  optimisticUpdateFn: (variables: UpdateSettingsRequest, oldData: DataFile) => {
    // Merge partial settings with current settings, preserving existing values
    const updatedSettings: UserSettings = {
      data: {
        autoBackup: {
          enabled:
            variables.settings.data?.autoBackup?.enabled ??
            oldData.settings.data.autoBackup.enabled,
          backupTime:
            variables.settings.data?.autoBackup?.backupTime ??
            oldData.settings.data.autoBackup.backupTime,
          maxBackups:
            variables.settings.data?.autoBackup?.maxBackups ??
            oldData.settings.data.autoBackup.maxBackups,
        },
      },
      notifications: {
        enabled:
          variables.settings.notifications?.enabled ??
          oldData.settings.notifications.enabled,
        requireInteraction:
          variables.settings.notifications?.requireInteraction ??
          oldData.settings.notifications.requireInteraction,
      },
      general: {
        startView:
          variables.settings.general?.startView ??
          oldData.settings.general.startView,
        soundEnabled:
          variables.settings.general?.soundEnabled ??
          oldData.settings.general.soundEnabled,
        linkifyEnabled:
          variables.settings.general?.linkifyEnabled ??
          oldData.settings.general.linkifyEnabled,
        popoverHoverOpen:
          variables.settings.general?.popoverHoverOpen ??
          oldData.settings.general.popoverHoverOpen,
      },
    };

    return {
      ...oldData,
      settings: updatedSettings,
    };
  },
});
updateSettingsMutationAtom.debugLabel = "updateSettingsMutationAtom";

// Base settings atom - provides read access to current settings
export const settingsAtom = atom(
  (get) => {
    const result = get(dataQueryAtom);
    if ("data" in result && result.data) {
      return result.data.settings;
    }
    // Return minimal default settings
    const defaultSettings: UserSettings = {
      data: {
        autoBackup: {
          enabled: DEFAULT_AUTO_BACKUP_ENABLED,
          backupTime: DEFAULT_BACKUP_TIME,
          maxBackups: DEFAULT_MAX_BACKUPS,
        },
      },
      notifications: DEFAULT_NOTIFICATION_SETTINGS,
      general: DEFAULT_GENERAL_SETTINGS,
    };
    return defaultSettings;
  },
  async (get, set, partialSettings: PartialUserSettings) => {
    try {
      // Get the mutation function
      const mutation = get(updateSettingsMutationAtom);

      // Execute the mutation - this will handle optimistic updates and API persistence
      await mutation.mutateAsync({ settings: partialSettings });
    } catch (error) {
      log.error(
        { error, module: "settings" },
        "Failed to update settings in settingsAtom",
      );
      throw error;
    }
  },
);
settingsAtom.debugLabel = "settingsAtom";

// =============================================================================
// USER MANAGEMENT ATOMS
// =============================================================================

/**
 * Current user data atom
 * Read: Gets current user from data query
 * Write: Updates user via API
 */
export const userAtom = atom(
  (get) => {
    const result = get(dataQueryAtom);
    if ("data" in result && result.data) {
      return result.data.user;
    }
    // Return default user if no data
    return DEFAULT_USER;
  },
  async (get, set, updateUserRequest: UpdateUserRequest) => {
    try {
      // Get the mutation function
      const mutation = get(updateUserMutationAtom);

      // Execute the mutation - this will handle optimistic updates and API persistence
      await mutation.mutateAsync(updateUserRequest);
    } catch (error) {
      log.error({ error, module: "user" }, "Failed to update user in userAtom");
      throw error;
    }
  },
);
userAtom.debugLabel = "userAtom";

/**
 * User update mutation atom
 */
export const updateUserMutationAtom = createMutation<
  UpdateUserResponse,
  UpdateUserRequest
>({
  method: "PATCH",
  operationName: "Updated user",
  responseSchema: UpdateUserResponseSchema,
  serializationSchema: UserUpdateSerializationSchema,
  apiEndpoint: "/api/user",
  logModule: "user",
  testResponseFactory: (variables: UpdateUserRequest) => {
    // For test mode, merge updates with default user
    // Simulate avatar conversion: base64 -> file path (in real API, this would save the file)
    let simulatedAvatarPath: AvatarFilePath | undefined = DEFAULT_USER.avatar;
    if (variables.avatar !== undefined) {
      if (variables.avatar === null) {
        // User wants to remove avatar
        simulatedAvatarPath = undefined;
      } else {
        // User uploaded new avatar (base64) - simulate saving as file
        simulatedAvatarPath =
          "assets/avatar/simulated-test-avatar.png" as AvatarFilePath;
      }
    }

    const testUser: User = {
      username: variables.username ?? DEFAULT_USER.username,
      password: variables.password ?? DEFAULT_USER.password,
      avatar: simulatedAvatarPath,
    };
    return {
      success: true,
      user: testUser,
      message: "User updated successfully (test mode)",
    };
  },
  optimisticUpdateFn: (variables: UpdateUserRequest, oldData: DataFile) => {
    // Merge partial user updates with current user data
    const updatedUser: User = {
      username: variables.username ?? oldData.user.username,
      password: variables.password ?? oldData.user.password,
      avatar: oldData.user.avatar,
    };

    return {
      ...oldData,
      user: updatedUser,
    };
  },
});
