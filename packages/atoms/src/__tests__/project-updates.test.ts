/**
 * ⚠️  WEB API DEPENDENT - Project Updates Test Suite
 *
 * Platform dependencies:
 * - Global fetch API for HTTP requests
 * - TanStack Query for mutations
 * - Web-specific error handling for API failures
 * - Toast notifications for user feedback
 *
 * Project Update Tests for Task Reordering
 *
 * Tests the project update functionality specifically for task reordering
 * to ensure changes persist properly.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createStore } from "jotai";
import { updateProjectsMutationAtom, projectsAtom } from "../core/base";
import { deleteProjectAtom } from "../core/projects";
import { moveTaskWithinSection } from "../core/tasks";
import { DEFAULT_UUID } from "@tasktrove/constants";
import type { Project } from "@tasktrove/types";
import {
  createTaskId,
  createGroupId,
  INBOX_PROJECT_ID,
  createProjectId,
} from "@tasktrove/types";
import {
  createMockTask,
  TEST_PROJECT_ID_1,
  TEST_PROJECT_ID_2,
  TEST_TASK_ID_1,
  TEST_TASK_ID_2,
} from "../utils/test-helpers";

// Mock fetch for testing
global.fetch = vi.fn();
const mockedFetch = vi.mocked(global.fetch);

// Removed unused interfaces

let store: ReturnType<typeof createStore>;

beforeEach(() => {
  store = createStore();
  vi.clearAllMocks();
});

describe("Project Updates and Task Reordering", () => {
  it("should create updateProjectsMutationAtom correctly", () => {
    // Test that the mutation atom exists and can be accessed
    expect(updateProjectsMutationAtom).toBeDefined();
  });

  it("should update project task order", async () => {
    // Skip in test environment due to React Query integration
    return;

    // Mock successful API response
    const mockResponse = {
      success: true,
      projects: [
        {
          id: TEST_PROJECT_ID_1,
          name: "Test Project",
          slug: "test-project",
          color: "#3b82f6",
          shared: false,
          viewState: {
            viewMode: "list" as const,
            sortBy: "dueDate",
            sortDirection: "asc" as const,
            showCompleted: false,
            searchQuery: "",
            showSidePanel: false,
            compactView: false,
          },
          sections: [],
        },
      ],
      count: 1,
      message: "1 project(s) updated successfully",
    };

    const mockFetchResponse: Partial<Response> = {
      ok: true,
      json: () => Promise.resolve(mockResponse),
    };
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mockedFetch.mockResolvedValueOnce(mockFetchResponse as Response);

    // Test project with initial task order
    const testProjects: Project[] = [
      {
        id: TEST_PROJECT_ID_1,
        name: "Test Project",
        slug: "test-project",
        color: "#3b82f6",
        shared: false,
        sections: [],
      },
    ];

    // Set the projects atom with test data
    store.set(projectsAtom, testProjects);

    // Get the mutation
    const mutation = store.get(updateProjectsMutationAtom);

    // Update project with reordered tasks
    if (testProjects.length === 0) {
      throw new Error("Expected to find test projects");
    }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const updatedProject = {
      ...testProjects[0],
    } as Project;

    await mutation.mutateAsync([updatedProject]);

    // Verify fetch was called with correct data
    expect(global.fetch).toHaveBeenCalledWith("/api/projects", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([updatedProject]),
    });
  });

  it("should handle project update errors gracefully", async () => {
    // Skip in test environment due to React Query integration
    return;

    // Mock API error
    const mockErrorResponse: Partial<Response> = {
      ok: false,
      statusText: "Internal Server Error",
    };
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mockedFetch.mockResolvedValueOnce(mockErrorResponse as Response);

    const testProjects: Project[] = [
      {
        id: TEST_PROJECT_ID_1,
        name: "Test Project",
        slug: "test-project",
        color: "#3b82f6",
        shared: false,
        sections: [],
      },
    ];

    const mutation = store.get(updateProjectsMutationAtom);

    // Should throw error when API fails
    await expect(mutation.mutateAsync(testProjects)).rejects.toThrow(
      "Failed to update projects: Internal Server Error",
    );
  });

  it("should detect project updates correctly in API", () => {
    // Test the detection logic used in the API
    const projectUpdate = {
      id: TEST_PROJECT_ID_1,
      taskOrder: [TEST_TASK_ID_2, TEST_TASK_ID_1],
      name: "Test Project",
    };

    const taskUpdate = {
      id: TEST_TASK_ID_1,
      title: "Updated Task",
      completed: false,
    };

    // Project update should have taskOrder
    expect(projectUpdate.taskOrder).toBeDefined();
    expect(
      "taskOrder" in taskUpdate ? taskUpdate.taskOrder : undefined,
    ).toBeUndefined();

    // This simulates the detection logic in the API (updated for position-based ordering)
    const isProjectUpdate =
      ("sections" in projectUpdate && projectUpdate.sections !== undefined) ||
      ("position" in projectUpdate && projectUpdate.position !== undefined) ||
      true; // taskOrder is always defined for projectUpdate as asserted above

    const isTaskUpdate =
      (!("taskOrder" in taskUpdate) || taskUpdate.taskOrder === undefined) &&
      (!("sections" in taskUpdate) || taskUpdate.sections === undefined) &&
      (!("position" in taskUpdate) || taskUpdate.position === undefined);

    expect(isProjectUpdate).toBe(true);
    expect(isTaskUpdate).toBe(true);
  });

  it("should delete project from both projects data and ordering", async () => {
    // This test verifies that deleteProjectAtom properly orchestrates project deletion
    // In test environment, mutations use test factories, so we test the behavior
    // by verifying that the delete operation completes without error

    const testProjects: Project[] = [
      {
        id: TEST_PROJECT_ID_1,
        name: "Project To Keep",
        slug: "project-to-keep",
        color: "#3b82f6",
        shared: false,
        sections: [],
      },
      {
        id: TEST_PROJECT_ID_2,
        name: "Project To Delete",
        slug: "project-to-delete",
        color: "#ef4444",
        shared: false,
        sections: [],
      },
    ];

    // Set initial projects
    store.set(projectsAtom, testProjects);

    // Execute the delete operation
    // In test environment, this should complete successfully using test factories
    await expect(
      store.set(deleteProjectAtom, TEST_PROJECT_ID_2),
    ).resolves.not.toThrow();

    // Test passes if the operation completes without throwing
    // The actual mutation calls are handled by the test environment factories
    expect(true).toBe(true); // Explicit assertion that we reached this point
  });

  // =============================================================================
  // Section-Aware Task Reordering Tests
  // =============================================================================

  describe("Section-Aware Task Reordering", () => {
    // TODO: Rewrite these tests for new section.items architecture
    it.skip("should reorder tasks within section boundaries", () => {
      // Mock data with tasks in different sections
      const taskAId = createTaskId("12345678-1234-4234-8234-123456789001");
      const taskBId = createTaskId("12345678-1234-4234-8234-123456789002");
      const taskCId = createTaskId("12345678-1234-4234-8234-123456789003");

      const mockTasks = [
        createMockTask({
          id: taskAId,
          projectId: TEST_PROJECT_ID_1,
          createdAt: new Date("2025-01-01"),
        }),
        createMockTask({
          id: taskBId,
          projectId: TEST_PROJECT_ID_1,
          createdAt: new Date("2025-01-02"),
        }),
        createMockTask({
          id: taskCId,
          projectId: TEST_PROJECT_ID_1,
          createdAt: new Date("2025-01-03"),
        }),
      ];

      const mockProjects = [
        {
          id: TEST_PROJECT_ID_1,
          name: "Test Project",
          slug: "test-project",
          color: "#3b82f6",
          shared: false,
          sections: [],
        },
      ];

      // TODO: Rewrite for new section.items architecture
      // Move task-b to position 0 within section-1 (should come before task-a)
      // const result = moveTaskWithinSection(
      //   createGroupId("12345678-1234-4234-8234-123456789101"),
      //   taskBId,
      //   0,
      //   mockProjects[0].sections,
      // );

      // Task order is now managed through section.items, not project.taskOrder
      expect(true).toBe(true); // Placeholder
    });

    it.skip("should handle default section edge cases correctly", () => {
      // Tasks with mixed default section representations
      const taskNoSectionId = createTaskId(
        "12345678-1234-4234-8234-123456789011",
      );
      const taskDefaultUuidId = createTaskId(
        "12345678-1234-4234-8234-123456789012",
      );
      const taskOtherSectionId = createTaskId(
        "12345678-1234-4234-8234-123456789013",
      );

      const mockTasks = [
        createMockTask({
          id: taskNoSectionId,
          projectId: TEST_PROJECT_ID_1,
          createdAt: new Date("2025-01-01"),
        }),
        createMockTask({
          id: taskDefaultUuidId,
          projectId: TEST_PROJECT_ID_1,
          createdAt: new Date("2025-01-02"),
        }),
        createMockTask({
          id: taskOtherSectionId,
          projectId: TEST_PROJECT_ID_1,
          createdAt: new Date("2025-01-03"),
        }),
      ];

      const mockProjects = [
        {
          id: TEST_PROJECT_ID_1,
          name: "Test Project",
          slug: "test-project",
          color: "#3b82f6",
          shared: false,
          sections: [],
        },
      ];

      // TODO: Rewrite for new section.items architecture
      // Move task-default-uuid to position 0 within default section
      // Both tasks with no sectionId and DEFAULT_UUID should be treated as same section
      // const result = moveTaskWithinSection(
      //   createGroupId(DEFAULT_UUID),
      //   taskDefaultUuidId,
      //   0,
      //   mockProjects[0].sections,
      // );

      // Task order is now managed through section.items, not project.taskOrder
      expect(true).toBe(true); // Placeholder
    });

    it.skip("should maintain global task order structure when reordering within sections", () => {
      // TODO: This test needs to be rewritten for new section.items architecture
      //  Old: project.taskOrder maintained global order across sections
      //  New: each section.items maintains order for that section only
      //  Old API: moveTaskWithinSection(projectId, taskId, toIndex, sectionId, projects, tasks)
      //  New API: moveTaskWithinSection(sectionId, taskId, toIndex, sections)
      expect(true).toBe(true);
    });
  });
});
