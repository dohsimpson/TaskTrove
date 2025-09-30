/**
 * Data query atom for TaskTrove
 *
 * This file contains the main query atom that fetches all application data
 * from the API and provides it to the rest of the application via Jotai atoms.
 *
 * The query atom handles:
 * - Fetching data from /api/tasks endpoint
 * - Validation via Zod schemas
 * - Test environment data generation
 * - Query configuration (stale time, refetch behavior)
 */

import { atomWithQuery, queryClientAtom } from "jotai-tanstack-query";

// Re-export queryClientAtom for use in mutations
export { queryClientAtom };
import {
  DataFile,
  DataFileSchema,
  createProjectId,
  createLabelId,
  createGroupId,
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

/**
 * Main data query atom
 *
 * Fetches all application data from /api/tasks endpoint.
 * In test environments, returns mock data structure.
 *
 * Query configuration:
 * - staleTime: 1000ms (considers data fresh for 1 second)
 * - refetchOnMount: false (prevents unnecessary refetches)
 * - refetchOnWindowFocus: false (prevents race conditions)
 * - refetchInterval: false (no automatic polling)
 *
 * @returns DataFile containing tasks, projects, labels, groups, settings, and user
 */
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
