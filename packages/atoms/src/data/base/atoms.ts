/**
 * Base data atoms - derived from individual query atoms
 * These unwrap query results and provide clean data interfaces to the application
 *
 * Architecture:
 * Query Atoms (server state) → Derived Atoms (unwrap + defaults) → UI
 *
 * Benefits:
 * - Hides TanStack Query mechanics from business logic
 * - Provides sensible defaults (empty arrays, fallback values)
 * - Simple interface for components (no query state handling)
 */

import { atom } from "jotai";
import {
  tasksQueryAtom,
  projectsQueryAtom,
  labelsQueryAtom,
  settingsQueryAtom,
  userQueryAtom,
} from "@tasktrove/atoms/data/base/query";
import type { Task, Project, Label, User } from "@tasktrove/types/core";
import type { TaskId } from "@tasktrove/types/id";
import type {
  UserSettings,
  PartialUserSettings,
} from "@tasktrove/types/settings";
import type {
  UpdateTaskRequest,
  UpdateUserRequest,
} from "@tasktrove/types/api-requests";
import { DEFAULT_USER, DEFAULT_USER_SETTINGS } from "@tasktrove/types/defaults";
import {
  log,
  namedAtom,
  withErrorHandling,
} from "@tasktrove/atoms/utils/atom-helpers";

// Import mutation atoms that are referenced in write functions
import { updateTasksMutationAtom } from "@tasktrove/atoms/mutations/tasks";
import { updateProjectsMutationAtom } from "@tasktrove/atoms/mutations/projects";
import { updateLabelsMutationAtom } from "@tasktrove/atoms/mutations/labels";
import { updateSettingsMutationAtom } from "@tasktrove/atoms/mutations/settings";
import { updateUserMutationAtom } from "@tasktrove/atoms/mutations/user";

// =============================================================================
// BASE TASKS ATOM
// =============================================================================

/**
 * Base tasks atom - unwraps tasks from tasksQueryAtom
 * Write: Updates tasks via mutation atom
 *
 * @read Returns array of all tasks (empty array if loading/error)
 * @write Accepts array of task updates and applies via API
 */
export const tasksAtom = namedAtom(
  "tasksAtom",
  atom(
    (get) => {
      const query = get(tasksQueryAtom);
      return query.data ?? [];
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
  ),
);

/**
 * Task lookup by ID atom - provides O(1) task lookup via Map
 *
 * Derives from tasksAtom to create an indexed view for fast lookups.
 * Located in data layer as it's a simple transformation of the base data atom.
 *
 * @read Returns Map<TaskId, Task> for O(1) lookups
 */
export const taskByIdAtom = namedAtom(
  "taskByIdAtom",
  atom((get) =>
    withErrorHandling(
      () => {
        const tasks = get(tasksAtom);
        const taskMap = new Map<TaskId, Task>();
        for (const task of tasks) {
          taskMap.set(task.id, task);
        }
        return taskMap;
      },
      "taskByIdAtom",
      new Map<TaskId, Task>(),
    ),
  ),
);

// =============================================================================
// BASE PROJECTS ATOM
// =============================================================================

/**
 * Base projects atom - unwraps projects from projectsQueryAtom
 * Write: Updates projects via mutation atom
 *
 * @read Returns array of all projects (empty array if loading/error)
 * @write Accepts array of projects and updates via API
 */
export const projectsAtom = atom(
  (get) => {
    const query = get(projectsQueryAtom);
    return query.data ?? [];
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

/**
 * Base labels atom - unwraps labels from labelsQueryAtom
 * Write: Updates labels via mutation atom
 *
 * @read Returns array of all labels (empty array if loading/error)
 * @write Accepts array of labels and updates via API
 */
export const labelsAtom = namedAtom(
  "labelsAtom",
  atom(
    (get) => {
      const query = get(labelsQueryAtom);
      return query.data ?? [];
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
  ),
);

// =============================================================================
// SETTINGS ATOM
// =============================================================================

/**
 * Base settings atom - unwraps settings from settingsQueryAtom
 * Write: Updates settings via mutation atom
 *
 * @read Returns current user settings (defaults if loading/error)
 * @write Accepts partial settings and updates via API
 */
export const settingsAtom = atom(
  (get) => {
    const query = get(settingsQueryAtom);
    if (query.data) {
      return query.data;
    }
    // Return default settings if loading or error
    const defaultSettings: UserSettings = DEFAULT_USER_SETTINGS;
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
// USER ATOM
// =============================================================================

/**
 * Current user data atom - unwraps user from userQueryAtom
 * Write: Updates user via API
 *
 * @read Returns current user (default user if loading/error)
 * @write Accepts user update request and updates via API
 */
export const userAtom = atom(
  (get): User => {
    const query = get(userQueryAtom);
    return query.data ?? DEFAULT_USER;
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

export const usersAtom = namedAtom(
  "usersAtom",
  atom((get): User[] => {
    const user = get(userAtom);
    return [user];
  }),
);

export const userByIdAtom = namedAtom(
  "userByIdAtom",
  atom((get) => {
    const user = get(userAtom);
    return user;
  }),
);
