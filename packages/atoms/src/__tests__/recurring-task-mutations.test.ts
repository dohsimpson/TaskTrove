import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Task, Project } from "@tasktrove/types/core";
import {
  createGroupId,
  createProjectId,
  createTaskId,
  type GroupId,
  type TaskId,
} from "@tasktrove/types/id";
import { buildTaskUpdatePayloads } from "../mutations/tasks";

vi.mock("@tasktrove/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tasktrove/utils")>();
  return {
    ...actual,
    processRecurringTaskCompletion: vi.fn(),
  };
});

vi.mock("uuid", () => ({
  v4: vi.fn(() => "11111111-2222-4333-8444-555555555555"),
}));

import { processRecurringTaskCompletion } from "@tasktrove/utils";

const mockProcessRecurring = vi.mocked(processRecurringTaskCompletion);

const DEFAULT_SECTION_ID = createGroupId(
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
);
const SECOND_SECTION_ID = createGroupId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
const PROJECT_ID = createProjectId("33333333-3333-4333-8333-333333333333");

const baseProject: Project = {
  id: PROJECT_ID,
  name: "Project Alpha",
  color: "#3b82f6",
  sections: [
    {
      id: DEFAULT_SECTION_ID,
      name: "Default",
      type: "section",
      items: [],
      isDefault: true,
    },
    {
      id: SECOND_SECTION_ID,
      name: "Section B",
      type: "section",
      items: [],
    },
  ],
};

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: createTaskId("00000000-0000-4000-8000-000000000001"),
  title: "Recurring Task",
  completed: false,
  completedAt: undefined,
  dueDate: new Date("2024-01-15T09:00:00.000Z"),
  recurring: "RRULE:FREQ=DAILY",
  recurringMode: "dueDate",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  labels: [],
  subtasks: [],
  comments: [],
  priority: 3,
  projectId: PROJECT_ID,
  ...overrides,
});

const placeTaskInSection = (
  project: Project,
  taskId: TaskId,
  sectionId: GroupId,
): Project => {
  return {
    ...project,
    sections: project.sections.map((section) =>
      section.id === sectionId
        ? { ...section, items: [...section.items, taskId] }
        : section,
    ),
  };
};

describe("buildTaskUpdatePayloads (recurring tasks)", () => {
  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date("2024-01-15T10:00:00.000Z"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a history task and advances anchor when completing a recurring task", () => {
    const anchorTask = makeTask({ trackingId: undefined });
    const nextInstance = makeTask({
      id: createTaskId("99999999-9999-4999-8999-999999999999"),
      completed: false,
      completedAt: undefined,
      dueDate: new Date("2024-01-16T09:00:00.000Z"),
    });

    mockProcessRecurring.mockReturnValue(nextInstance);

    const projectWithTask = placeTaskInSection(
      baseProject,
      anchorTask.id,
      SECOND_SECTION_ID,
    );
    const { updates, historyTasks } = buildTaskUpdatePayloads(
      [{ id: anchorTask.id, completed: true }],
      [anchorTask],
      [projectWithTask],
    );

    expect(mockProcessRecurring).toHaveBeenCalled();
    expect(historyTasks).toHaveLength(1);
    const history = historyTasks[0];
    expect(history?.completed).toBe(true);
    expect(history?.recurring).toBeUndefined();
    expect(history?.sectionId).toBe(SECOND_SECTION_ID);
    expect(history?.trackingId).toBe(anchorTask.id);

    expect(updates).toHaveLength(1);
    const anchorUpdate = updates[0];
    expect(anchorUpdate?.completed).toBe(false);
    expect(anchorUpdate?.completedAt).toBeUndefined();
    expect(anchorUpdate?.recurring).toBe(nextInstance.recurring);
    expect(anchorUpdate?.dueDate).toEqual(nextInstance.dueDate);
    expect(anchorUpdate?.trackingId).toBe(anchorTask.id);
  });

  it("backfills trackingId for legacy recurring tasks and propagates to history", () => {
    const legacyTask = makeTask({ trackingId: undefined });
    const nextInstance = makeTask({
      id: createTaskId("99999999-9999-4999-8999-999999999998"),
      dueDate: new Date("2024-01-16T09:00:00.000Z"),
    });
    mockProcessRecurring.mockReturnValue(nextInstance);

    const projectWithTask = placeTaskInSection(
      baseProject,
      legacyTask.id,
      DEFAULT_SECTION_ID,
    );
    const { updates, historyTasks } = buildTaskUpdatePayloads(
      [{ id: legacyTask.id, completed: true }],
      [legacyTask],
      [projectWithTask],
    );

    expect(historyTasks).toHaveLength(1);
    expect(historyTasks[0]?.trackingId).toBe(legacyTask.id);
    expect(updates[0]?.trackingId).toBe(legacyTask.id);
  });

  it("keeps history in the original section when project unchanged", () => {
    const task = makeTask();
    const projectWithTask = placeTaskInSection(
      baseProject,
      task.id,
      SECOND_SECTION_ID,
    );
    const nextInstance = makeTask({
      id: createTaskId("88888888-8888-4888-8888-888888888888"),
      dueDate: new Date("2024-01-16T09:00:00.000Z"),
    });
    mockProcessRecurring.mockReturnValue(nextInstance);

    const { historyTasks } = buildTaskUpdatePayloads(
      [{ id: task.id, completed: true }],
      [task],
      [projectWithTask],
    );

    expect(historyTasks[0]?.sectionId).toBe(SECOND_SECTION_ID);
  });

  it("creates history only for recurring tasks in mixed batches", () => {
    const recurringTask = makeTask({
      id: createTaskId("11111111-1111-4111-8111-111111111111"),
    });
    const nonRecurringTask = makeTask({
      id: createTaskId("22222222-2222-4222-8222-222222222222"),
      recurring: undefined,
    });
    const nextInstance = makeTask({
      id: createTaskId("77777777-7777-4777-8777-777777777777"),
      dueDate: new Date("2024-01-16T09:00:00.000Z"),
    });
    mockProcessRecurring.mockReturnValue(nextInstance);

    const projectWithTasks = placeTaskInSection(
      placeTaskInSection(baseProject, recurringTask.id, DEFAULT_SECTION_ID),
      nonRecurringTask.id,
      DEFAULT_SECTION_ID,
    );

    const { updates, historyTasks } = buildTaskUpdatePayloads(
      [
        { id: recurringTask.id, completed: true },
        { id: nonRecurringTask.id, title: "noop" },
      ],
      [recurringTask, nonRecurringTask],
      [projectWithTasks],
    );

    expect(historyTasks).toHaveLength(1);
    expect(historyTasks[0]?.id).toBe(
      createTaskId("11111111-2222-4333-8444-555555555555"),
    );
    expect(updates).toHaveLength(2);
  });

  it("returns no history tasks when updating non-recurring tasks", () => {
    const task = makeTask({ recurring: undefined });
    const { historyTasks, updates } = buildTaskUpdatePayloads(
      [{ id: task.id, completed: true }],
      [task],
      [baseProject],
    );

    expect(historyTasks).toHaveLength(0);
    expect(updates).toHaveLength(1);
  });

  it("preserves explicit nulls for nullable update fields", () => {
    const task = makeTask({
      recurring: undefined,
      dueTime: new Date("2024-01-15T14:30:00.000Z"),
    });
    const { updates } = buildTaskUpdatePayloads(
      [{ id: task.id, dueTime: null }],
      [task],
      [baseProject],
    );

    expect(updates).toHaveLength(1);
    expect(updates[0]?.dueTime).toBeNull();
  });
});
