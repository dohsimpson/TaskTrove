import { describe, it, expect } from "vitest";
import {
  getOrderedTasksForProject,
  moveTaskWithinProject,
  moveTaskWithinSection,
  addTaskToProjectOrder,
  removeTaskFromProjectOrder,
  taskOrderingUtils,
} from "./ordering";
import type {
  Task,
  Project,
  TaskId,
  ProjectId,
  SectionId,
} from "@tasktrove/types";
import {
  createTaskId,
  createProjectId,
  createSectionId,
} from "@tasktrove/types";
import { DEFAULT_UUID } from "@tasktrove/constants";
import { v4 as uuidv4 } from "uuid";

// Test helper factories
function createTestTask(overrides: Partial<Task> = {}): Task {
  return {
    id: createTaskId(uuidv4()),
    title: "Test Task",
    completed: false,
    priority: 4,
    projectId: createProjectId(uuidv4()),
    sectionId: createSectionId(DEFAULT_UUID),
    labels: [],
    subtasks: [],
    comments: [],
    attachments: [],
    status: "active",
    recurringMode: "dueDate",
    createdAt: new Date(),
    ...overrides,
  };
}

function createTestProject(overrides: Partial<Project> = {}): Project {
  return {
    id: createProjectId(uuidv4()),
    name: "Test Project",
    slug: "test-project",
    sections: [],
    color: "#000000",
    shared: false,
    taskOrder: [],
    ...overrides,
  };
}

describe("getOrderedTasksForProject", () => {
  it("should return tasks filtered by projectId when no taskOrder exists", () => {
    const projectId = createProjectId(uuidv4());
    const tasks: Task[] = [
      createTestTask({ projectId, title: "Task 1" }),
      createTestTask({ projectId, title: "Task 2" }),
      createTestTask({ projectId: createProjectId(uuidv4()), title: "Task 3" }), // Different project
    ];
    const projects: Project[] = [createTestProject({ id: projectId })];

    const result = getOrderedTasksForProject(projectId, tasks, projects);

    expect(result).toHaveLength(2);
    expect(result[0]?.title).toBe("Task 1");
    expect(result[1]?.title).toBe("Task 2");
  });

  it("should return empty array when project has no tasks", () => {
    const projectId = createProjectId(uuidv4());
    const tasks: Task[] = [
      createTestTask({ projectId: createProjectId(uuidv4()) }), // Different project
    ];
    const projects: Project[] = [createTestProject({ id: projectId })];

    const result = getOrderedTasksForProject(projectId, tasks, projects);

    expect(result).toHaveLength(0);
  });

  it("should return tasks in taskOrder when project has taskOrder", () => {
    const projectId = createProjectId(uuidv4());
    const task1 = createTestTask({ projectId, title: "Task 1" });
    const task2 = createTestTask({ projectId, title: "Task 2" });
    const task3 = createTestTask({ projectId, title: "Task 3" });

    const tasks: Task[] = [task1, task2, task3];
    const projects: Project[] = [
      createTestProject({
        id: projectId,
        taskOrder: [task3.id, task1.id, task2.id], // Custom order
      }),
    ];

    const result = getOrderedTasksForProject(projectId, tasks, projects);

    expect(result).toHaveLength(3);
    expect(result[0]?.title).toBe("Task 3");
    expect(result[1]?.title).toBe("Task 1");
    expect(result[2]?.title).toBe("Task 2");
  });

  it("should filter out tasks not in project even if in taskOrder", () => {
    const projectId = createProjectId(uuidv4());
    const otherProjectId = createProjectId(uuidv4());
    const task1 = createTestTask({ projectId, title: "Task 1" });
    const task2 = createTestTask({
      projectId: otherProjectId,
      title: "Task 2",
    });

    const tasks: Task[] = [task1, task2];
    const projects: Project[] = [
      createTestProject({
        id: projectId,
        taskOrder: [task1.id, task2.id], // task2 is not in this project
      }),
    ];

    const result = getOrderedTasksForProject(projectId, tasks, projects);

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Task 1");
  });

  it("should handle taskOrder with non-existent task IDs", () => {
    const projectId = createProjectId(uuidv4());
    const task1 = createTestTask({ projectId, title: "Task 1" });
    const nonExistentId = createTaskId(uuidv4());

    const tasks: Task[] = [task1];
    const projects: Project[] = [
      createTestProject({
        id: projectId,
        taskOrder: [nonExistentId, task1.id],
      }),
    ];

    const result = getOrderedTasksForProject(projectId, tasks, projects);

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Task 1");
  });
});

