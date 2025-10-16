import { DEFAULT_PROJECT_SECTION } from "@tasktrove/types/defaults";
/**
 * Tests for orderedTasksBySectionAtom logic
 * Tests section.items filtering and task ordering
 *
 * Note: Uses mock atoms to test the logic in isolation with full control
 * over test data. The mock implementation mirrors the real atom's logic.
 */

import { expect, describe, it, beforeEach } from "vitest";
import { atom } from "jotai";
import { createStore } from "jotai";
import type { Task, Project, ProjectSection, GroupId } from "@tasktrove/types";
import {
  INBOX_PROJECT_ID,
  createTaskId,
  createProjectId,
  createGroupId,
} from "@tasktrove/types";
import { DEFAULT_UUID } from "@tasktrove/constants";
import { getDefaultSectionId } from "@tasktrove/types/defaults";

// Mock atoms for testing - allows direct control of test data
const mockTasksAtom = atom<Task[]>([]);
const mockProjectsAtom = atom<Project[]>([]);

// Helper function matching real getOrderedTasksForSection
function getOrderedTasksForSection(
  section: ProjectSection,
  tasks: Task[],
): Task[] {
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  return section.items
    .map((taskId) => taskMap.get(taskId))
    .filter((task): task is Task => task !== undefined);
}

// Mock implementation matching real orderedTasksBySectionAtom logic
const mockOrderedTasksBySectionAtom = atom((get) => {
  return (projectId: string, sectionId: GroupId | null) => {
    const allTasks = get(mockTasksAtom);
    const allProjects = get(mockProjectsAtom);

    const actualProjectId =
      projectId === "inbox" ? INBOX_PROJECT_ID : projectId;
    const project = allProjects.find((p) => p.id === actualProjectId);

    if (!project) {
      return [];
    }

    // Find section by ID - use default section if no ID provided
    const targetSectionId = sectionId || getDefaultSectionId(project);
    const section = project.sections.find((s) => s.id === targetSectionId);

    if (!section) {
      return [];
    }

    // Use getOrderedTasksForSection to get tasks in section.items order
    return getOrderedTasksForSection(section, allTasks);
  };
});

// Test constants - defined locally since they're test-only
const TEST_TASK_ID_1 = createTaskId("12345678-1234-4234-8234-123456789012");
const TEST_TASK_ID_2 = createTaskId("12345678-1234-4234-8234-123456789013");
const TEST_TASK_ID_3 = createTaskId("12345678-1234-4234-8234-123456789014");
const TEST_TASK_ID_4 = createTaskId("12345678-1234-4234-8234-123456789015");
const TEST_PROJECT_ID_1 = createProjectId(
  "12345678-1234-4234-8234-123456789012",
);
const TEST_SECTION_ID_1 = createGroupId("12345678-1234-4234-8234-123456789012");
const TEST_SECTION_ID_2 = createGroupId("12345678-1234-4234-8234-123456789013");

