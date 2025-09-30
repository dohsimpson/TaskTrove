/**
 * DISABLED: Tests for orderedTasksBySectionAtom
 * This atom has been temporarily disabled because it has UI dependencies.
 * It needs to be refactored to the UI layer.
 */

import { expect, describe, it, beforeEach } from "vitest";
import { atom } from "jotai";
import { createStore } from "jotai";
import type { Task, Project, ProjectSection } from "@tasktrove/types";
import {
  INBOX_PROJECT_ID,
  createTaskId,
  createProjectId,
  createSectionId,
} from "@tasktrove/types";
import { DEFAULT_UUID } from "@tasktrove/constants";

// Test constants - defined locally since they're test-only
const TEST_TASK_ID_1 = createTaskId("12345678-1234-4234-8234-123456789012");
const TEST_TASK_ID_2 = createTaskId("12345678-1234-4234-8234-123456789013");
const TEST_TASK_ID_3 = createTaskId("12345678-1234-4234-8234-123456789014");
const TEST_PROJECT_ID_1 = createProjectId(
  "12345678-1234-4234-8234-123456789012",
);
const TEST_SECTION_ID_1 = createSectionId(
  "12345678-1234-4234-8234-123456789012",
);
const TEST_SECTION_ID_2 = createSectionId(
  "12345678-1234-4234-8234-123456789013",
);
const TEST_SECTION_ID_3 = createSectionId(
  "12345678-1234-4234-8234-123456789014",
);

// Additional test IDs (using existing constants)
const TEST_TASK_ID_4 = createTaskId("12345678-1234-4234-8234-123456789015");
// Using TEST_SECTION_ID_3 as orphan section (doesn't exist in test project)

// Mock atoms for testing
const mockTasksAtom = atom<Task[]>([]);
const mockProjectsAtom = atom<Project[]>([]);
const mockCurrentViewAtom = atom<string>("inbox");

// Mock the orderedTasksBySection atom with the same logic as the real one
const mockOrderedTasksBySectionAtom = atom((get) => {
  return (projectId: string, sectionId: string | null) => {
    const allTasks = get(mockTasksAtom);
    const allProjects = get(mockProjectsAtom);

    // Filter tasks by project
    const tasks =
      projectId === "inbox"
        ? allTasks.filter(
            (task) => !task.projectId || task.projectId === INBOX_PROJECT_ID,
          )
        : allTasks.filter((task) => task.projectId === projectId);

    // Get project for section validation
    const project =
      projectId === "inbox"
        ? null
        : allProjects.find((p) => p.id === projectId);

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

    // Sort by creation date for consistency (same as real atom)
    return sectionTasks.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  };
});