describe("moveTaskWithinProject", () => {
  it("should move task to new position in taskOrder", () => {
    const projectId = createProjectId(uuidv4());
    const taskIds = [
      createTaskId(uuidv4()),
      createTaskId(uuidv4()),
      createTaskId(uuidv4()),
    ];
    const projects: Project[] = [
      createTestProject({
        id: projectId,
        taskOrder: taskIds,
      }),
    ];

    const result = moveTaskWithinProject(projectId, taskIds[0]!, 2, projects);

    expect(result[0]?.taskOrder).toEqual([taskIds[1], taskIds[2], taskIds[0]]);
  });

  it("should return unchanged project if taskId not in taskOrder", () => {
    const projectId = createProjectId(uuidv4());
    const taskIds = [createTaskId(uuidv4()), createTaskId(uuidv4())];
    const nonExistentTaskId = createTaskId(uuidv4());
    const projects: Project[] = [
      createTestProject({
        id: projectId,
        taskOrder: taskIds,
      }),
    ];

    const result = moveTaskWithinProject(
      projectId,
      nonExistentTaskId,
      1,
      projects,
    );

    expect(result[0]?.taskOrder).toEqual(taskIds);
  });

  it("should handle moving to same position", () => {
    const projectId = createProjectId(uuidv4());
    const taskIds = [
      createTaskId(uuidv4()),
      createTaskId(uuidv4()),
      createTaskId(uuidv4()),
    ];
    const projects: Project[] = [
      createTestProject({
        id: projectId,
        taskOrder: taskIds,
      }),
    ];

    const result = moveTaskWithinProject(projectId, taskIds[1]!, 1, projects);

    expect(result[0]?.taskOrder).toEqual(taskIds);
  });

  it("should not affect other projects", () => {
    const projectId1 = createProjectId(uuidv4());
    const projectId2 = createProjectId(uuidv4());
    const taskIds1 = [createTaskId(uuidv4()), createTaskId(uuidv4())];
    const taskIds2 = [createTaskId(uuidv4()), createTaskId(uuidv4())];

    const projects: Project[] = [
      createTestProject({ id: projectId1, taskOrder: taskIds1 }),
      createTestProject({ id: projectId2, taskOrder: taskIds2 }),
    ];

    const result = moveTaskWithinProject(projectId1, taskIds1[0]!, 1, projects);

    expect(result[1]?.taskOrder).toEqual(taskIds2); // Unchanged
  });

  it("should handle empty taskOrder", () => {
    const projectId = createProjectId(uuidv4());
    const taskId = createTaskId(uuidv4());
    const projects: Project[] = [
      createTestProject({ id: projectId, taskOrder: [] }),
    ];

    const result = moveTaskWithinProject(projectId, taskId, 0, projects);

    expect(result[0]?.taskOrder).toEqual([]);
  });
});

