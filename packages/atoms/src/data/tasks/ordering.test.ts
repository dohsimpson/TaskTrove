import { DEFAULT_PROJECT_SECTION } from "@tasktrove/types/defaults";
import { describe, it, expect } from "vitest";
import {
  getOrderedTasksForProject,
  getOrderedTasksForSection,
  moveTaskWithinSection,
  addTaskToSection,
  removeTaskFromSection,
  taskOrderingUtils,
} from "./ordering";
import type { Task, Project, ProjectSection } from "@tasktrove/types/core";
import {
  createTaskId,
  createProjectId,
  createGroupId,
} from "@tasktrove/types/id";
import { v4 as uuidv4 } from "uuid";

// Helper function to safely get element at specific index
function getArrayElement<T>(arr: T[], index: number): T {
  if (arr.length <= index) {
    throw new Error(`Array index ${index} out of bounds`);
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return arr[index]!;
}

// Test helper factories
function createTestTask(overrides: Partial<Task> = {}): Task {
  return {
    id: createTaskId(uuidv4()),
    title: "Test Task",
    completed: false,
    priority: 4,
    projectId: createProjectId(uuidv4()),
    labels: [],
    subtasks: [],
    comments: [],
    recurringMode: "dueDate",
    createdAt: new Date(),
    ...overrides,
  };
}

function createTestProject(overrides: Partial<Project> = {}): Project {
  return {
    id: createProjectId(uuidv4()),
    name: "Test Project",
    sections: [DEFAULT_PROJECT_SECTION],
    color: "#000000",
    ...overrides,
  };
}

function createTestSection(
  overrides: Partial<ProjectSection> = {},
): ProjectSection {
  return {
    id: createGroupId(uuidv4()),
    name: "Test Section",
    type: "section",
    items: [],
    ...overrides,
  };
}

describe("getOrderedTasksForSection", () => {
  it("should return tasks in order from section.items", () => {
    const task1 = createTestTask({ title: "Task 1" });
    const task2 = createTestTask({ title: "Task 2" });
    const task3 = createTestTask({ title: "Task 3" });
    const tasks = [task1, task2, task3];

    const section = createTestSection({
      items: [task3.id, task1.id, task2.id], // Custom order
    });

    const result = getOrderedTasksForSection(section, tasks);

    expect(result).toHaveLength(3);
    expect(result[0]?.title).toBe("Task 3");
    expect(result[1]?.title).toBe("Task 1");
    expect(result[2]?.title).toBe("Task 2");
  });

  it("should filter out non-existent task IDs", () => {
    const task1 = createTestTask({ title: "Task 1" });
    const tasks = [task1];
    const nonExistentId = createTaskId(uuidv4());

    const section = createTestSection({
      items: [nonExistentId, task1.id],
    });

    const result = getOrderedTasksForSection(section, tasks);

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Task 1");
  });

  it("should return empty array when section has no items", () => {
    const tasks = [createTestTask()];
    const section = createTestSection({ items: [] });

    const result = getOrderedTasksForSection(section, tasks);

    expect(result).toHaveLength(0);
  });

  it("should handle empty tasks array", () => {
    const section = createTestSection({
      items: [createTaskId(uuidv4())],
    });

    const result = getOrderedTasksForSection(section, []);

    expect(result).toHaveLength(0);
  });
});

describe("getOrderedTasksForProject", () => {
  it("should return tasks from all sections in order", () => {
    const projectId = createProjectId(uuidv4());
    const section1 = createTestSection({ name: "Section 1" });
    const section2 = createTestSection({ name: "Section 2" });

    const task1 = createTestTask({ projectId, title: "Task 1" });
    const task2 = createTestTask({ projectId, title: "Task 2" });
    const task3 = createTestTask({ projectId, title: "Task 3" });

    section1.items = [task1.id, task2.id];
    section2.items = [task3.id];

    const tasks = [task1, task2, task3];
    const projects = [
      createTestProject({
        id: projectId,
        sections: [section1, section2],
      }),
    ];

    const result = getOrderedTasksForProject(projectId, tasks, projects);

    expect(result).toHaveLength(3);
    expect(result[0]?.title).toBe("Task 1");
    expect(result[1]?.title).toBe("Task 2");
    expect(result[2]?.title).toBe("Task 3");
  });

  it("should return empty array when project not found", () => {
    const projectId = createProjectId(uuidv4());
    const tasks = [createTestTask()];
    const projects: Project[] = [];

    const result = getOrderedTasksForProject(projectId, tasks, projects);

    expect(result).toHaveLength(0);
  });

  it("should filter out tasks from other projects", () => {
    const projectId = createProjectId(uuidv4());
    const otherProjectId = createProjectId(uuidv4());

    const task1 = createTestTask({ projectId, title: "Task 1" });
    const task2 = createTestTask({
      projectId: otherProjectId,
      title: "Task 2",
    });

    const section = createTestSection({
      items: [task1.id, task2.id], // task2 is from different project
    });

    const tasks = [task1, task2];
    const projects = [
      createTestProject({
        id: projectId,
        sections: [section],
      }),
    ];

    const result = getOrderedTasksForProject(projectId, tasks, projects);

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Task 1");
  });

  it("should handle sections with empty items", () => {
    const projectId = createProjectId(uuidv4());
    const section1 = createTestSection({ items: [] });
    const section2 = createTestSection({ items: [] });

    const tasks = [createTestTask({ projectId })];
    const projects = [
      createTestProject({
        id: projectId,
        sections: [section1, section2],
      }),
    ];

    const result = getOrderedTasksForProject(projectId, tasks, projects);

    expect(result).toHaveLength(0);
  });

  it("should handle sections with non-existent task IDs", () => {
    const projectId = createProjectId(uuidv4());
    const task1 = createTestTask({ projectId, title: "Task 1" });
    const nonExistentId = createTaskId(uuidv4());

    const section = createTestSection({
      items: [nonExistentId, task1.id, nonExistentId],
    });

    const tasks = [task1];
    const projects = [
      createTestProject({
        id: projectId,
        sections: [section],
      }),
    ];

    const result = getOrderedTasksForProject(projectId, tasks, projects);

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Task 1");
  });

  it("should handle project with no sections", () => {
    const projectId = createProjectId(uuidv4());
    const tasks = [createTestTask({ projectId })];
    const projects = [
      createTestProject({
        id: projectId,
        sections: [DEFAULT_PROJECT_SECTION],
      }),
    ];

    const result = getOrderedTasksForProject(projectId, tasks, projects);

    expect(result).toHaveLength(0);
  });
});

describe("moveTaskWithinSection", () => {
  it("should move task to new position within section", () => {
    const sectionId = createGroupId(uuidv4());
    const taskIds = [
      createTaskId(uuidv4()),
      createTaskId(uuidv4()),
      createTaskId(uuidv4()),
    ];
    const sections = [
      createTestSection({
        id: sectionId,
        items: taskIds,
      }),
    ];

    const firstTaskId = getArrayElement(taskIds, 0);

    const result = moveTaskWithinSection(sectionId, firstTaskId, 2, sections);

    expect(result[0]?.items).toEqual([taskIds[1], taskIds[2], taskIds[0]]);
  });

  it("should return unchanged section if task not in items", () => {
    const sectionId = createGroupId(uuidv4());
    const taskIds = [createTaskId(uuidv4()), createTaskId(uuidv4())];
    const nonExistentTaskId = createTaskId(uuidv4());
    const sections = [
      createTestSection({
        id: sectionId,
        items: taskIds,
      }),
    ];

    const result = moveTaskWithinSection(
      sectionId,
      nonExistentTaskId,
      1,
      sections,
    );

    expect(result[0]?.items).toEqual(taskIds);
  });

  it("should handle moving to same position", () => {
    const sectionId = createGroupId(uuidv4());
    const taskIds = [
      createTaskId(uuidv4()),
      createTaskId(uuidv4()),
      createTaskId(uuidv4()),
    ];
    const sections = [
      createTestSection({
        id: sectionId,
        items: taskIds,
      }),
    ];

    const secondTaskId = getArrayElement(taskIds, 1);
    const result = moveTaskWithinSection(sectionId, secondTaskId, 1, sections);

    expect(result[0]?.items).toEqual(taskIds);
  });

  it("should not affect other sections", () => {
    const sectionId1 = createGroupId(uuidv4());
    const sectionId2 = createGroupId(uuidv4());
    const taskIds1 = [createTaskId(uuidv4()), createTaskId(uuidv4())];
    const taskIds2 = [createTaskId(uuidv4()), createTaskId(uuidv4())];

    const firstTaskId1 = getArrayElement(taskIds1, 0);

    const sections = [
      createTestSection({ id: sectionId1, items: taskIds1 }),
      createTestSection({ id: sectionId2, items: taskIds2 }),
    ];

    const result = moveTaskWithinSection(sectionId1, firstTaskId1, 1, sections);

    expect(result[1]?.items).toEqual(taskIds2); // Unchanged
  });

  it("should handle empty items array", () => {
    const sectionId = createGroupId(uuidv4());
    const taskId = createTaskId(uuidv4());
    const sections = [createTestSection({ id: sectionId, items: [] })];

    const result = moveTaskWithinSection(sectionId, taskId, 0, sections);

    expect(result[0]?.items).toEqual([]);
  });

  it("should move task to beginning", () => {
    const sectionId = createGroupId(uuidv4());
    const taskIds = [
      createTaskId(uuidv4()),
      createTaskId(uuidv4()),
      createTaskId(uuidv4()),
    ];
    const sections = [
      createTestSection({
        id: sectionId,
        items: taskIds,
      }),
    ];

    const thirdTaskId = getArrayElement(taskIds, 2);
    const result = moveTaskWithinSection(sectionId, thirdTaskId, 0, sections);

    expect(result[0]?.items).toEqual([taskIds[2], taskIds[0], taskIds[1]]);
  });

  it("should move task to end", () => {
    const sectionId = createGroupId(uuidv4());
    const taskIds = [
      createTaskId(uuidv4()),
      createTaskId(uuidv4()),
      createTaskId(uuidv4()),
    ];
    const sections = [
      createTestSection({
        id: sectionId,
        items: taskIds,
      }),
    ];

    const moveToEndTaskId = getArrayElement(taskIds, 0);
    const result = moveTaskWithinSection(
      sectionId,
      moveToEndTaskId,
      2,
      sections,
    );

    expect(result[0]?.items).toEqual([taskIds[1], taskIds[2], taskIds[0]]);
  });
});

describe("addTaskToSection", () => {
  it("should append task to end when position is undefined", () => {
    const sectionId = createGroupId(uuidv4());
    const existingTaskId = createTaskId(uuidv4());
    const newTaskId = createTaskId(uuidv4());
    const sections = [
      createTestSection({
        id: sectionId,
        items: [existingTaskId],
      }),
    ];

    const result = addTaskToSection(newTaskId, sectionId, undefined, sections);

    expect(result[0]?.items).toEqual([existingTaskId, newTaskId]);
  });

  it("should insert task at specified position", () => {
    const sectionId = createGroupId(uuidv4());
    const taskIds = [createTaskId(uuidv4()), createTaskId(uuidv4())];
    const newTaskId = createTaskId(uuidv4());
    const sections = [
      createTestSection({
        id: sectionId,
        items: taskIds,
      }),
    ];

    const result = addTaskToSection(newTaskId, sectionId, 1, sections);

    expect(result[0]?.items).toEqual([taskIds[0], newTaskId, taskIds[1]]);
  });

  it("should not add task if already in section", () => {
    const sectionId = createGroupId(uuidv4());
    const taskId = createTaskId(uuidv4());
    const sections = [
      createTestSection({
        id: sectionId,
        items: [taskId],
      }),
    ];

    const result = addTaskToSection(taskId, sectionId, 0, sections);

    expect(result[0]?.items).toEqual([taskId]);
  });

  it("should handle empty items array", () => {
    const sectionId = createGroupId(uuidv4());
    const taskId = createTaskId(uuidv4());
    const sections = [
      createTestSection({
        id: sectionId,
        items: [],
      }),
    ];

    const result = addTaskToSection(taskId, sectionId, 0, sections);

    expect(result[0]?.items).toEqual([taskId]);
  });

  it("should not affect other sections", () => {
    const sectionId1 = createGroupId(uuidv4());
    const sectionId2 = createGroupId(uuidv4());
    const taskId = createTaskId(uuidv4());
    const existingTaskIds = [createTaskId(uuidv4()), createTaskId(uuidv4())];

    const sections = [
      createTestSection({ id: sectionId1, items: [] }),
      createTestSection({ id: sectionId2, items: existingTaskIds }),
    ];

    const result = addTaskToSection(taskId, sectionId1, 0, sections);

    expect(result[1]?.items).toEqual(existingTaskIds);
  });

  it("should add to beginning when position is 0", () => {
    const sectionId = createGroupId(uuidv4());
    const existingTaskIds = [createTaskId(uuidv4()), createTaskId(uuidv4())];
    const newTaskId = createTaskId(uuidv4());
    const sections = [
      createTestSection({
        id: sectionId,
        items: existingTaskIds,
      }),
    ];

    const result = addTaskToSection(newTaskId, sectionId, 0, sections);

    expect(result[0]?.items).toEqual([newTaskId, ...existingTaskIds]);
  });

  it("should handle adding to non-existent section", () => {
    const sectionId = createGroupId(uuidv4());
    const otherSectionId = createGroupId(uuidv4());
    const taskId = createTaskId(uuidv4());
    const sections = [createTestSection({ id: sectionId, items: [] })];

    const result = addTaskToSection(taskId, otherSectionId, 0, sections);

    // Should not modify existing section
    expect(result[0]?.items).toEqual([]);
  });

  it("should normalize negative position to 0 (insert at beginning)", () => {
    const sectionId = createGroupId(uuidv4());
    const existingTaskIds = [createTaskId(uuidv4()), createTaskId(uuidv4())];
    const newTaskId = createTaskId(uuidv4());
    const sections = [
      createTestSection({
        id: sectionId,
        items: existingTaskIds,
      }),
    ];

    // Position -1 should be normalized to 0, inserting at the beginning
    const result = addTaskToSection(newTaskId, sectionId, -1, sections);

    expect(result[0]?.items).toEqual([newTaskId, ...existingTaskIds]);
  });

  it("should normalize any negative position to 0", () => {
    const sectionId = createGroupId(uuidv4());
    const existingTaskIds = [createTaskId(uuidv4()), createTaskId(uuidv4())];
    const newTaskId = createTaskId(uuidv4());
    const sections = [
      createTestSection({
        id: sectionId,
        items: existingTaskIds,
      }),
    ];

    // Position -5 should also be normalized to 0
    const result = addTaskToSection(newTaskId, sectionId, -5, sections);

    expect(result[0]?.items).toEqual([newTaskId, ...existingTaskIds]);
  });
});

describe("removeTaskFromSection", () => {
  it("should remove task from section items", () => {
    const sectionId = createGroupId(uuidv4());
    const taskIds = [
      createTaskId(uuidv4()),
      createTaskId(uuidv4()),
      createTaskId(uuidv4()),
    ];
    const sections = [
      createTestSection({
        id: sectionId,
        items: taskIds,
      }),
    ];

    const removeSecondTaskId = getArrayElement(taskIds, 1);
    const result = removeTaskFromSection(
      removeSecondTaskId,
      sectionId,
      sections,
    );

    expect(result[0]?.items).toEqual([taskIds[0], taskIds[2]]);
  });

  it("should handle task not in section", () => {
    const sectionId = createGroupId(uuidv4());
    const taskIds = [createTaskId(uuidv4()), createTaskId(uuidv4())];
    const nonExistentTaskId = createTaskId(uuidv4());
    const sections = [
      createTestSection({
        id: sectionId,
        items: taskIds,
      }),
    ];

    const result = removeTaskFromSection(
      nonExistentTaskId,
      sectionId,
      sections,
    );

    expect(result[0]?.items).toEqual(taskIds);
  });

  it("should handle empty items array", () => {
    const sectionId = createGroupId(uuidv4());
    const taskId = createTaskId(uuidv4());
    const sections = [
      createTestSection({
        id: sectionId,
        items: [],
      }),
    ];

    const result = removeTaskFromSection(taskId, sectionId, sections);

    expect(result[0]?.items).toEqual([]);
  });

  it("should not affect other sections", () => {
    const sectionId1 = createGroupId(uuidv4());
    const sectionId2 = createGroupId(uuidv4());
    const taskId = createTaskId(uuidv4());
    const taskIds1 = [taskId, createTaskId(uuidv4())];
    const taskIds2 = [createTaskId(uuidv4()), createTaskId(uuidv4())];

    const sections = [
      createTestSection({ id: sectionId1, items: taskIds1 }),
      createTestSection({ id: sectionId2, items: taskIds2 }),
    ];

    const result = removeTaskFromSection(taskId, sectionId1, sections);

    expect(result[1]?.items).toEqual(taskIds2);
  });

  it("should remove all occurrences of task ID", () => {
    const sectionId = createGroupId(uuidv4());
    const taskId = createTaskId(uuidv4());
    const otherTaskId = createTaskId(uuidv4());
    // Duplicate task ID (shouldn't happen in practice, but test for safety)
    const items = [taskId, otherTaskId, taskId];
    const sections = [
      createTestSection({
        id: sectionId,
        items,
      }),
    ];

    const result = removeTaskFromSection(taskId, sectionId, sections);

    expect(result[0]?.items).toEqual([otherTaskId]);
  });

  it("should handle removing from non-existent section", () => {
    const sectionId = createGroupId(uuidv4());
    const otherSectionId = createGroupId(uuidv4());
    const taskId = createTaskId(uuidv4());
    const taskIds = [taskId, createTaskId(uuidv4())];
    const sections = [createTestSection({ id: sectionId, items: taskIds })];

    const result = removeTaskFromSection(taskId, otherSectionId, sections);

    // Should not modify existing section
    expect(result[0]?.items).toEqual(taskIds);
  });

  it("should remove from beginning", () => {
    const sectionId = createGroupId(uuidv4());
    const taskIds = [
      createTaskId(uuidv4()),
      createTaskId(uuidv4()),
      createTaskId(uuidv4()),
    ];
    const sections = [
      createTestSection({
        id: sectionId,
        items: taskIds,
      }),
    ];

    const removeFirstTaskId = getArrayElement(taskIds, 0);
    const result = removeTaskFromSection(
      removeFirstTaskId,
      sectionId,
      sections,
    );

    expect(result[0]?.items).toEqual([taskIds[1], taskIds[2]]);
  });

  it("should remove from end", () => {
    const sectionId = createGroupId(uuidv4());
    const taskIds = [
      createTaskId(uuidv4()),
      createTaskId(uuidv4()),
      createTaskId(uuidv4()),
    ];
    const sections = [
      createTestSection({
        id: sectionId,
        items: taskIds,
      }),
    ];

    const removeThirdTaskId = getArrayElement(taskIds, 2);
    const result = removeTaskFromSection(
      removeThirdTaskId,
      sectionId,
      sections,
    );

    expect(result[0]?.items).toEqual([taskIds[0], taskIds[1]]);
  });
});

describe("taskOrderingUtils", () => {
  it("should export all ordering functions", () => {
    expect(taskOrderingUtils.getOrderedTasksForProject).toBe(
      getOrderedTasksForProject,
    );
    expect(taskOrderingUtils.getOrderedTasksForSection).toBe(
      getOrderedTasksForSection,
    );
    expect(taskOrderingUtils.moveTaskWithinSection).toBe(moveTaskWithinSection);
    expect(taskOrderingUtils.addTaskToSection).toBe(addTaskToSection);
    expect(taskOrderingUtils.removeTaskFromSection).toBe(removeTaskFromSection);
  });

  it("should have correct number of exports", () => {
    const exportedFunctions = Object.keys(taskOrderingUtils);
    expect(exportedFunctions).toHaveLength(5);
  });
});
