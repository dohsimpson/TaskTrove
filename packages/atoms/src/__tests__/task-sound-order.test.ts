import { describe, it, expect, vi, beforeEach } from "vitest";
import { atom, createStore, type Atom } from "jotai";
import type { CreateTaskRequest } from "@tasktrove/types/api-requests";
import type { Task } from "@tasktrove/types/core";
import type { ProjectSection } from "@tasktrove/types/core";
import { createTaskId, createProjectId } from "@tasktrove/types/id";

// Shared event log to assert call order
const events: string[] = [];

// Helpers
const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

// Mocks must be defined before importing the atoms under test
vi.mock("@tasktrove/atoms/utils/atom-helpers", () => ({
  namedAtom: <AtomType extends Atom<unknown>>(
    name: string,
    value: AtomType,
  ) => {
    value.debugLabel = name;
    return value;
  },
  createAtomWithStorage: vi.fn(() => atom(null)),
  handleAtomError: vi.fn(),
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@tasktrove/atoms/core/history", () => ({
  recordOperationAtom: atom(null, (_get, _set, message: string) => {
    events.push(`record:${message}`);
  }),
}));

vi.mock("@tasktrove/atoms/data/tasks/ordering", () => ({
  addTaskToSection: (
    _taskId: string,
    _sectionId: string,
    _index: number | undefined,
    sections: ProjectSection[],
  ) => sections,
  removeTaskFromSection: vi.fn(),
  moveTaskWithinSection: vi.fn(),
  getOrderedTasksForProject: vi.fn(),
  getOrderedTasksForSection: vi.fn(),
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
  updateProjectsMutationAtom: atom({ mutateAsync: vi.fn(async () => ({})) }),
}));

let addTaskDeferred = createDeferred<{ taskIds: string[] }>();
let deleteTaskDeferred = createDeferred<{ taskIds: string[] }>();
let updateTaskDeferred = createDeferred<unknown>();

vi.mock("@tasktrove/atoms/mutations/tasks", () => ({
  createTaskMutationAtom: atom({
    mutateAsync: vi.fn(async () => {
      events.push("mutate:createTask");
      return addTaskDeferred.promise;
    }),
  }),
  deleteTaskMutationAtom: atom({
    mutateAsync: vi.fn(async () => {
      events.push("mutate:deleteTask");
      return deleteTaskDeferred.promise;
    }),
  }),
  updateTasksMutationAtom: atom({
    mutateAsync: vi.fn(async () => {
      events.push("mutate:updateTask");
      return updateTaskDeferred.promise;
    }),
  }),
}));

vi.mock("@tasktrove/atoms/ui/audio", () => ({
  playSoundAtom: atom(null, (_get, _set, payload: { soundType: string }) => {
    events.push(`sound:${payload.soundType}`);
  }),
}));

vi.mock("@tasktrove/atoms/data/base/atoms", () => {
  const baseTask: Task = {
    id: createTaskId("10000000-0000-4000-8000-000000000001"),
    title: "Sample task",
    completed: false,
    priority: 2,
    comments: [],
    subtasks: [],
    projectId: createProjectId("20000000-0000-4000-8000-000000000001"),
    labels: [],
    createdAt: new Date(),
    recurringMode: "dueDate",
  };

  return {
    tasksAtom: atom([baseTask]),
    taskByIdAtom: atom(new Map([[baseTask.id, baseTask]])),
    projectsAtom: atom([
      {
        id: createProjectId("20000000-0000-4000-8000-000000000001"),
        sections: [{ id: "section-1", items: [] }],
      },
    ]),
    userAtom: atom({ id: "user-1" }),
    settingsAtom: atom({ general: { soundEnabled: true } }),
  };
});

vi.mock("@tasktrove/types/defaults", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tasktrove/types/defaults")>();
  return {
    ...actual,
    getDefaultSectionId: () => "section-1",
    DEFAULT_VIEW_STATE: actual.DEFAULT_VIEW_STATE,
  };
});

// Import atoms under test after mocks
import { addTaskAtom, deleteTasksAtom, toggleTaskAtom } from "../core/tasks";

describe("task sound timing", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    events.length = 0;
    store = createStore();
    addTaskDeferred = createDeferred<{ taskIds: string[] }>();
    deleteTaskDeferred = createDeferred<{ taskIds: string[] }>();
    updateTaskDeferred = createDeferred<unknown>();
  });

  it("plays sound before create task mutation is awaited", async () => {
    const taskData: CreateTaskRequest = {
      title: "New",
      projectId: createProjectId("20000000-0000-4000-8000-000000000001"),
    };
    const pendingResult = store.set(addTaskAtom, taskData);

    // Expect sound to fire before mutation starts
    expect(events).toEqual(["sound:confirm", "mutate:createTask"]);

    addTaskDeferred.resolve({ taskIds: ["new-task"] });
    await pendingResult;
  });

  it("plays sound before delete task mutation is awaited", async () => {
    const taskIds = [createTaskId("10000000-0000-4000-8000-000000000001")];
    const pendingResult = store.set(deleteTasksAtom, taskIds);

    expect(events).toEqual(["sound:whoosh", "mutate:deleteTask"]);

    deleteTaskDeferred.resolve({ taskIds: ["task-1"] });
    await pendingResult;
  });

  it("plays sound before update task mutation when completing", async () => {
    const taskId = createTaskId("10000000-0000-4000-8000-000000000001");
    const pendingResult = store.set(toggleTaskAtom, taskId);

    expect(events).toEqual(["sound:bellClear", "mutate:updateTask"]);

    updateTaskDeferred.resolve({});
    await pendingResult;
  });
});