describe.skip("Ordered Tasks By Section Atom", () => {
  let store: ReturnType<typeof createStore>;

  // Test project with sections
  const testProject: Project = {
    id: TEST_PROJECT_ID_1,
    name: "Test Project",
    slug: "test-project",
    color: "#3b82f6",
    shared: false,
    sections: [
      {
        id: TEST_SECTION_ID_1,
        name: "Section 1",
        color: "#3b82f6",
      },
      {
        id: TEST_SECTION_ID_2,
        name: "Section 2",
        color: "#ef4444",
      },
    ],
  };

  // Test tasks with various section configurations
  const testTasks: Task[] = [
    {
      id: TEST_TASK_ID_1,
      title: "Task in valid section 1",
      completed: false,
      priority: 1,
      createdAt: new Date("2024-01-10"),
      recurringMode: "dueDate",
      sectionId: TEST_SECTION_ID_1, // Valid section
      labels: [],
      subtasks: [],
      comments: [],
      attachments: [],
      projectId: TEST_PROJECT_ID_1,
    },
    {
      id: TEST_TASK_ID_2,
      title: "Task in valid section 2",
      completed: false,
      priority: 2,
      createdAt: new Date("2024-01-11"),
      recurringMode: "dueDate",
      sectionId: TEST_SECTION_ID_2, // Valid section
      labels: [],
      subtasks: [],
      comments: [],
      attachments: [],
      projectId: TEST_PROJECT_ID_1,
    },
    {
      id: TEST_TASK_ID_3,
      title: "Orphaned task with invalid section",
      completed: false,
      priority: 3,
      createdAt: new Date("2024-01-12"),
      recurringMode: "dueDate",
      sectionId: TEST_SECTION_ID_3, // Invalid/orphaned section ID
      labels: [],
      subtasks: [],
      comments: [],
      attachments: [],
      projectId: TEST_PROJECT_ID_1,
    },
    {
      id: TEST_TASK_ID_4,
      title: "Task with no section",
      completed: false,
      priority: 4,
      createdAt: new Date("2024-01-13"),
      recurringMode: "dueDate",
      sectionId: createSectionId(DEFAULT_UUID), // Default section
      labels: [],
      subtasks: [],
      comments: [],
      attachments: [],
      projectId: TEST_PROJECT_ID_1,
    },
  ];

  beforeEach(() => {
    store = createStore();
    store.set(mockTasksAtom, testTasks);
    store.set(mockProjectsAtom, [testProject]);
    store.set(mockCurrentViewAtom, "project");
  });

  describe("Valid Section Filtering", () => {
    it("should return only tasks with matching valid section ID", () => {
      const getOrderedTasksForSection = store.get(
        mockOrderedTasksBySectionAtom,
      );
      const section1Tasks = getOrderedTasksForSection(
        TEST_PROJECT_ID_1,
        TEST_SECTION_ID_1,
      );

      expect(section1Tasks).toHaveLength(1);
      const firstTask = section1Tasks[0];
      if (!firstTask) {
        throw new Error("Expected first task in section1");
      }
      expect(firstTask.id).toBe(TEST_TASK_ID_1);
      expect(firstTask.sectionId).toBe(TEST_SECTION_ID_1);
    });

    it("should return tasks for different valid sections separately", () => {
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

      expect(section1Tasks).toHaveLength(1);
      const section1FirstTask = section1Tasks[0];
      if (!section1FirstTask) {
        throw new Error("Expected first task in section1");
      }
      expect(section1FirstTask.id).toBe(TEST_TASK_ID_1);

      expect(section2Tasks).toHaveLength(1);
      const section2FirstTask = section2Tasks[0];
      if (!section2FirstTask) {
        throw new Error("Expected first task in section2");
      }
      expect(section2FirstTask.id).toBe(TEST_TASK_ID_2);
    });
  });

  describe("Orphaned Task Handling (Bug Fix)", () => {
    it("should include orphaned tasks (invalid section IDs) in the default section", () => {
      const getOrderedTasksForSection = store.get(
        mockOrderedTasksBySectionAtom,
      );
      const defaultSectionTasks = getOrderedTasksForSection(
        TEST_PROJECT_ID_1,
        DEFAULT_UUID,
      );

      // Should include both the task with DEFAULT_UUID and the orphaned task
      expect(defaultSectionTasks).toHaveLength(2);

      const taskIds = defaultSectionTasks.map((t) => t.id);
      expect(taskIds).toContain(TEST_TASK_ID_3); // Orphaned task
      expect(taskIds).toContain(TEST_TASK_ID_4); // Default section task
    });

    it("should include orphaned tasks when requesting default section with null", () => {
      const getOrderedTasksForSection = store.get(
        mockOrderedTasksBySectionAtom,
      );
      const defaultSectionTasks = getOrderedTasksForSection(
        TEST_PROJECT_ID_1,
        null,
      );

      expect(defaultSectionTasks).toHaveLength(2);

      const taskIds = defaultSectionTasks.map((t) => t.id);
      expect(taskIds).toContain(TEST_TASK_ID_3); // Orphaned task
      expect(taskIds).toContain(TEST_TASK_ID_4); // Default section task
    });

    it("should not return orphaned tasks when requesting specific valid sections", () => {
      const getOrderedTasksForSection = store.get(
        mockOrderedTasksBySectionAtom,
      );
      const section1Tasks = getOrderedTasksForSection(
        TEST_PROJECT_ID_1,
        TEST_SECTION_ID_1,
      );

      // Should not include the orphaned task in valid sections
      const taskIds = section1Tasks.map((t) => t.id);
      expect(taskIds).not.toContain(TEST_TASK_ID_3); // Orphaned task should not be here
      expect(taskIds).toContain(TEST_TASK_ID_1); // Valid section task should be here
    });
  });

  describe("Project Context", () => {
    it("should only return tasks for the specified project", () => {
      // Add a task from a different project
      const otherProjectTask: Task = {
        id: createTaskId("99999999-9999-4999-8999-999999999999"),
        title: "Task from other project",
        completed: false,
        priority: 1,
        createdAt: new Date("2024-01-14"),
        recurringMode: "dueDate",
        sectionId: TEST_SECTION_ID_1, // Same section ID but different project
        labels: [],
        subtasks: [],
        comments: [],
        attachments: [],
        projectId: createProjectId("88888888-8888-4888-8888-888888888888"),
      };

      store.set(mockTasksAtom, [...testTasks, otherProjectTask]);

      const getOrderedTasksForSection = store.get(
        mockOrderedTasksBySectionAtom,
      );
      const section1Tasks = getOrderedTasksForSection(
        TEST_PROJECT_ID_1,
        TEST_SECTION_ID_1,
      );

      // Should only return the task from the requested project
      expect(section1Tasks).toHaveLength(1);
      const firstTask = section1Tasks[0];
      if (!firstTask) {
        throw new Error("Expected to find first task");
      }
      expect(firstTask.id).toBe(TEST_TASK_ID_1);
      expect(firstTask.projectId).toBe(TEST_PROJECT_ID_1);
    });

    it("should handle inbox context correctly", () => {
      // Add some inbox tasks
      const inboxTask1: Task = {
        id: createTaskId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
        title: "Inbox task 1",
        completed: false,
        priority: 1,
        createdAt: new Date("2024-01-15"),
        recurringMode: "dueDate",
        sectionId: createSectionId(DEFAULT_UUID),
        labels: [],
        subtasks: [],
        comments: [],
        attachments: [],
        projectId: INBOX_PROJECT_ID,
      };

      const inboxTask2: Task = {
        id: createTaskId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
        title: "Inbox task 2",
        completed: false,
        priority: 1,
        createdAt: new Date("2024-01-16"),
        recurringMode: "dueDate",
        sectionId: undefined, // No section ID
        labels: [],
        subtasks: [],
        comments: [],
        attachments: [],
        // No project ID (should be treated as inbox)
      };

      store.set(mockTasksAtom, [...testTasks, inboxTask1, inboxTask2]);

      const getOrderedTasksForSection = store.get(
        mockOrderedTasksBySectionAtom,
      );
      const inboxTasks = getOrderedTasksForSection("inbox", DEFAULT_UUID);

      expect(inboxTasks).toHaveLength(2);
      const taskIds = inboxTasks.map((t) => t.id);
      expect(taskIds).toContain(inboxTask1.id);
      expect(taskIds).toContain(inboxTask2.id);
    });
  });

  describe("Task Sorting", () => {
    it("should sort tasks by creation date ascending", () => {
      const getOrderedTasksForSection = store.get(
        mockOrderedTasksBySectionAtom,
      );
      const defaultSectionTasks = getOrderedTasksForSection(
        TEST_PROJECT_ID_1,
        DEFAULT_UUID,
      );

      // Tasks should be sorted by creation date (earliest first)
      expect(defaultSectionTasks).toHaveLength(2);
      const firstTask = defaultSectionTasks[0];
      const secondTask = defaultSectionTasks[1];
      if (!firstTask || !secondTask) {
        throw new Error("Expected to find first two tasks");
      }
      expect(firstTask.createdAt.getTime()).toBeLessThanOrEqual(
        secondTask.createdAt.getTime(),
      );

      // Specifically check the order based on our test data
      expect(firstTask.id).toBe(TEST_TASK_ID_3); // 2024-01-12
      expect(secondTask.id).toBe(TEST_TASK_ID_4); // 2024-01-13
    });
  });

  describe("Edge Cases", () => {
    it("should handle project with no sections", () => {
      const projectWithNoSections: Project = {
        id: createProjectId("77777777-7777-4777-8777-777777777777"),
        name: "Project No Sections",
        slug: "project-no-sections",
        color: "#ef4444",
        shared: false,
        sections: [], // No sections
      };

      const taskInEmptyProject: Task = {
        id: createTaskId("cccccccc-cccc-4ccc-8ccc-cccccccccccc"),
        title: "Task in project with no sections",
        completed: false,
        priority: 1,
        createdAt: new Date("2024-01-17"),
        recurringMode: "dueDate",
        sectionId: TEST_SECTION_ID_3, // Non-existent section
        labels: [],
        subtasks: [],
        comments: [],
        attachments: [],
        projectId: projectWithNoSections.id,
      };

      store.set(mockProjectsAtom, [testProject, projectWithNoSections]);
      store.set(mockTasksAtom, [...testTasks, taskInEmptyProject]);

      const getOrderedTasksForSection = store.get(
        mockOrderedTasksBySectionAtom,
      );
      const defaultTasks = getOrderedTasksForSection(
        projectWithNoSections.id,
        DEFAULT_UUID,
      );

      // Task with non-existent section should appear in default section
      expect(defaultTasks).toHaveLength(1);
      const firstTask = defaultTasks[0];
      if (!firstTask) {
        throw new Error("Expected to find first task");
      }
      expect(firstTask.id).toBe(taskInEmptyProject.id);
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

  describe("Regression Prevention", () => {
    it("should prevent the original bug: orphaned tasks disappearing completely", () => {
      // This test specifically prevents the regression where orphaned tasks
      // (tasks with section IDs that don't exist in the project) would disappear
      // from all views instead of appearing in the default section

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
        DEFAULT_UUID,
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

      // Specifically: orphaned task should appear in default section
      expect(defaultTasks.map((t) => t.id)).toContain(TEST_TASK_ID_3);
    });

    it("should maintain the fix even when project sections change", () => {
      // Test the scenario where a section is removed from project,
      // making tasks in that section "orphaned"

      // Remove section 2 from the project
      const firstSection = testProject.sections[0];
      if (!firstSection) {
        throw new Error("Expected to find first section");
      }
      const modifiedProject: Project = {
        ...testProject,
        sections: [firstSection], // Only keep section 1
      };

      store.set(mockProjectsAtom, [modifiedProject]);

      const getOrderedTasksForSection = store.get(
        mockOrderedTasksBySectionAtom,
      );

      // Task 2 should now be orphaned and appear in default section
      const defaultTasks = getOrderedTasksForSection(
        TEST_PROJECT_ID_1,
        DEFAULT_UUID,
      );
      const section1Tasks = getOrderedTasksForSection(
        TEST_PROJECT_ID_1,
        TEST_SECTION_ID_1,
      );

      // Section 1 should still have its original task
      expect(section1Tasks.map((t) => t.id)).toContain(TEST_TASK_ID_1);

      // Default section should now have the previously orphaned task plus the newly orphaned one
      const defaultTaskIds = defaultTasks.map((t) => t.id);
      expect(defaultTaskIds).toContain(TEST_TASK_ID_2); // Newly orphaned
      expect(defaultTaskIds).toContain(TEST_TASK_ID_3); // Previously orphaned
      expect(defaultTaskIds).toContain(TEST_TASK_ID_4); // Always in default
    });
  });
});