describe("moveTaskWithinSection", () => {
  it("should move task within section maintaining section boundaries", () => {
    const projectId = createProjectId(uuidv4());
    const sectionId = createSectionId(uuidv4());
    const section1Tasks = [
      createTestTask({ projectId, sectionId, title: "S1-T1" }),
      createTestTask({ projectId, sectionId, title: "S1-T2" }),
      createTestTask({ projectId, sectionId, title: "S1-T3" }),
    ];
    const section2Tasks = [
      createTestTask({
        projectId,
        sectionId: createSectionId(uuidv4()),
        title: "S2-T1",
      }),
    ];

    const tasks = [...section1Tasks, ...section2Tasks];
    const projects: Project[] = [
      createTestProject({
        id: projectId,
        taskOrder: tasks.map((t) => t.id),
      }),
    ];

    const result = moveTaskWithinSection(
      projectId,
      section1Tasks[0]!.id,
      2,
      sectionId,
      projects,
      tasks,
    );

    const newOrder = result[0]?.taskOrder;
    expect(newOrder).toBeDefined();
    expect(newOrder![0]).toBe(section1Tasks[1]!.id);
    expect(newOrder![1]).toBe(section1Tasks[2]!.id);
    expect(newOrder![2]).toBe(section1Tasks[0]!.id);
    expect(newOrder![3]).toBe(section2Tasks[0]!.id); // Section 2 unchanged
  });

  it("should handle DEFAULT_UUID section compatibility", () => {
    const projectId = createProjectId(uuidv4());
    const task1 = createTestTask({
      projectId,
      sectionId: createSectionId(DEFAULT_UUID),
      title: "Task 1",
    });
    const task2 = createTestTask({
      projectId,
      sectionId: createSectionId(DEFAULT_UUID),
      title: "Task 2",
    });

    const tasks = [task1, task2];
    const projects: Project[] = [
      createTestProject({
        id: projectId,
        taskOrder: [task1.id, task2.id],
      }),
    ];

    const result = moveTaskWithinSection(
      projectId,
      task1.id,
      1,
      createSectionId(DEFAULT_UUID),
      projects,
      tasks,
    );

    expect(result[0]?.taskOrder).toEqual([task2.id, task1.id]);
  });

  it("should add section tasks to taskOrder if not present", () => {
    const projectId = createProjectId(uuidv4());
    const sectionId = createSectionId(uuidv4());
    const task1 = createTestTask({
      projectId,
      sectionId,
      title: "Task 1",
      createdAt: new Date("2024-01-01"),
    });
    const task2 = createTestTask({
      projectId,
      sectionId,
      title: "Task 2",
      createdAt: new Date("2024-01-02"),
    });

    const tasks = [task1, task2];
    const projects: Project[] = [
      createTestProject({
        id: projectId,
        taskOrder: [], // Empty order
      }),
    ];

    const result = moveTaskWithinSection(
      projectId,
      task1.id,
      1,
      sectionId,
      projects,
      tasks,
    );

    expect(result[0]?.taskOrder).toEqual([task2.id, task1.id]);
  });

  it("should maintain creation order for tasks not in taskOrder", () => {
    const projectId = createProjectId(uuidv4());
    const sectionId = createSectionId(uuidv4());
    const task1 = createTestTask({
      projectId,
      sectionId,
      title: "Task 1",
      createdAt: new Date("2024-01-03"),
    });
    const task2 = createTestTask({
      projectId,
      sectionId,
      title: "Task 2",
      createdAt: new Date("2024-01-01"),
    });
    const task3 = createTestTask({
      projectId,
      sectionId,
      title: "Task 3",
      createdAt: new Date("2024-01-02"),
    });

    const tasks = [task1, task2, task3];
    const projects: Project[] = [
      createTestProject({
        id: projectId,
        taskOrder: [],
      }),
    ];

    const result = moveTaskWithinSection(
      projectId,
      task2.id,
      2,
      sectionId,
      projects,
      tasks,
    );

    // Initial order by creation: task2, task3, task1
    // Move task2 to position 2: task3, task1, task2
    expect(result[0]?.taskOrder).toEqual([task3.id, task1.id, task2.id]);
  });

  it("should return unchanged if task not in section", () => {
    const projectId = createProjectId(uuidv4());
    const sectionId = createSectionId(uuidv4());
    const task1 = createTestTask({
      projectId,
      sectionId,
      title: "Task 1",
    });
    const nonExistentTaskId = createTaskId(uuidv4());

    const tasks = [task1];
    const projects: Project[] = [
      createTestProject({
        id: projectId,
        taskOrder: [task1.id],
      }),
    ];

    const result = moveTaskWithinSection(
      projectId,
      nonExistentTaskId,
      1,
      sectionId,
      projects,
      tasks,
    );

    expect(result[0]?.taskOrder).toEqual([task1.id]);
  });
});

describe("addTaskToProjectOrder", () => {
  it("should append task to end when position is undefined", () => {
    const projectId = createProjectId(uuidv4());
    const existingTaskId = createTaskId(uuidv4());
    const newTaskId = createTaskId(uuidv4());
    const projects: Project[] = [
      createTestProject({
        id: projectId,
        taskOrder: [existingTaskId],
      }),
    ];

    const result = addTaskToProjectOrder(
      newTaskId,
      projectId,
      undefined,
      projects,
    );

    expect(result[0]?.taskOrder).toEqual([existingTaskId, newTaskId]);
  });

  it("should insert task at specified position", () => {
    const projectId = createProjectId(uuidv4());
    const taskIds = [createTaskId(uuidv4()), createTaskId(uuidv4())];
    const newTaskId = createTaskId(uuidv4());
    const projects: Project[] = [
      createTestProject({
        id: projectId,
        taskOrder: taskIds,
      }),
    ];

    const result = addTaskToProjectOrder(newTaskId, projectId, 1, projects);

    expect(result[0]?.taskOrder).toEqual([taskIds[0], newTaskId, taskIds[1]]);
  });

  it("should not add task if already in taskOrder", () => {
    const projectId = createProjectId(uuidv4());
    const taskId = createTaskId(uuidv4());
    const projects: Project[] = [
      createTestProject({
        id: projectId,
        taskOrder: [taskId],
      }),
    ];

    const result = addTaskToProjectOrder(taskId, projectId, 0, projects);

    expect(result[0]?.taskOrder).toEqual([taskId]);
  });

  it("should handle empty taskOrder", () => {
    const projectId = createProjectId(uuidv4());
    const taskId = createTaskId(uuidv4());
    const projects: Project[] = [
      createTestProject({
        id: projectId,
        taskOrder: [],
      }),
    ];

    const result = addTaskToProjectOrder(taskId, projectId, 0, projects);

    expect(result[0]?.taskOrder).toEqual([taskId]);
  });

  it("should not affect other projects", () => {
    const projectId1 = createProjectId(uuidv4());
    const projectId2 = createProjectId(uuidv4());
    const taskId = createTaskId(uuidv4());
    const existingTaskIds = [createTaskId(uuidv4()), createTaskId(uuidv4())];

    const projects: Project[] = [
      createTestProject({ id: projectId1, taskOrder: [] }),
      createTestProject({ id: projectId2, taskOrder: existingTaskIds }),
    ];

    const result = addTaskToProjectOrder(taskId, projectId1, 0, projects);

    expect(result[1]?.taskOrder).toEqual(existingTaskIds);
  });
});

