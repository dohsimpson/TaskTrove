/**
 * Base data atoms that directly read from dataQueryAtom
 * These are the source of truth for entity data in the application
 *
 * Note: Write functions currently contain mutation logic. This will be
 * refactored in Phase 2, Task 2.3 to separate mutation logic into mutations/.
 */

import { atom } from "jotai";
import { dataQueryAtom } from "./query";
import type {
  Task,
  Project,
  Label,
  UserSettings,
  User,
  UpdateTaskRequest,
  PartialUserSettings,
  UpdateUserRequest,
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
import { log, namedAtom } from "../../utils/atom-helpers";

// Import mutation atoms that are referenced in write functions
import { updateTasksMutationAtom } from "../../mutations/tasks";
import { updateProjectsMutationAtom } from "../../mutations/projects";
import { updateLabelsMutationAtom } from "../../mutations/labels";
import { updateSettingsMutationAtom } from "../../mutations/settings";
import { updateUserMutationAtom } from "../../mutations/user";

// =============================================================================
// BASE TASKS ATOM
// =============================================================================

/**
 * Base tasks atom - reads tasks from dataQueryAtom
 * Write: Updates tasks via mutation atom
 *
 * @read Returns array of all tasks
 * @write Accepts array of task updates and applies via API
 */
export const tasksAtom = namedAtom(
  "tasksAtom",
  atom(
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
  ),
);

// =============================================================================
// BASE PROJECTS ATOM
// =============================================================================

/**
 * Base projects atom - reads projects from dataQueryAtom
 * Write: Updates projects via mutation atom
 *
 * @read Returns array of all projects
 * @write Accepts array of projects and updates via API
 */
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

/**
 * Base labels atom - reads labels from dataQueryAtom
 * Write: Updates labels via mutation atom
 *
 * @read Returns array of all labels
 * @write Accepts array of labels and updates via API
 */
export const labelsAtom = namedAtom(
  "labelsAtom",
  atom(
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
  ),
);

// =============================================================================
// SETTINGS ATOM
// =============================================================================

/**
 * Base settings atom - reads settings from dataQueryAtom
 * Write: Updates settings via mutation atom
 *
 * @read Returns current user settings
 * @write Accepts partial settings and updates via API
 */
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
// USER ATOM
// =============================================================================

/**
 * Current user data atom
 * Read: Gets current user from data query
 * Write: Updates user via API
 *
 * @read Returns current user
 * @write Accepts user update request and updates via API
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
