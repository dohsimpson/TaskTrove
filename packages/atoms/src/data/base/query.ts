/**
 * Data query atoms for TaskTrove
 *
 * Individual query atoms for each resource type, following REST best practices.
 * Each resource is fetched independently from its own API endpoint.
 *
 * Benefits:
 * - Granular cache invalidation (invalidate ["data", "tasks"] vs ["data"])
 * - Independent loading states per resource
 * - Parallel fetching with better error isolation
 * - Hierarchical query keys for flexible cache management
 */

import { atomWithQuery, queryClientAtom } from "jotai-tanstack-query";

// Re-export queryClientAtom for use in mutations
export { queryClientAtom };
import type {
  Task,
  Project,
  Label,
  ProjectGroup,
  LabelGroup,
  UserSettings,
  User,
} from "@tasktrove/types";
import {
  GetTasksResponseSchema,
  GetProjectsResponseSchema,
  GetLabelsResponseSchema,
  GetGroupsResponseSchema,
  GetSettingsResponseSchema,
  GetUserResponseSchema,
  TaskSchema,
  ProjectSchema,
  LabelSchema,
  ProjectGroupSchema,
  LabelGroupSchema,
  UserSettingsSchema,
  UserSchema,
  createProjectId,
  createLabelId,
  createGroupId,
  API_ROUTES,
} from "@tasktrove/types";
import {
  DEFAULT_AUTO_BACKUP_ENABLED,
  DEFAULT_BACKUP_TIME,
  DEFAULT_MAX_BACKUPS,
} from "@tasktrove/constants";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_USER,
} from "@tasktrove/types/defaults";
import { log } from "../../utils/atom-helpers";

// =============================================================================
// Test Data
// =============================================================================

const TEST_TASKS: Task[] = [];

const TEST_PROJECTS: Project[] = [
  {
    id: createProjectId("12345678-1234-4234-8234-123456789abc"),
    name: "Test Project 1",
    slug: "test-project-1",
    color: "#ef4444",
    sections: [],
  },
  {
    id: createProjectId("12345678-1234-4234-8234-123456789abd"),
    name: "Test Project 2",
    slug: "test-project-2",
    color: "#10b981",
    sections: [],
  },
];

const TEST_LABELS: Label[] = [
  {
    id: createLabelId("abcdef01-abcd-4bcd-8bcd-abcdefabcdef"),
    name: "Test Label",
    slug: "test-label",
    color: "#ef4444",
  },
  {
    id: createLabelId("abcdef01-abcd-4bcd-8bcd-abcdefabcde0"),
    name: "test-personal",
    slug: "test-personal",
    color: "#3b82f6",
  },
];

const TEST_PROJECT_GROUPS: ProjectGroup = {
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
};

const TEST_LABEL_GROUPS: LabelGroup = {
  type: "label" as const,
  id: createGroupId("88888888-8888-4888-8888-888888888888"),
  name: "All Labels",
  slug: "all-labels",
  items: [],
};

