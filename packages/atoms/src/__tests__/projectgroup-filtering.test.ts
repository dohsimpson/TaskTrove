/**
 * ProjectGroup Filtering Test Suite
 *
 * Tests that task lists properly update when switching between projectgroup routes
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createStore } from "jotai";
import { QueryClient } from "@tanstack/react-query";
import { filteredTasksAtom } from "../ui/filtered-tasks";
import { queryClientAtom } from "../data/base/query";
import { setPathnameAtom } from "../ui/navigation";
import type { Task } from "@tasktrove/types/core";
import type { ProjectGroup } from "@tasktrove/types/group";
import {
  createTaskId,
  createProjectId,
  createGroupId,
} from "@tasktrove/types/id";
import { TASKS_QUERY_KEY, GROUPS_QUERY_KEY } from "@tasktrove/constants";

// Mock fetch globally
global.fetch = vi.fn();

let store: ReturnType<typeof createStore>;
let queryClient: QueryClient;

// Test projects (using valid v4 UUIDs)
const PROJECT_PERSONAL_1 = createProjectId(
  "11111111-1111-4111-8111-111111111111",
);
const PROJECT_PERSONAL_2 = createProjectId(
  "22222222-2222-4222-8222-222222222222",
);
const PROJECT_WORK_1 = createProjectId("33333333-3333-4333-8333-333333333333");
const PROJECT_WORK_2 = createProjectId("44444444-4444-4444-8444-444444444444");

// Test groups (using valid v4 UUIDs)
const GROUP_PERSONAL = createGroupId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
const GROUP_WORK = createGroupId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");

// Test tasks - 2 in each project
const tasks: Task[] = [
  {
    id: createTaskId("12345678-1234-4234-8234-111111111111"),
    title: "Personal Task 1",
    completed: false,
    priority: 2,
    projectId: PROJECT_PERSONAL_1,
    labels: [],
    subtasks: [],
    comments: [],
    createdAt: new Date("2024-01-01T10:00:00Z"),
    recurringMode: "dueDate",
  },
  {
    id: createTaskId("12345678-1234-4234-8234-222222222222"),
    title: "Personal Task 2",
    completed: false,
    priority: 1,
    projectId: PROJECT_PERSONAL_2,
    labels: [],
    subtasks: [],
    comments: [],
    createdAt: new Date("2024-01-01T11:00:00Z"),
    recurringMode: "dueDate",
  },
  {
    id: createTaskId("12345678-1234-4234-8234-333333333333"),
    title: "Work Task 1",
    completed: false,
    priority: 3,
    projectId: PROJECT_WORK_1,
    labels: [],
    subtasks: [],
    comments: [],
    createdAt: new Date("2024-01-01T12:00:00Z"),
    recurringMode: "dueDate",
  },
  {
    id: createTaskId("12345678-1234-4234-8234-444444444444"),
    title: "Work Task 2",
    completed: false,
    priority: 2,
    projectId: PROJECT_WORK_2,
    labels: [],
    subtasks: [],
    comments: [],
    createdAt: new Date("2024-01-01T13:00:00Z"),
    recurringMode: "dueDate",
  },
];

// Test project groups - structured as tree with root group
const ROOT_GROUP_ID = createGroupId("cccccccc-cccc-4ccc-8ccc-cccccccccccc");

const personalGroup: ProjectGroup = {
  type: "project" as const,
  id: GROUP_PERSONAL,
  name: "Personal",
  slug: "personal",
  color: "#4CAF50",
  items: [PROJECT_PERSONAL_1, PROJECT_PERSONAL_2],
};

const workGroup: ProjectGroup = {
  type: "project" as const,
  id: GROUP_WORK,
  name: "Work",
  slug: "work",
  color: "#2196F3",
  items: [PROJECT_WORK_1, PROJECT_WORK_2],
};

// Root group containing both groups
const rootProjectGroup: ProjectGroup = {
  type: "project" as const,
  id: ROOT_GROUP_ID,
  name: "All Projects",
  slug: "all-projects",
  items: [personalGroup, workGroup],
};

beforeEach(() => {
  store = createStore();
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  store.set(queryClientAtom, queryClient);

  // Setup initial data
  queryClient.setQueryData(TASKS_QUERY_KEY, tasks);
  queryClient.setQueryData(GROUPS_QUERY_KEY, {
    projectGroups: rootProjectGroup,
    labelGroups: {
      type: "label" as const,
      id: createGroupId("dddddddd-dddd-4ddd-8ddd-dddddddddddd"),
      name: "All Labels",
      slug: "all-labels",
      items: [],
    },
  });

  // Mock environment
  vi.stubEnv("NODE_ENV", "development");
  Object.defineProperty(global, "window", {
    value: {},
    writable: true,
  });

  vi.clearAllMocks();
});

describe("ProjectGroup Filtering", () => {
  describe("Bug Fix: Switching between projectgroups", () => {
    it("should update task list when switching from personal to work projectgroup", () => {
      // Navigate to personal projectgroup
      store.set(setPathnameAtom, "/projectgroups/personal");

      // Should show only personal tasks
      const personalTasks = store.get(filteredTasksAtom);
      expect(personalTasks).toHaveLength(2);
      expect(personalTasks.map((t) => t.title)).toEqual([
        "Personal Task 1",
        "Personal Task 2",
      ]);

      // Navigate to work projectgroup
      store.set(setPathnameAtom, "/projectgroups/work");

      // Should now show only work tasks (THIS IS THE BUG - it shows personal tasks)
      const workTasks = store.get(filteredTasksAtom);
      expect(workTasks).toHaveLength(2);
      expect(workTasks.map((t) => t.title)).toEqual([
        "Work Task 1",
        "Work Task 2",
      ]);
    });

    it("should update task list when switching from work to personal projectgroup", () => {
      // Navigate to work projectgroup first
      store.set(setPathnameAtom, "/projectgroups/work");

      const workTasks = store.get(filteredTasksAtom);
      expect(workTasks).toHaveLength(2);
      expect(workTasks.map((t) => t.title)).toEqual([
        "Work Task 1",
        "Work Task 2",
      ]);

      // Navigate to personal projectgroup
      store.set(setPathnameAtom, "/projectgroups/personal");

      const personalTasks = store.get(filteredTasksAtom);
      expect(personalTasks).toHaveLength(2);
      expect(personalTasks.map((t) => t.title)).toEqual([
        "Personal Task 1",
        "Personal Task 2",
      ]);
    });

    it("should handle multiple switches correctly", () => {
      // Start with personal
      store.set(setPathnameAtom, "/projectgroups/personal");
      expect(store.get(filteredTasksAtom)).toHaveLength(2);

      // Switch to work
      store.set(setPathnameAtom, "/projectgroups/work");
      expect(store.get(filteredTasksAtom)).toHaveLength(2);

      // Back to personal
      store.set(setPathnameAtom, "/projectgroups/personal");
      expect(store.get(filteredTasksAtom)).toHaveLength(2);

      // Back to work
      store.set(setPathnameAtom, "/projectgroups/work");
      const finalTasks = store.get(filteredTasksAtom);
      expect(finalTasks).toHaveLength(2);
      expect(finalTasks.map((t) => t.title)).toEqual([
        "Work Task 1",
        "Work Task 2",
      ]);
    });
  });
});