describe("removeTaskFromProjectOrder", () => {
  it("should remove task from taskOrder", () => {
    const projectId = createProjectId(uuidv4());
    const taskIds = [
      createTaskId(uuidv4()),
      createTaskId(uuidv4()),
      createTaskId(uuidv4()),
    ];
    const projects: Project[] = [
      createTestProject({
        id: projectId,
        taskOrder: taskIds,
      }),
    ];

    const result = removeTaskFromProjectOrder(taskIds[1]!, projectId, projects);

    expect(result[0]?.taskOrder).toEqual([taskIds[0], taskIds[2]]);
  });

  it("should handle task not in taskOrder", () => {
    const projectId = createProjectId(uuidv4());
    const taskIds = [createTaskId(uuidv4()), createTaskId(uuidv4())];
    const nonExistentTaskId = createTaskId(uuidv4());
    const projects: Project[] = [
      createTestProject({
        id: projectId,
        taskOrder: taskIds,
      }),
    ];

    const result = removeTaskFromProjectOrder(
      nonExistentTaskId,
      projectId,
      projects,
    );

    expect(result[0]?.taskOrder).toEqual(taskIds);
  });

  it("should handle empty taskOrder", () => {
    const projectId = createProjectId(uuidv4());
    const taskId = createTaskId(uuidv4());
    const projects: Project[] = [
      createTestProject({
        id: projectId,
        taskOrder: [],
      }),
    ];

    const result = removeTaskFromProjectOrder(taskId, projectId, projects);

    expect(result[0]?.taskOrder).toEqual([]);
  });

  it("should not affect other projects", () => {
    const projectId1 = createProjectId(uuidv4());
    const projectId2 = createProjectId(uuidv4());
    const taskId = createTaskId(uuidv4());
    const taskIds1 = [taskId, createTaskId(uuidv4())];
    const taskIds2 = [createTaskId(uuidv4()), createTaskId(uuidv4())];

    const projects: Project[] = [
      createTestProject({ id: projectId1, taskOrder: taskIds1 }),
      createTestProject({ id: projectId2, taskOrder: taskIds2 }),
    ];

    const result = removeTaskFromProjectOrder(taskId, projectId1, projects);

    expect(result[1]?.taskOrder).toEqual(taskIds2);
  });

  it("should remove all occurrences of task ID", () => {
    const projectId = createProjectId(uuidv4());
    const taskId = createTaskId(uuidv4());
    const otherTaskId = createTaskId(uuidv4());
    // Duplicate task ID (shouldn't happen in practice, but test for safety)
    const taskOrder = [taskId, otherTaskId, taskId];
    const projects: Project[] = [
      createTestProject({
        id: projectId,
        taskOrder,
      }),
    ];

    const result = removeTaskFromProjectOrder(taskId, projectId, projects);

    expect(result[0]?.taskOrder).toEqual([otherTaskId]);
  });
});

describe("taskOrderingUtils", () => {
  it("should export all ordering functions", () => {
    expect(taskOrderingUtils.getOrderedTasksForProject).toBe(
      getOrderedTasksForProject,
    );
    expect(taskOrderingUtils.moveTaskWithinProject).toBe(moveTaskWithinProject);
    expect(taskOrderingUtils.moveTaskWithinSection).toBe(moveTaskWithinSection);
    expect(taskOrderingUtils.addTaskToProjectOrder).toBe(addTaskToProjectOrder);
    expect(taskOrderingUtils.removeTaskFromProjectOrder).toBe(
      removeTaskFromProjectOrder,
    );
  });
});