const TEST_SETTINGS: UserSettings = {
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

const TEST_USER: User = DEFAULT_USER;

// =============================================================================
// Helper: Generic fetch with validation
// =============================================================================

/**
 * Generic fetch helper with Zod validation (DRY principle)
 */
async function fetchAndValidate<T>(
  url: string,
  schema: {
    safeParse: (data: unknown) => {
      success: boolean;
      data?: T;
      error?: unknown;
    };
  },
  resourceName: string,
): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${resourceName}: ${response.statusText}`);
  }

  const data = await response.json();
  const result = schema.safeParse(data);

  if (!result.success) {
    console.error(`${resourceName} validation error:`, result.error);
    throw new Error(`Failed to parse ${resourceName}`);
  }

  if (!result.data) {
    throw new Error(`No data returned for ${resourceName}`);
  }

  return result.data;
}

// =============================================================================
// Individual Fetchers (KISS principle - one responsibility each)
// =============================================================================

async function fetchTasks(): Promise<Task[]> {
  if (typeof window === "undefined" || process.env.NODE_ENV === "test") {
    log.info({ module: "test" }, "Test environment: Using test tasks");
    return TEST_TASKS;
  }

  const response = await fetchAndValidate(
    API_ROUTES.V1_TASKS,
    GetTasksResponseSchema,
    "tasks",
  );

  // Parse each task to convert serialized dates to Date objects
  return response.tasks.map((task) => TaskSchema.parse(task));
}

async function fetchProjects(): Promise<Project[]> {
  if (typeof window === "undefined" || process.env.NODE_ENV === "test") {
    log.info({ module: "test" }, "Test environment: Using test projects");
    return TEST_PROJECTS;
  }

  const response = await fetchAndValidate(
    API_ROUTES.V1_PROJECTS,
    GetProjectsResponseSchema,
    "projects",
  );

  // Parse each project to ensure proper types
  return response.projects.map((project) => ProjectSchema.parse(project));
}

async function fetchLabels(): Promise<Label[]> {
  if (typeof window === "undefined" || process.env.NODE_ENV === "test") {
    log.info({ module: "test" }, "Test environment: Using test labels");
    return TEST_LABELS;
  }

  const response = await fetchAndValidate(
    API_ROUTES.V1_LABELS,
    GetLabelsResponseSchema,
    "labels",
  );

  // Parse each label to ensure proper types
  return response.labels.map((label) => LabelSchema.parse(label));
}

async function fetchGroups(): Promise<{
  projectGroups: ProjectGroup;
  labelGroups: LabelGroup;
}> {
  if (typeof window === "undefined" || process.env.NODE_ENV === "test") {
    log.info({ module: "test" }, "Test environment: Using test groups");
    return {
      projectGroups: TEST_PROJECT_GROUPS,
      labelGroups: TEST_LABEL_GROUPS,
    };
  }

  const response = await fetchAndValidate(
    API_ROUTES.V1_GROUPS,
    GetGroupsResponseSchema,
    "groups",
  );

  // Parse groups to ensure proper types
  return {
    projectGroups: ProjectGroupSchema.parse(response.projectGroups),
    labelGroups: LabelGroupSchema.parse(response.labelGroups),
  };
}

async function fetchSettings(): Promise<UserSettings> {
  if (typeof window === "undefined" || process.env.NODE_ENV === "test") {
    log.info({ module: "test" }, "Test environment: Using test settings");
    return TEST_SETTINGS;
  }

  const response = await fetchAndValidate(
    API_ROUTES.SETTINGS,
    GetSettingsResponseSchema,
    "settings",
  );

  // Parse settings to ensure proper types
  return UserSettingsSchema.parse(response.settings);
}

async function fetchUser(): Promise<User> {
  if (typeof window === "undefined" || process.env.NODE_ENV === "test") {
    log.info({ module: "test" }, "Test environment: Using test user");
    return TEST_USER;
  }

  const response = await fetchAndValidate(
    API_ROUTES.USER,
    GetUserResponseSchema,
    "user",
  );

  // Parse user to ensure proper types
  return UserSchema.parse(response.user);
}

// =============================================================================
// Query Configuration (DRY - shared config)
// =============================================================================

const QUERY_CONFIG = {
  staleTime: 1000, // Consider data fresh for 1 second
  refetchOnMount: false, // Don't refetch on component mount
  refetchOnWindowFocus: false, // Don't refetch when window regains focus
  refetchInterval: false, // No automatic polling
} as const;

// =============================================================================
// Individual Query Atoms (hierarchical keys for granular invalidation)
// =============================================================================

/**
 * Tasks query atom
 * Query key: ["data", "tasks"]
 * Invalidate: queryClient.invalidateQueries({ queryKey: ["data", "tasks"] })
 */
export const tasksQueryAtom = atomWithQuery(() => ({
  queryKey: ["data", "tasks"],
  queryFn: fetchTasks,
  ...QUERY_CONFIG,
}));
tasksQueryAtom.debugLabel = "tasksQueryAtom";

/**
 * Projects query atom
 * Query key: ["data", "projects"]
 * Invalidate: queryClient.invalidateQueries({ queryKey: ["data", "projects"] })
 */
export const projectsQueryAtom = atomWithQuery(() => ({
  queryKey: ["data", "projects"],
  queryFn: fetchProjects,
  ...QUERY_CONFIG,
}));
projectsQueryAtom.debugLabel = "projectsQueryAtom";

/**
 * Labels query atom
 * Query key: ["data", "labels"]
 * Invalidate: queryClient.invalidateQueries({ queryKey: ["data", "labels"] })
 */
export const labelsQueryAtom = atomWithQuery(() => ({
  queryKey: ["data", "labels"],
  queryFn: fetchLabels,
  ...QUERY_CONFIG,
}));
labelsQueryAtom.debugLabel = "labelsQueryAtom";

/**
 * Groups query atom (both project and label groups)
 * Query key: ["data", "groups"]
 * Invalidate: queryClient.invalidateQueries({ queryKey: ["data", "groups"] })
 */
export const groupsQueryAtom = atomWithQuery(() => ({
  queryKey: ["data", "groups"],
  queryFn: fetchGroups,
  ...QUERY_CONFIG,
}));
groupsQueryAtom.debugLabel = "groupsQueryAtom";

/**
 * Settings query atom
 * Query key: ["data", "settings"]
 * Invalidate: queryClient.invalidateQueries({ queryKey: ["data", "settings"] })
 */
export const settingsQueryAtom = atomWithQuery(() => ({
  queryKey: ["data", "settings"],
  queryFn: fetchSettings,
  ...QUERY_CONFIG,
}));
settingsQueryAtom.debugLabel = "settingsQueryAtom";

/**
 * User query atom
 * Query key: ["data", "user"]
 * Invalidate: queryClient.invalidateQueries({ queryKey: ["data", "user"] })
 */
export const userQueryAtom = atomWithQuery(() => ({
  queryKey: ["data", "user"],
  queryFn: fetchUser,
  ...QUERY_CONFIG,
}));
userQueryAtom.debugLabel = "userQueryAtom";
