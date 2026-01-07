import { describe, it, expect } from "vitest";
import { includeFocusedTask, type TaskFocusVisibility } from "../ui/task-focus";
import type { Task } from "@tasktrove/types/core";
import { createTaskId } from "@tasktrove/types/id";

function makeTask(id: string, overrides: Partial<Task> = {}): Task {
  const taskId = createTaskId(id);
  return {
    id: taskId,
    title: `Task ${id}`,
    description: "",
    completed: false,
    priority: 4,
    dueDate: undefined,
    dueTime: undefined,
    projectId: undefined,
    labels: [],
    subtasks: [],
    comments: [],
    createdAt: new Date("2025-01-01T00:00:00Z"),
    completedAt: undefined,
    recurring: undefined,
    recurringMode: "dueDate",
    estimation: undefined,
    trackingId: undefined,
    ...overrides,
  };
}

const focusTaskId = "123e4567-e89b-12d3-a456-426614174000";
const otherTaskId = "123e4567-e89b-12d3-a456-426614174001";
const taskAId = "123e4567-e89b-12d3-a456-426614174002";

const focus: TaskFocusVisibility = {
  taskId: createTaskId(focusTaskId),
  viewId: "today",
  routeType: "standard",
};

describe("includeFocusedTask", () => {
  it("adds the focused task when not present and view matches", () => {
    const base = [makeTask(focusTaskId)];
    const list = [makeTask(taskAId)];
    const result = includeFocusedTask(list, base, focus, null, "today");
    expect(result[0]?.id).toBe(createTaskId(focusTaskId));
    expect(result).toHaveLength(2);
  });

  it("does not duplicate when already present", () => {
    const list = [makeTask(focusTaskId), makeTask(taskAId)];
    const result = includeFocusedTask(list, list, focus, null, "today");
    expect(result).toHaveLength(2);
  });

  it("skips when view does not match", () => {
    const base = [makeTask(focusTaskId)];
    const list = [makeTask(taskAId)];
    const result = includeFocusedTask(list, base, focus, null, "inbox");
    expect(result).toEqual(list);
  });

  it("skips when a different task is selected", () => {
    const base = [makeTask(focusTaskId)];
    const list = [makeTask(taskAId)];
    const result = includeFocusedTask(
      list,
      base,
      focus,
      createTaskId(otherTaskId),
      "today",
    );
    expect(result).toEqual(list);
  });
});
