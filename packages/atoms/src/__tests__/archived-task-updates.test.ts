import { describe, it, expect, beforeEach, vi } from "vitest";
import { atom, createStore } from "jotai";
import type { Task } from "@tasktrove/types/core";
import { createProjectId, createTaskId } from "@tasktrove/types/id";
import type { TaskId } from "@tasktrove/types/id";

const hoisted = vi.hoisted(() => ({
  toastMock: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
  archivedTaskId: "10000000-0000-4000-8000-000000000001",
  activeTaskId: "20000000-0000-4000-8000-000000000002",
  projectId: "30000000-0000-4000-8000-000000000003",
}));

let mutateAsyncMock: ReturnType<typeof vi.fn> = vi.fn();

// Mock helpers before importing atoms
vi.mock("@tasktrove/atoms/utils/atom-helpers", () => {
  return {
    namedAtom: <AtomType extends ReturnType<typeof atom>>(
      name: string,
      value: AtomType,
    ) => {
      value.debugLabel = name;
      return value;
    },
    handleAtomError: vi.fn(),
    withErrorHandling: (fn: () => unknown, _ctx: string, fallback: unknown) => {
      try {
        return fn();
      } catch {
        return fallback;
      }
    },
    toast: hoisted.toastMock,
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
});

vi.mock("@tasktrove/atoms/data/tasks/ordering", () => ({
  addTaskToSection: () => [],
  removeTaskFromSection: vi.fn(),
  moveTaskWithinSection: vi.fn(),
  getOrderedTasksForProject: vi.fn(),
  getOrderedTasksForSection: vi.fn(),
}));

vi.mock("@tasktrove/atoms/core/history", () => ({
  recordOperationAtom: atom(null, vi.fn()),
}));

vi.mock("@tasktrove/atoms/core/notifications", () => ({
  notificationAtoms: {
    actions: {
      scheduleTask: atom(null, vi.fn()),
      cancelTask: atom(null, vi.fn()),
    },
  },
}));

vi.mock("@tasktrove/atoms/mutations/projects", () => ({
  updateProjectsMutationAtom: atom({ mutateAsync: vi.fn() }),
}));

vi.mock("@tasktrove/atoms/mutations/tasks", () => ({
  createTaskMutationAtom: atom({ mutateAsync: vi.fn() }),
  deleteTaskMutationAtom: atom({ mutateAsync: vi.fn() }),
  updateTasksMutationAtom: atom({
    mutateAsync: (...args: unknown[]) => mutateAsyncMock(...args),
  }),
}));

vi.mock("@tasktrove/atoms/ui/audio", () => ({
  playSoundAtom: atom(null, vi.fn()),
}));

vi.mock("@tasktrove/atoms/data/tasks/filters", () => ({
  activeTasksAtom: atom([]),
}));

// Provide base atoms used inside tasks.ts
vi.mock("@tasktrove/atoms/data/base/atoms", () => {
  // Create tasks within the mock factory to avoid circular dependencies
  const mockArchivedTaskId = createTaskId(
    "10000000-0000-4000-8000-000000000001",
  );
  const mockActiveTaskId = createTaskId("20000000-0000-4000-8000-000000000002");
  const mockProjectId = createProjectId("30000000-0000-4000-8000-000000000003");

  const mockArchivedTask: Task = {
    id: mockArchivedTaskId,
    title: "Archived",
    completed: false,
    archived: true,
    priority: 2,
    labels: [],
    subtasks: [],
    comments: [],
    createdAt: new Date(),
    projectId: mockProjectId,
    recurringMode: "dueDate",
  };

  const mockActiveTask: Task = {
    ...mockArchivedTask,
    id: mockActiveTaskId,
    title: "Active",
    archived: false,
  };

  return {
    tasksAtom: atom([mockArchivedTask, mockActiveTask]),
    taskByIdAtom: atom(
      new Map([
        [mockArchivedTaskId, mockArchivedTask],
        [mockActiveTaskId, mockActiveTask],
      ]),
    ),
    projectsAtom: atom([
      {
        id: mockProjectId,
        sections: [{ id: "section-1", items: [] }],
      },
    ]),
    userAtom: atom({ id: "user-1" }),
    settingsAtom: atom({ general: { soundEnabled: true } }),
  };
});

// Import atoms under test after mocks are registered
import { updateTasksAtom, updateTaskAtom } from "../core/tasks";
describe("updateTasksAtom archived guard", () => {
  let store: ReturnType<typeof createStore>;
  let archivedTaskId: TaskId;
  let activeTaskId: TaskId;

  beforeEach(() => {
    archivedTaskId = createTaskId(hoisted.archivedTaskId);
    activeTaskId = createTaskId(hoisted.activeTaskId);

    mutateAsyncMock = vi.fn();
    hoisted.toastMock.info.mockClear();
    hoisted.toastMock.error.mockClear();
    hoisted.toastMock.success.mockClear();
    store = createStore();
  });

  it("blocks updates to archived tasks and shows a toast", async () => {
    await store.set(updateTasksAtom, [{ id: archivedTaskId, title: "Edited" }]);

    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(hoisted.toastMock.info).toHaveBeenCalledWith(
      "Archived tasks must be unarchived before editing.",
    );
  });

  it("allows unarchiving updates to proceed", async () => {
    await store.set(updateTasksAtom, [{ id: archivedTaskId, archived: false }]);

    expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    const [firstCall] = mutateAsyncMock.mock.calls;
    expect(firstCall).toBeDefined();
    expect(firstCall?.[0]).toEqual([{ id: archivedTaskId, archived: false }]);
    expect(hoisted.toastMock.info).not.toHaveBeenCalled();
  });

  it("still runs when called through updateTaskAtom", async () => {
    await store.set(updateTaskAtom, {
      updateRequest: { id: archivedTaskId, title: "Single edit" },
    });

    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(hoisted.toastMock.info).toHaveBeenCalledTimes(1);

    // Ensure active task updates pass through
    mutateAsyncMock.mockClear();
    hoisted.toastMock.info.mockClear();

    await store.set(updateTaskAtom, {
      updateRequest: { id: activeTaskId, title: "Update active" },
    });

    expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    expect(hoisted.toastMock.info).not.toHaveBeenCalled();
  });
});
