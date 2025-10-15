import { describe, it, expect } from "vitest";
import { taskToCreateTaskRequest } from "./utils";
import { TaskSchema } from "./core";
import {
  createTaskId,
  createSubtaskId,
  createCommentId,
  createUserId,
} from "./id";
import { CreateTaskRequestSchema } from "./api-requests";

describe("taskToCreateTaskRequest", () => {
  it("should convert a valid task to CreateTaskRequest", () => {
    // Create a complete task with proper IDs
    const task = TaskSchema.parse({
      id: createTaskId("550e8400-e29b-41d4-a716-446655440000"),
      title: "Test Task",
      description: "Test description",
      completed: false,
      priority: 2,
      dueDate: "2024-01-15",
      dueTime: "14:30:00",
      projectId: createTaskId("550e8400-e29b-41d4-a716-446655440001"),
      labels: [createTaskId("550e8400-e29b-41d4-a716-446655440002")],
      subtasks: [],
      comments: [],
      createdAt: new Date("2024-01-10T10:00:00.000Z"),
      recurring: "RRULE:FREQ=DAILY",
      recurringMode: "dueDate",
      estimation: 3600,
    });

    const result = taskToCreateTaskRequest(task);

    // Should be a valid CreateTaskRequest
    expect(CreateTaskRequestSchema.safeParse(result).success).toBe(true);

    // Should contain only the allowed fields
    expect(result).toMatchObject({
      title: "Test Task",
      description: "Test description",
      priority: 2,
      projectId: createTaskId("550e8400-e29b-41d4-a716-446655440001"),
      labels: [createTaskId("550e8400-e29b-41d4-a716-446655440002")],
      subtasks: [],
      recurring: "RRULE:FREQ=DAILY",
      recurringMode: "dueDate",
      estimation: 3600,
    });

    // Should NOT contain fields that are omitted in CreateTaskRequest
    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("completedAt");
    expect(result).not.toHaveProperty("completed");
  });

  it("should handle a task with minimal fields", () => {
    const task = TaskSchema.parse({
      id: createTaskId("550e8400-e29b-41d4-a716-446655440000"),
      title: "Simple Task",
      completed: false,
      priority: 4,
      labels: [],
      subtasks: [],
      comments: [],
      createdAt: new Date("2024-01-10T10:00:00.000Z"),
      recurringMode: "dueDate",
    });

    const result = taskToCreateTaskRequest(task);

    expect(CreateTaskRequestSchema.safeParse(result).success).toBe(true);
    expect(result).toEqual({
      title: "Simple Task",
      priority: 4,
      labels: [],
      recurringMode: "dueDate",
      subtasks: [],
      comments: [],
    });
  });

  it("should handle tasks with subtasks and comments", () => {
    const task = TaskSchema.parse({
      id: createTaskId("550e8400-e29b-41d4-a716-446655440000"),
      title: "Task with subtasks",
      completed: false,
      priority: 1,
      labels: [],
      subtasks: [
        {
          id: createSubtaskId("550e8400-e29b-41d4-a716-446655440003"),
          title: "Subtask 1",
          completed: false,
        },
      ],
      comments: [
        {
          id: createCommentId("550e8400-e29b-41d4-a716-446655440004"),
          content: "A comment",
          createdAt: new Date("2024-01-10T10:00:00.000Z"),
          userId: createUserId("550e8400-e29b-41d4-a716-446655440005"),
        },
      ],
      createdAt: new Date("2024-01-10T10:00:00.000Z"),
      recurringMode: "dueDate",
    });

    const result = taskToCreateTaskRequest(task);

    expect(CreateTaskRequestSchema.safeParse(result).success).toBe(true);
    expect(result).toMatchObject({
      title: "Task with subtasks",
      priority: 1,
      labels: [],
      subtasks: [
        expect.objectContaining({
          title: "Subtask 1",
          completed: false,
        }),
      ],
      comments: [
        expect.objectContaining({
          content: "A comment",
        }),
      ],
    });
  });

  it("should throw error for invalid task data", () => {
    // Create a valid task first, then mutate it to invalid state
    const task = TaskSchema.parse({
      id: createTaskId("550e8400-e29b-41d4-a716-446655440000"),
      title: "Test Task",
      completed: false,
      priority: 1,
      labels: [],
      subtasks: [],
      comments: [],
      createdAt: new Date("2024-01-10T10:00:00.000Z"),
      recurringMode: "dueDate",
    });

    // Mutate the priority to an invalid value (bypassing TypeScript checks)
    Object.assign(task, { priority: 0 });

    expect(() => taskToCreateTaskRequest(task)).toThrow(
      "Failed to convert Task to CreateTaskRequest",
    );
  });
});
