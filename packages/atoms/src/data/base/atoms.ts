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
} from "#data/base/query";
import type {
  Project,
  Label,
  UserSettings,
  UpdateTaskRequest,
  PartialUserSettings,
  UpdateUserRequest,
  User,
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
import { log, namedAtom } from "#utils/atom-helpers";

// Import mutation atoms that are referenced in write functions
import { updateTasksMutationAtom } from "#mutations/tasks";
import { updateProjectsMutationAtom } from "#mutations/projects";
import { updateLabelsMutationAtom } from "#mutations/labels";
import { updateSettingsMutationAtom } from "#mutations/settings";
import { updateUserMutationAtom } from "#mutations/user";

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