describe("Ordered Tasks By Section Atom", () => {
  let store: ReturnType<typeof createStore>;

  // Test tasks
  const testTasks: Task[] = [
    {
      id: TEST_TASK_ID_1,
      title: "Task in section 1 (first)",
      completed: false,
      priority: 1,
      createdAt: new Date("2024-01-10"),
      recurringMode: "dueDate",
      labels: [],
      subtasks: [],
      comments: [],
      projectId: TEST_PROJECT_ID_1,
    },
    {
      id: TEST_TASK_ID_2,
      title: "Task in section 2",
      completed: false,
      priority: 2,
      createdAt: new Date("2024-01-11"),
      recurringMode: "dueDate",
      labels: [],
      subtasks: [],
      comments: [],
      projectId: TEST_PROJECT_ID_1,
    },
    {
      id: TEST_TASK_ID_3,
      title: "Task in section 1 (second)",
      completed: false,
      priority: 3,
      createdAt: new Date("2024-01-12"),
      recurringMode: "dueDate",
      labels: [],
      subtasks: [],
      comments: [],
      projectId: TEST_PROJECT_ID_1,
    },
    {
      id: TEST_TASK_ID_4,
      title: "Task in default section",
      completed: false,
      priority: 4,
      createdAt: new Date("2024-01-13"),
      recurringMode: "dueDate",
      labels: [],
      subtasks: [],
      comments: [],
      projectId: TEST_PROJECT_ID_1,
    },
  ];

  // Test project with sections - tasks are organized via section.items
  const testProject: Project = {
    id: TEST_PROJECT_ID_1,
    name: "Test Project",
    slug: "test-project",
    color: "#3b82f6",
    sections: [
      {
        id: createGroupId(DEFAULT_UUID),
        name: "Default",
        slug: "",
        type: "section",
        color: "#3b82f6",
        items: [TEST_TASK_ID_4], // Task 4 in default section
      },
      {
        id: TEST_SECTION_ID_1,
        name: "Section 1",
        slug: "",
        type: "section",
        color: "#3b82f6",
        items: [TEST_TASK_ID_1, TEST_TASK_ID_3], // Tasks 1 and 3 in section 1
      },
      {
        id: TEST_SECTION_ID_2,
        name: "Section 2",
        slug: "",
        type: "section",
        color: "#ef4444",
        items: [TEST_TASK_ID_2], // Task 2 in section 2
      },
    ],
  };

  beforeEach(() => {
    store = createStore();
    store.set(mockTasksAtom, testTasks);
    store.set(mockProjectsAtom, [testProject]);
  });

  describe("Section Filtering via section.items", () => {
    it("should return tasks in section.items order for section 1", () => {
      const getOrderedTasksForSection = store.get(
        mockOrderedTasksBySectionAtom,
      );
      const section1Tasks = getOrderedTasksForSection(
        TEST_PROJECT_ID_1,
        TEST_SECTION_ID_1,
      );

      // Section 1 has tasks 1 and 3 in that order
      expect(section1Tasks).toHaveLength(2);
      expect(section1Tasks[0]?.id).toBe(TEST_TASK_ID_1);
      expect(section1Tasks[1]?.id).toBe(TEST_TASK_ID_3);
    });

    it("should return tasks for different sections separately", () => {
      const getOrderedTasksForSection = store.get(
        mockOrderedTasksBySectionAtom,
      );
      const section1Tasks = getOrderedTasksForSection(
        TEST_PROJECT_ID_1,
        TEST_SECTION_ID_1,
      );
      const section2Tasks = getOrderedTasksForSection(
        TEST_PROJECT_ID_1,
        TEST_SECTION_ID_2,
      );

      // Section 1 has tasks 1 and 3
      expect(section1Tasks).toHaveLength(2);
      expect(section1Tasks[0]?.id).toBe(TEST_TASK_ID_1);
      expect(section1Tasks[1]?.id).toBe(TEST_TASK_ID_3);

      // Section 2 has task 2
      expect(section2Tasks).toHaveLength(1);
      expect(section2Tasks[0]?.id).toBe(TEST_TASK_ID_2);
    });

    it("should return tasks in default section", () => {
      const getOrderedTasksForSection = store.get(
        mockOrderedTasksBySectionAtom,
      );
      const defaultSectionTasks = getOrderedTasksForSection(
        TEST_PROJECT_ID_1,
        createGroupId(DEFAULT_UUID),
      );

      // Default section has task 4
      expect(defaultSectionTasks).toHaveLength(1);
      expect(defaultSectionTasks[0]?.id).toBe(TEST_TASK_ID_4);
    });
  });

  describe("Null section handling", () => {
    it("should return default section tasks when sectionId is null", () => {
      const getOrderedTasksForSection = store.get(
        mockOrderedTasksBySectionAtom,
      );
      const defaultSectionTasks = getOrderedTasksForSection(
        TEST_PROJECT_ID_1,
        null,
      );

      // Should return tasks from default section
      expect(defaultSectionTasks).toHaveLength(1);
      expect(defaultSectionTasks[0]?.id).toBe(TEST_TASK_ID_4);
    });
  });

  describe("Project Context", () => {
    it("should return empty array for non-existent project", () => {
      const getOrderedTasksForSection = store.get(
        mockOrderedTasksBySectionAtom,
      );
      const section1Tasks = getOrderedTasksForSection(
        createProjectId("88888888-8888-4888-8888-888888888888"),
        TEST_SECTION_ID_1,
      );

      // Non-existent project should return empty array
      expect(section1Tasks).toHaveLength(0);
    });

    it("should return empty array for non-existent section", () => {
      const getOrderedTasksForSection = store.get(
        mockOrderedTasksBySectionAtom,
      );
      const nonExistentSectionTasks = getOrderedTasksForSection(
        TEST_PROJECT_ID_1,
        createGroupId("99999999-9999-4999-8999-999999999999"),
      );

      // Non-existent section should return empty array
      expect(nonExistentSectionTasks).toHaveLength(0);
    });
  });

  describe("Task Ordering", () => {
    it("should preserve section.items order", () => {
      const getOrderedTasksForSection = store.get(
        mockOrderedTasksBySectionAtom,
      );
      const section1Tasks = getOrderedTasksForSection(
        TEST_PROJECT_ID_1,
        TEST_SECTION_ID_1,
      );

      // Tasks should be returned in section.items order (1, 3)
      expect(section1Tasks).toHaveLength(2);
      expect(section1Tasks[0]?.id).toBe(TEST_TASK_ID_1);
      expect(section1Tasks[1]?.id).toBe(TEST_TASK_ID_3);
    });
  });

  describe("Edge Cases", () => {
    it("should handle project with no sections", () => {
      const projectWithNoSections: Project = {
        id: createProjectId("77777777-7777-4777-8777-777777777777"),
        name: "Project No Sections",
        slug: "project-no-sections",
        color: "#ef4444",
        sections: [DEFAULT_PROJECT_SECTION], // No sections
      };

      store.set(mockProjectsAtom, [testProject, projectWithNoSections]);

      const getOrderedTasksForSection = store.get(
        mockOrderedTasksBySectionAtom,
      );
      const defaultTasks = getOrderedTasksForSection(
        projectWithNoSections.id,
        createGroupId(DEFAULT_UUID),
      );

      // Project with no sections should return empty array
      expect(defaultTasks).toHaveLength(0);
    });

    it("should handle empty task list", () => {
      store.set(mockTasksAtom, []);

      const getOrderedTasksForSection = store.get(
        mockOrderedTasksBySectionAtom,
      );
      const results = getOrderedTasksForSection(
        TEST_PROJECT_ID_1,
        TEST_SECTION_ID_1,
      );

      expect(results).toEqual([]);
    });

    it("should handle non-existent project", () => {
      const getOrderedTasksForSection = store.get(
        mockOrderedTasksBySectionAtom,
      );
      const results = getOrderedTasksForSection(
        "non-existent-project",
        TEST_SECTION_ID_1,
      );

      expect(results).toEqual([]);
    });
  });

  describe("Section.items Integrity", () => {
    it("should return all tasks from all sections without duplicates", () => {
      const getOrderedTasksForSection = store.get(
        mockOrderedTasksBySectionAtom,
      );

      // Get all tasks from all sections
      const section1Tasks = getOrderedTasksForSection(
        TEST_PROJECT_ID_1,
        TEST_SECTION_ID_1,
      );
      const section2Tasks = getOrderedTasksForSection(
        TEST_PROJECT_ID_1,
        TEST_SECTION_ID_2,
      );
      const defaultTasks = getOrderedTasksForSection(
        TEST_PROJECT_ID_1,
        createGroupId(DEFAULT_UUID),
      );

      const allReturnedTaskIds = [
        ...section1Tasks.map((t) => t.id),
        ...section2Tasks.map((t) => t.id),
        ...defaultTasks.map((t) => t.id),
      ];

      // All original test tasks should appear somewhere
      const originalTaskIds = testTasks.map((t) => t.id);
      originalTaskIds.forEach((taskId) => {
        expect(allReturnedTaskIds).toContain(taskId);
      });

      // Should have exactly 4 tasks total (no duplicates)
      expect(allReturnedTaskIds).toHaveLength(4);
    });
  });
});
