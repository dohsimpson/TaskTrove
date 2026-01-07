import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createStore } from "jotai";
import { v4 as uuidv4 } from "uuid";
import { QueryClient } from "@tanstack/react-query";
import { TASKS_QUERY_KEY } from "@tasktrove/constants";
import type { Task } from "@tasktrove/types/core";
import { INBOX_PROJECT_ID } from "@tasktrove/types/constants";
import { createTaskId } from "@tasktrove/types/id";
import { DEFAULT_GLOBAL_VIEW_OPTIONS } from "@tasktrove/types/defaults";
import { queryClientAtom } from "../data/base/query";
import { recentTasksAtom } from "../data/tasks/filters";
import { globalViewOptionsAtom } from "../ui/views";

const mockNow = new Date("2024-01-15T12:00:00.000Z");

describe("recentTasksAtom", () => {
  let store: ReturnType<typeof createStore>;
  let queryClient: QueryClient;

  beforeEach(() => {
    store = createStore();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    store.set(queryClientAtom, queryClient);
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createTestTask = (overrides: Partial<Task>): Task => ({
    id: createTaskId(uuidv4()),
    title: "Test Task",
    description: "",
    completed: false,
    priority: 4,
    projectId: INBOX_PROJECT_ID,
    labels: [],
    subtasks: [],
    comments: [],
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    recurringMode: "dueDate",
    ...overrides,
  });

  const setTasks = (tasks: Task[]) => {
    queryClient.setQueryData(TASKS_QUERY_KEY, tasks);
  };

  it("includes tasks created or completed within the default window", () => {
    const createdRecently = createTestTask({
      title: "Created recently",
      createdAt: new Date("2024-01-10T10:00:00.000Z"),
    });
    const completedRecently = createTestTask({
      title: "Completed recently",
      createdAt: new Date("2023-12-01T10:00:00.000Z"),
      completed: true,
      completedAt: new Date("2024-01-14T08:00:00.000Z"),
    });
    const outsideWindow = createTestTask({
      title: "Outside window",
      createdAt: new Date("2023-12-20T10:00:00.000Z"),
      completed: true,
      completedAt: new Date("2024-01-05T08:00:00.000Z"),
    });

    setTasks([createdRecently, completedRecently, outsideWindow]);

    const recentTasks = store.get(recentTasksAtom);
    const recentTitles = recentTasks.map((task) => task.title);

    expect(recentTitles).toContain("Created recently");
    expect(recentTitles).toContain("Completed recently");
    expect(recentTitles).not.toContain("Outside window");
  });

  it("respects recentViewDays in global view options", () => {
    store.set(globalViewOptionsAtom, {
      ...DEFAULT_GLOBAL_VIEW_OPTIONS,
      recentViewDays: 2,
    });

    const withinTwoDays = createTestTask({
      title: "Within 2 days",
      createdAt: new Date("2024-01-14T09:00:00.000Z"),
    });
    const olderThanTwoDays = createTestTask({
      title: "Older than 2 days",
      createdAt: new Date("2024-01-10T09:00:00.000Z"),
    });

    setTasks([withinTwoDays, olderThanTwoDays]);

    const recentTasks = store.get(recentTasksAtom);
    const recentTitles = recentTasks.map((task) => task.title);

    expect(recentTitles).toContain("Within 2 days");
    expect(recentTitles).not.toContain("Older than 2 days");
  });
});
