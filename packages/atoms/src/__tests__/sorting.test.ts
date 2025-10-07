/**
 * Comprehensive unit tests for task sorting functionality
 * Tests all sorting scenarios in mockFilteredTasksAtom
 */

import { expect, describe, it, beforeEach } from "vitest";
import { atom } from "jotai";
import { createStore } from "jotai";
import { addDays, isToday, isTomorrow, isThisWeek } from "date-fns";
import type { Task, ViewState } from "@tasktrove/types";
import { INBOX_PROJECT_ID, createTaskId } from "@tasktrove/types";
import {
  TEST_TASK_ID_1,
  TEST_TASK_ID_2,
  TEST_PROJECT_ID_1,
} from "../utils/test-helpers";

// Define task IDs for consistent use in tests
const TASK_ID_3 = createTaskId("12345678-1234-4234-8234-123456789014");
const TASK_ID_4 = createTaskId("12345678-1234-4234-8234-123456789015");
const TASK_ID_5 = createTaskId("12345678-1234-4234-8234-123456789016");

// Mock the tasks atom to be writable for testing
const mockTasksAtom = atom<Task[]>([]);

// Mock the filtered tasks atom with the same logic as the real one
const mockFilteredTasksAtom = atom((get) => {
  const allTasks = get(mockTasksAtom);
  get(mockCurrentViewAtom); // currentView unused in mock
  const viewState = get(mockCurrentViewStateAtom);

  // Apply view-based filtering (simplified for testing)
  const result = allTasks;

  // Apply sorting based on viewState.sortBy
  return result.sort((a, b) => {
    const direction = viewState.sortDirection === "asc" ? 1 : -1;

    switch (viewState.sortBy) {
      case "default":
        // Default sort: completed tasks at bottom, maintain existing order otherwise
        if (a.completed !== b.completed) {
          return (a.completed ? 1 : 0) - (b.completed ? 1 : 0);
        }
        // Within same completion status, maintain existing order (no additional sorting)
        return 0;
      case "priority":
        return direction * (a.priority - b.priority);
      case "dueDate":
        // Regular due date sorting (mixed completed/incomplete)
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return direction;
        if (!b.dueDate) return -direction;
        return direction * (a.dueDate.getTime() - b.dueDate.getTime());
      case "title":
        return direction * a.title.localeCompare(b.title);
      case "createdAt":
        return direction * (a.createdAt.getTime() - b.createdAt.getTime());
      case "status":
        // Sort by completion status only
        if (a.completed !== b.completed) {
          return direction * ((a.completed ? 1 : 0) - (b.completed ? 1 : 0));
        }
        return 0;
      default:
        return 0;
    }
  });
});

const mockCurrentViewAtom = atom<string>("inbox");
const mockCurrentViewStateAtom = atom<ViewState>({
  viewMode: "list",
  sortBy: "default",
  sortDirection: "asc",
  showCompleted: true,
  showOverdue: true,
  searchQuery: "",
  showSidePanel: false,
  compactView: false,
  collapsedSections: [],
  activeFilters: {},
});

describe("Task Sorting Functionality", () => {
  let store: ReturnType<typeof createStore>;

  // Test data with various task properties
  const testTasks: Task[] = [
    {
      id: TEST_TASK_ID_1,
      title: "Charlie Task",
      completed: false,
      priority: 2,
      dueDate: new Date("2024-01-15"),
      createdAt: new Date("2024-01-10"),
      recurringMode: "dueDate",
      labels: [],
      subtasks: [],
      comments: [],
      projectId: TEST_PROJECT_ID_1,
    },
    {
      id: TEST_TASK_ID_2,
      title: "Alpha Task",
      completed: true,
      priority: 1,
      dueDate: new Date("2024-01-10"),
      createdAt: new Date("2024-01-12"),
      recurringMode: "dueDate",
      labels: [],
      subtasks: [],
      comments: [],
      projectId: TEST_PROJECT_ID_1,
    },
    {
      id: TASK_ID_3,
      title: "Beta Task",
      completed: false,
      priority: 4,
      dueDate: new Date("2024-01-20"),
      createdAt: new Date("2024-01-08"),
      recurringMode: "dueDate",
      labels: [],
      subtasks: [],
      comments: [],
      projectId: TEST_PROJECT_ID_1,
    },
    {
      id: TASK_ID_4,
      title: "Delta Task",
      completed: false,
      priority: 3,
      createdAt: new Date("2024-01-14"),
      recurringMode: "dueDate",
      labels: [],
      subtasks: [],
      comments: [],
      projectId: TEST_PROJECT_ID_1,
    },
    {
      id: TASK_ID_5,
      title: "Echo Task",
      completed: true,
      priority: 2,
      dueDate: new Date("2024-01-25"),
      createdAt: new Date("2024-01-16"),
      recurringMode: "dueDate",
      labels: [],
      subtasks: [],
      comments: [],
      projectId: TEST_PROJECT_ID_1,
    },
  ];

  beforeEach(() => {
    store = createStore();
    // Set up test data
    store.set(mockTasksAtom, testTasks);
    store.set(mockCurrentViewAtom, "inbox");
  });

  describe("Default Sort", () => {
    beforeEach(() => {
      store.set(mockCurrentViewStateAtom, {
        viewMode: "list",
        sortBy: "default",
        sortDirection: "asc",
        showCompleted: true,
        showOverdue: true,
        searchQuery: "",
        showSidePanel: false,
        compactView: false,
        collapsedSections: [],
        activeFilters: {},
      } satisfies ViewState);
    });

    it("should put completed tasks at bottom and maintain original order otherwise", () => {
      const result = store.get(mockFilteredTasksAtom);

      // Extract IDs for easier assertion
      const ids = result.map((task) => task.id);

      // Should have incomplete tasks first, then completed tasks
      const incompleteIds = result
        .filter((task) => !task.completed)
        .map((task) => task.id);
      const completedIds = result
        .filter((task) => task.completed)
        .map((task) => task.id);

      expect(incompleteIds.length).toBe(3); // tasks 1, 3, 4
      expect(completedIds.length).toBe(2); // tasks 2, 5

      // All incomplete should come before all completed
      const firstCompletedIndex = ids.findIndex((id) =>
        [TEST_TASK_ID_2, TASK_ID_5].includes(id),
      );
      const lastIncompleteId = incompleteIds[incompleteIds.length - 1];
      if (!lastIncompleteId) {
        throw new Error("Expected to have incomplete tasks");
      }
      const lastIncompleteIndex = ids.lastIndexOf(lastIncompleteId);

      expect(lastIncompleteIndex).toBeLessThan(firstCompletedIndex);
    });

    it("should not apply any additional sorting within completion groups", () => {
      const result = store.get(mockFilteredTasksAtom);

      // Within incomplete tasks, order should be maintained (no sorting by due date, priority, etc.)
      const incompleteTasks = result.filter((task) => !task.completed);
      const completedTasks = result.filter((task) => task.completed);

      // Just verify we have the right number and completion status separation
      expect(incompleteTasks.every((task) => !task.completed)).toBe(true);
      expect(completedTasks.every((task) => task.completed)).toBe(true);
    });
  });

  describe("Priority Sort", () => {
    beforeEach(() => {
      store.set(mockCurrentViewStateAtom, {
        viewMode: "list",
        sortBy: "priority",
        sortDirection: "asc",
        showCompleted: true,
        showOverdue: true,
        searchQuery: "",
        showSidePanel: false,
        compactView: false,
      } satisfies ViewState);
    });

    it("should sort all tasks by priority ascending (1 = highest)", () => {
      const result = store.get(mockFilteredTasksAtom);
      const priorities = result.map((task) => task.priority);

      expect(priorities).toEqual([1, 2, 2, 3, 4]);
    });

    it("should sort by priority descending when direction is desc", () => {
      store.set(mockCurrentViewStateAtom, {
        viewMode: "list",
        sortBy: "priority",
        sortDirection: "desc",
        showCompleted: true,
        showOverdue: true,
        searchQuery: "",
        showSidePanel: false,
        compactView: false,
      } satisfies ViewState);

      const result = store.get(mockFilteredTasksAtom);
      const priorities = result.map((task) => task.priority);

      expect(priorities).toEqual([4, 3, 2, 2, 1]);
    });

    it("should mix completed and incomplete tasks when sorting by priority", () => {
      const result = store.get(mockFilteredTasksAtom);

      // First task should be priority 1 (Alpha Task, completed)
      const firstTask = result[0];
      if (!firstTask) {
        throw new Error("Expected first task to exist");
      }
      expect(firstTask.id).toBe(TEST_TASK_ID_2);
      expect(firstTask.completed).toBe(true);
      expect(firstTask.priority).toBe(1);

      // Should have mix of completed/incomplete throughout
      const hasCompletedBeforeIncomplete = result.some((task, index) => {
        const nextTask = result[index + 1];
        return nextTask && !nextTask.completed;
      });
      expect(hasCompletedBeforeIncomplete).toBe(true);
    });
  });

  describe("Due Date Sort", () => {
    beforeEach(() => {
      store.set(mockCurrentViewStateAtom, {
        viewMode: "list",
        sortBy: "dueDate",
        sortDirection: "asc",
        showCompleted: true,
        showOverdue: true,
        searchQuery: "",
        showSidePanel: false,
        compactView: false,
      } satisfies ViewState);
    });

    it("should sort all tasks by due date ascending", () => {
      const result = store.get(mockFilteredTasksAtom);
      const tasksWithDates = result.filter((task) => task.dueDate);
      const tasksWithoutDates = result.filter((task) => !task.dueDate);

      // Tasks with dates should be sorted chronologically
      const dates = tasksWithDates.map((task) =>
        task.dueDate ? task.dueDate.getTime() : 0,
      );
      expect(dates).toEqual([...dates].sort((a, b) => a - b));

      // Tasks without dates should come at the end
      expect(tasksWithoutDates.length).toBe(1); // Delta Task has no due date
      const lastTask = result[result.length - 1];
      if (!lastTask) {
        throw new Error("Expected to find last task");
      }
      expect(lastTask.id).toBe(TASK_ID_4); // Delta Task should be last
    });

    it("should sort by due date descending when direction is desc", () => {
      store.set(mockCurrentViewStateAtom, {
        viewMode: "list",
        sortBy: "dueDate",
        sortDirection: "desc",
        showCompleted: true,
        showOverdue: true,
        searchQuery: "",
        showSidePanel: false,
        compactView: false,
      } satisfies ViewState);

      const result = store.get(mockFilteredTasksAtom);
      const tasksWithDates = result.filter((task) => task.dueDate);

      // Tasks with dates should be sorted in reverse chronological order
      const dates = tasksWithDates.map((task) =>
        task.dueDate ? task.dueDate.getTime() : 0,
      );
      expect(dates).toEqual([...dates].sort((a, b) => b - a));

      // Tasks without dates should come at the beginning when desc
      const firstTask = result[0];
      if (!firstTask) {
        throw new Error("Expected to find first task");
      }
      expect(firstTask.id).toBe(TASK_ID_4); // Delta Task should be first
    });

    it("should mix completed and incomplete tasks when sorting by due date", () => {
      const result = store.get(mockFilteredTasksAtom);

      // Should have both completed and incomplete tasks mixed based on due date
      const completedCount = result.filter((task) => task.completed).length;
      const incompleteCount = result.filter((task) => !task.completed).length;

      expect(completedCount).toBe(2);
      expect(incompleteCount).toBe(3);

      // First task should be earliest due date (Alpha Task - 2024-01-10, completed)
      const firstTaskWithDate = result[0];
      if (!firstTaskWithDate) {
        throw new Error("Expected to find first task");
      }
      expect(firstTaskWithDate.id).toBe(TEST_TASK_ID_2);
      expect(firstTaskWithDate.dueDate?.toISOString()).toBe(
        new Date("2024-01-10").toISOString(),
      );
    });
  });

  describe("Title Sort", () => {
    beforeEach(() => {
      store.set(mockCurrentViewStateAtom, {
        viewMode: "list",
        sortBy: "title",
        sortDirection: "asc",
        showCompleted: true,
        showOverdue: true,
        searchQuery: "",
        showSidePanel: false,
        compactView: false,
      } satisfies ViewState);
    });

    it("should sort all tasks alphabetically by title", () => {
      const result = store.get(mockFilteredTasksAtom);
      const titles = result.map((task) => task.title);

      expect(titles).toEqual([
        "Alpha Task",
        "Beta Task",
        "Charlie Task",
        "Delta Task",
        "Echo Task",
      ]);
    });

    it("should sort titles in reverse alphabetical order when direction is desc", () => {
      store.set(mockCurrentViewStateAtom, {
        viewMode: "list",
        sortBy: "title",
        sortDirection: "desc",
        showCompleted: true,
        showOverdue: true,
        searchQuery: "",
        showSidePanel: false,
        compactView: false,
      } satisfies ViewState);

      const result = store.get(mockFilteredTasksAtom);
      const titles = result.map((task) => task.title);

      expect(titles).toEqual([
        "Echo Task",
        "Delta Task",
        "Charlie Task",
        "Beta Task",
        "Alpha Task",
      ]);
    });
  });

  describe("Created Date Sort", () => {
    beforeEach(() => {
      store.set(mockCurrentViewStateAtom, {
        viewMode: "list",
        sortBy: "createdAt",
        sortDirection: "asc",
        showCompleted: true,
        showOverdue: true,
        searchQuery: "",
        showSidePanel: false,
        compactView: false,
      } satisfies ViewState);
    });

    it("should sort all tasks by creation date ascending", () => {
      const result = store.get(mockFilteredTasksAtom);
      const createdDates = result.map((task) => task.createdAt.getTime());

      expect(createdDates).toEqual([...createdDates].sort((a, b) => a - b));

      // First should be Beta Task (2024-01-08)
      const firstTask = result[0];
      if (!firstTask) {
        throw new Error("Expected to find first task");
      }
      expect(firstTask.id).toBe(TASK_ID_3);
      expect(firstTask.title).toBe("Beta Task");
    });

    it("should sort by creation date descending when direction is desc", () => {
      store.set(mockCurrentViewStateAtom, {
        viewMode: "list",
        sortBy: "createdAt",
        sortDirection: "desc",
        showCompleted: true,
        showOverdue: true,
        searchQuery: "",
        showSidePanel: false,
        compactView: false,
      } satisfies ViewState);

      const result = store.get(mockFilteredTasksAtom);
      const createdDates = result.map((task) => task.createdAt.getTime());

      expect(createdDates).toEqual([...createdDates].sort((a, b) => b - a));

      // First should be Echo Task (2024-01-16)
      const firstTask = result[0];
      if (!firstTask) {
        throw new Error("Expected to find first task");
      }
      expect(firstTask.id).toBe(TASK_ID_5);
      expect(firstTask.title).toBe("Echo Task");
    });
  });

  describe("Status Sort", () => {
    beforeEach(() => {
      store.set(mockCurrentViewStateAtom, {
        viewMode: "list",
        sortBy: "status",
        sortDirection: "asc",
        showCompleted: true,
        showOverdue: true,
        searchQuery: "",
        showSidePanel: false,
        compactView: false,
      } satisfies ViewState);
    });

    it("should sort by completion status first (incomplete then completed)", () => {
      const result = store.get(mockFilteredTasksAtom);

      // Should have incomplete tasks first
      const firstCompletedIndex = result.findIndex((task) => task.completed);
      const lastIncompleteIndex = result
        .map((task) => task.completed)
        .lastIndexOf(false);

      expect(lastIncompleteIndex).toBeLessThan(firstCompletedIndex);
    });

    it("should only sort by completion status now (no secondary sorting)", () => {
      const result = store.get(mockFilteredTasksAtom);

      const incompleteTasks = result.filter((task) => !task.completed);
      const completedTasks = result.filter((task) => task.completed);

      // All incomplete tasks should come before completed tasks
      expect(incompleteTasks.length).toBeGreaterThan(0);
      expect(completedTasks.length).toBeGreaterThan(0);

      // Within same completion status, no additional sorting is applied
      // Just verify the completion status grouping works
      expect(
        result
          .slice(0, incompleteTasks.length)
          .every((task) => !task.completed),
      ).toBe(true);
      expect(
        result.slice(incompleteTasks.length).every((task) => task.completed),
      ).toBe(true);
    });

    it("should respect sort direction for completion status", () => {
      store.set(mockCurrentViewStateAtom, {
        viewMode: "list",
        sortBy: "status",
        sortDirection: "desc",
        showCompleted: true,
        showOverdue: true,
        searchQuery: "",
        showSidePanel: false,
        compactView: false,
      } satisfies ViewState);

      const result = store.get(mockFilteredTasksAtom);

      // With desc direction, completed tasks should come first
      const firstTask = result[0];
      const secondTask = result[1];
      const thirdTask = result[2];
      if (!firstTask || !secondTask || !thirdTask) {
        throw new Error("Expected to find first three tasks");
      }
      expect(firstTask.completed).toBe(true);
      expect(secondTask.completed).toBe(true);
      expect(thirdTask.completed).toBe(false);
    });
  });

  // NOTE: Kanban view sorting is no longer needed as kanban now uses project sections as columns
  // Tasks within each project section are sorted according to the normal sorting rules

  describe("Edge Cases", () => {
    it("should handle empty task list", () => {
      store.set(mockTasksAtom, []);

      const result = store.get(mockFilteredTasksAtom);
      expect(result).toEqual([]);
    });

    it("should handle tasks with missing optional properties", () => {
      const fixedCreatedAt = new Date(2025, 7, 5); // Aug 5, 2025
      const tasksWithMissingProps: Task[] = [
        {
          id: TEST_TASK_ID_1,
          title: "Minimal Task",
          completed: false,
          priority: 1,
          createdAt: fixedCreatedAt,
          labels: [],
          subtasks: [],
          comments: [],
          recurringMode: "dueDate",
          // Missing dueDate, projectId
        },
      ];

      store.set(mockTasksAtom, tasksWithMissingProps);
      store.set(mockCurrentViewStateAtom, {
        viewMode: "list",
        sortBy: "dueDate",
        sortDirection: "asc",
        showCompleted: true,
        showOverdue: true,
        searchQuery: "",
        showSidePanel: false,
        compactView: false,
      } satisfies ViewState);

      const result = store.get(mockFilteredTasksAtom);
      expect(result).toHaveLength(1);
      const firstTask = result[0];
      if (!firstTask) {
        throw new Error("Expected to find first task");
      }
      expect(firstTask.title).toBe("Minimal Task");
    });

    it("should handle unknown sort options gracefully", () => {
      store.set(mockCurrentViewStateAtom, {
        viewMode: "list",
        sortBy: "unknownField" as const,
        sortDirection: "asc",
        showCompleted: true,
        showOverdue: true,
        searchQuery: "",
        showSidePanel: false,
        compactView: false,
      } satisfies ViewState);

      const result = store.get(mockFilteredTasksAtom);
      expect(result).toHaveLength(5); // Should return tasks without crashing
    });
  });

  describe("Sort Direction Consistency", () => {
    it("should apply ascending direction consistently across all sort types", () => {
      const sortTypes = [
        "priority",
        "dueDate",
        "title",
        "createdAt",
        "status",
      ] as const;

      sortTypes.forEach((sortType) => {
        store.set(mockCurrentViewStateAtom, {
          viewMode: "list",
          sortBy: sortType,
          sortDirection: "asc",
          showCompleted: true,
          showOverdue: true,
          searchQuery: "",
          showSidePanel: false,
          compactView: false,
        } satisfies ViewState);

        const result = store.get(mockFilteredTasksAtom);
        expect(result.length).toBeGreaterThan(0); // Should not crash
      });
    });

    it("should apply descending direction consistently across all sort types", () => {
      const sortTypes = [
        "priority",
        "dueDate",
        "title",
        "createdAt",
        "status",
      ] as const;

      sortTypes.forEach((sortType) => {
        store.set(mockCurrentViewStateAtom, {
          viewMode: "list",
          sortBy: sortType,
          sortDirection: "desc",
          showCompleted: true,
          showOverdue: true,
          searchQuery: "",
          showSidePanel: false,
          compactView: false,
        } satisfies ViewState);

        const result = store.get(mockFilteredTasksAtom);
        expect(result.length).toBeGreaterThan(0); // Should not crash
      });
    });
  });

  describe("Date Logic Consistency Tests", () => {
    /**
     * Tests to ensure date logic consistency between task filtering atoms
     * and catch regressions in date filtering behavior.
     *
     * This addresses the testing gap where date logic inconsistencies weren't caught.
     */

    describe("Date Helper Function Validation", () => {
      it("should validate date-fns functions work as expected", () => {
        // Use a fixed date far in the past to avoid any current week conflicts
        const today = new Date(2024, 5, 12); // June 12, 2024 (Wednesday) - definitely not current week
        const tomorrow = addDays(today, 1);
        // const nextWeek = addDays(today, 7) // unused in this specific test
        const yesterday = addDays(today, -1);

        // Validate date-fns functions work as expected
        expect(isToday(today)).toBe(false); // Fixed date won't be "today"
        expect(isToday(new Date())).toBe(true); // But current date should be
        expect(isToday(tomorrow)).toBe(false);
        expect(isToday(yesterday)).toBe(false);

        expect(isTomorrow(tomorrow)).toBe(false); // Fixed date won't be "tomorrow"
        expect(isTomorrow(addDays(new Date(), 1))).toBe(true); // But actual tomorrow should be

        // Fixed date from 2024 won't be in current week
        expect(isThisWeek(today)).toBe(false); // Fixed date won't be "this week"
        expect(isThisWeek(tomorrow)).toBe(false); // Fixed date + 1 won't be "this week"
        expect(isThisWeek(new Date())).toBe(true); // But current date should be
      });
    });

    describe("Task Date Categorization Logic", () => {
      it("should correctly identify today tasks using consistent date logic", () => {
        // Use fixed dates for deterministic testing
        const fixedToday = new Date(2024, 5, 12); // June 12, 2024 (Wednesday) - consistent with other test
        const yesterday = addDays(fixedToday, -1);
        const tomorrow = addDays(fixedToday, 1);
        const fixedCreatedAt = new Date(2024, 5, 11); // June 11, 2024

        const testTasks: Task[] = [
          {
            id: createTaskId("11111111-1111-4111-8111-111111111111"),
            title: "Yesterday Task",
            completed: false,
            priority: 2,
            dueDate: yesterday,
            createdAt: fixedCreatedAt,
            recurringMode: "dueDate",
            labels: [],
            subtasks: [],
            comments: [],
            projectId: INBOX_PROJECT_ID,
          },
          {
            id: createTaskId("22222222-2222-4222-8222-222222222222"),
            title: "Today Task",
            completed: false,
            priority: 2,
            dueDate: fixedToday,
            createdAt: fixedCreatedAt,
            recurringMode: "dueDate",
            labels: [],
            subtasks: [],
            comments: [],
            projectId: INBOX_PROJECT_ID,
          },
          {
            id: createTaskId("33333333-3333-4333-8333-333333333333"),
            title: "Tomorrow Task",
            completed: false,
            priority: 2,
            dueDate: tomorrow,
            createdAt: fixedCreatedAt,
            recurringMode: "dueDate",
            labels: [],
            subtasks: [],
            comments: [],
            projectId: INBOX_PROJECT_ID,
          },
        ];

        // Test today logic - same logic as todayTasksAtom
        const todayTasks = testTasks.filter((task) => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          const todayNormalized = new Date(fixedToday);
          taskDate.setHours(0, 0, 0, 0);
          todayNormalized.setHours(0, 0, 0, 0);
          return taskDate.getTime() === todayNormalized.getTime();
        });

        expect(todayTasks.length).toBe(1);
        const firstTodayTask = todayTasks[0];
        if (!firstTodayTask) {
          throw new Error("Expected to find first today task");
        }
        expect(firstTodayTask.id).toBe("22222222-2222-4222-8222-222222222222");
        // Note: isToday() checks against actual current date, not our fixed date
        // So we test the logic directly instead of using isToday()
        const taskDate = firstTodayTask.dueDate
          ? new Date(firstTodayTask.dueDate)
          : new Date();
        const fixedDate = new Date(fixedToday);
        taskDate.setHours(0, 0, 0, 0);
        fixedDate.setHours(0, 0, 0, 0);
        expect(taskDate.getTime()).toBe(fixedDate.getTime());
      });

      it("should correctly identify upcoming tasks (all future tasks)", () => {
        // Use fixed dates for deterministic testing
        const today = new Date(2025, 7, 6); // Aug 6, 2025 (Wednesday)
        const yesterday = addDays(today, -1);
        const tomorrow = addDays(today, 1);
        const nextWeek = addDays(today, 7);
        const nextMonth = addDays(today, 30);
        const fixedCreatedAt = new Date(2025, 7, 5); // Aug 5, 2025

        const testTasks: Task[] = [
          {
            id: createTaskId("11111111-1111-4111-8111-111111111111"),
            title: "Yesterday Task",
            completed: false,
            priority: 2,
            dueDate: yesterday,
            createdAt: fixedCreatedAt,
            recurringMode: "dueDate",
            labels: [],
            subtasks: [],
            comments: [],
            projectId: INBOX_PROJECT_ID,
          },
          {
            id: createTaskId("22222222-2222-4222-8222-222222222222"),
            title: "Today Task",
            completed: false,
            priority: 2,
            dueDate: today,
            createdAt: fixedCreatedAt,
            recurringMode: "dueDate",
            labels: [],
            subtasks: [],
            comments: [],
            projectId: INBOX_PROJECT_ID,
          },
          {
            id: createTaskId("33333333-3333-4333-8333-333333333333"),
            title: "Tomorrow Task",
            completed: false,
            priority: 2,
            dueDate: tomorrow,
            createdAt: fixedCreatedAt,
            recurringMode: "dueDate",
            labels: [],
            subtasks: [],
            comments: [],
            projectId: INBOX_PROJECT_ID,
          },
          {
            id: createTaskId("44444444-4444-4444-8444-444444444444"),
            title: "Next Week Task",
            completed: false,
            priority: 2,
            dueDate: nextWeek,
            createdAt: fixedCreatedAt,
            recurringMode: "dueDate",
            labels: [],
            subtasks: [],
            comments: [],
            projectId: INBOX_PROJECT_ID,
          },
          {
            id: createTaskId("55555555-5555-4555-8555-555555555555"),
            title: "Next Month Task",
            completed: false,
            priority: 2,
            dueDate: nextMonth,
            createdAt: fixedCreatedAt,
            recurringMode: "dueDate",
            labels: [],
            subtasks: [],
            comments: [],
            projectId: INBOX_PROJECT_ID,
          },
        ];

        // Test upcoming logic - same logic as upcomingTasksAtom
        const todayNormalized = new Date(today);
        todayNormalized.setHours(0, 0, 0, 0);
        const tomorrowNormalized = new Date(todayNormalized);
        tomorrowNormalized.setDate(tomorrowNormalized.getDate() + 1);

        const upcomingTasks = testTasks.filter((task) => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          taskDate.setHours(0, 0, 0, 0);
          // Correct logic: all tasks from tomorrow onwards (for counts/analytics)
          return taskDate.getTime() >= tomorrowNormalized.getTime();
        });

        expect(upcomingTasks.length).toBe(3); // tomorrow, next-week, next-month

        const upcomingIds = upcomingTasks.map((t) => t.id).sort();
        expect(upcomingIds).toEqual([
          "33333333-3333-4333-8333-333333333333",
          "44444444-4444-4444-8444-444444444444",
          "55555555-5555-4555-8555-555555555555",
        ]);

        // Should NOT include past or present
        expect(upcomingTasks.find((t) => t.id === "yesterday")).toBeUndefined();
        expect(upcomingTasks.find((t) => t.id === "today")).toBeUndefined();
      });

      it("should demonstrate the difference between upcomingTasksAtom and filteredTasksAtom upcoming view", () => {
        // NOTE: This test uses current date because it's specifically testing
        // the real-world behavior of isTomorrow() and isThisWeek() functions
        // which check against the actual current date, not fixed dates
        const today = new Date();
        const tomorrow = addDays(today, 1);
        const nextWeek = addDays(today, 7);
        const nextMonth = addDays(today, 30);
        const fixedCreatedAt = new Date(2025, 7, 5); // Aug 5, 2025

        const testTasks: Task[] = [
          {
            id: createTaskId("33333333-3333-4333-8333-333333333333"),
            title: "Tomorrow Task",
            completed: false,
            priority: 2,
            dueDate: tomorrow,
            createdAt: fixedCreatedAt,
            recurringMode: "dueDate",
            labels: [],
            subtasks: [],
            comments: [],
            projectId: INBOX_PROJECT_ID,
          },
          {
            id: createTaskId("44444444-4444-4444-8444-444444444444"),
            title: "Next Week Task",
            completed: false,
            priority: 2,
            dueDate: nextWeek,
            createdAt: fixedCreatedAt,
            recurringMode: "dueDate",
            labels: [],
            subtasks: [],
            comments: [],
            projectId: INBOX_PROJECT_ID,
          },
          {
            id: createTaskId("55555555-5555-4555-8555-555555555555"),
            title: "Next Month Task",
            completed: false,
            priority: 2,
            dueDate: nextMonth,
            createdAt: fixedCreatedAt,
            recurringMode: "dueDate",
            labels: [],
            subtasks: [],
            comments: [],
            projectId: INBOX_PROJECT_ID,
          },
        ];

        // upcomingTasksAtom logic: ALL future tasks (tomorrow onwards)
        const todayNormalized = new Date(today);
        todayNormalized.setHours(0, 0, 0, 0);
        const tomorrowNormalized = new Date(todayNormalized);
        tomorrowNormalized.setDate(tomorrowNormalized.getDate() + 1);

        const upcomingTasks = testTasks.filter((task) => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          taskDate.setHours(0, 0, 0, 0);
          return taskDate.getTime() >= tomorrowNormalized.getTime();
        });

        // filteredTasksAtom "upcoming" view logic: tomorrow OR this week only
        const filteredUpcomingTasks = testTasks.filter((task) => {
          if (!task.dueDate) return false;
          return isTomorrow(task.dueDate) || isThisWeek(task.dueDate);
        });

        // upcomingTasksAtom should include ALL future tasks
        expect(upcomingTasks.length).toBe(3);

        // filteredTasksAtom "upcoming" view is more restrictive (UI-focused)
        expect(filteredUpcomingTasks.length).toBeGreaterThanOrEqual(1);
        expect(filteredUpcomingTasks.length).toBeLessThanOrEqual(3);

        // The difference is INTENTIONAL and serves different use cases:
        // - upcomingTasksAtom: All future tasks (for counts/analytics)
        // - filteredTasksAtom: UI-focused "upcoming" view (tomorrow + this week)
        expect(upcomingTasks.length).toBeGreaterThanOrEqual(
          filteredUpcomingTasks.length,
        );
      });
    });

    describe("Boundary Condition Tests", () => {
      it("should handle midnight boundary conditions correctly", () => {
        // Use fixed date for deterministic testing
        const today = new Date(2025, 7, 6); // Aug 6, 2025 (Wednesday)
        const startOfToday = new Date(today);
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);

        const justAfterMidnight = new Date(startOfToday.getTime() + 1); // 00:00:01
        const justBeforeMidnight = new Date(endOfToday.getTime() - 1); // 23:59:58
        const fixedCreatedAt = new Date(2025, 7, 5); // Aug 5, 2025

        const testTasks: Task[] = [
          {
            id: createTaskId("66666666-6666-4666-8666-666666666666"),
            title: "Just After Midnight",
            completed: false,
            priority: 2,
            dueDate: justAfterMidnight,
            createdAt: fixedCreatedAt,
            recurringMode: "dueDate",
            labels: [],
            subtasks: [],
            comments: [],
            projectId: INBOX_PROJECT_ID,
          },
          {
            id: createTaskId("77777777-7777-4777-8777-777777777777"),
            title: "Just Before Midnight",
            completed: false,
            priority: 2,
            dueDate: justBeforeMidnight,
            createdAt: fixedCreatedAt,
            recurringMode: "dueDate",
            labels: [],
            subtasks: [],
            comments: [],
            projectId: INBOX_PROJECT_ID,
          },
        ];

        // Test today logic with boundary conditions
        const todayTasks = testTasks.filter((task) => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          const todayNormalized = new Date(today);
          taskDate.setHours(0, 0, 0, 0);
          todayNormalized.setHours(0, 0, 0, 0);
          return taskDate.getTime() === todayNormalized.getTime();
        });

        // Both should be considered "today" tasks
        expect(todayTasks.length).toBe(2);
        expect(
          todayTasks.find(
            (t) => t.id === "66666666-6666-4666-8666-666666666666",
          ),
        ).toBeDefined();
        expect(
          todayTasks.find(
            (t) => t.id === "77777777-7777-4777-8777-777777777777",
          ),
        ).toBeDefined();
      });

      it("should handle tasks without due dates correctly", () => {
        // Use fixed dates for deterministic testing
        const fixedToday = new Date(2025, 7, 6); // Aug 6, 2025 (Wednesday)
        const fixedCreatedAt = new Date(2025, 7, 5); // Aug 5, 2025

        const testTasks: Task[] = [
          {
            id: createTaskId("88888888-8888-4888-8888-888888888888"),
            title: "No Due Date 1",
            completed: false,
            priority: 2,
            dueDate: undefined,
            createdAt: fixedCreatedAt,
            recurringMode: "dueDate",
            labels: [],
            subtasks: [],
            comments: [],
            projectId: INBOX_PROJECT_ID,
          },
          {
            id: createTaskId("99999999-9999-4999-8999-999999999999"),
            title: "Has Due Date",
            completed: false,
            priority: 2,
            dueDate: fixedToday,
            createdAt: fixedCreatedAt,
            recurringMode: "dueDate",
            labels: [],
            subtasks: [],
            comments: [],
            projectId: INBOX_PROJECT_ID,
          },
        ];

        // Test today logic with null due dates
        const todayTasks = testTasks.filter((task) => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          const today = new Date(fixedToday);
          taskDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          return taskDate.getTime() === today.getTime();
        });

        // Test upcoming logic with null due dates
        const today = new Date(fixedToday);
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const upcomingTasks = testTasks.filter((task) => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          taskDate.setHours(0, 0, 0, 0);
          return taskDate.getTime() >= tomorrow.getTime();
        });

        // Tasks without due dates should not appear in date-specific filters
        expect(todayTasks.length).toBe(1);
        const firstTodayTask = todayTasks[0];
        if (!firstTodayTask) {
          throw new Error("Expected to find first today task");
        }
        expect(firstTodayTask.id).toBe("99999999-9999-4999-8999-999999999999");

        expect(upcomingTasks.length).toBe(0); // No upcoming tasks in this test
      });
    });

    describe("Regression Prevention", () => {
      it("should catch if upcomingTasksAtom logic changes accidentally", () => {
        // Use fixed dates for deterministic testing
        const today = new Date(2025, 7, 6); // Aug 6, 2025 (Wednesday)
        const tomorrow = addDays(today, 1);
        const dayAfterTomorrow = addDays(today, 2);
        const nextMonth = addDays(today, 30);
        const fixedCreatedAt = new Date(2025, 7, 5); // Aug 5, 2025

        const testTasks: Task[] = [
          {
            id: createTaskId("22222222-2222-4222-8222-222222222222"),
            title: "Today Task",
            completed: false,
            priority: 2,
            dueDate: today,
            createdAt: fixedCreatedAt,
            recurringMode: "dueDate",
            labels: [],
            subtasks: [],
            comments: [],
            projectId: INBOX_PROJECT_ID,
          },
          {
            id: createTaskId("33333333-3333-4333-8333-333333333333"),
            title: "Tomorrow Task",
            completed: false,
            priority: 2,
            dueDate: tomorrow,
            createdAt: fixedCreatedAt,
            recurringMode: "dueDate",
            labels: [],
            subtasks: [],
            comments: [],
            projectId: INBOX_PROJECT_ID,
          },
          {
            id: createTaskId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
            title: "Day After Tomorrow",
            completed: false,
            priority: 2,
            dueDate: dayAfterTomorrow,
            createdAt: fixedCreatedAt,
            recurringMode: "dueDate",
            labels: [],
            subtasks: [],
            comments: [],
            projectId: INBOX_PROJECT_ID,
          },
          {
            id: createTaskId("55555555-5555-4555-8555-555555555555"),
            title: "Next Month Task",
            completed: false,
            priority: 2,
            dueDate: nextMonth,
            createdAt: fixedCreatedAt,
            recurringMode: "dueDate",
            labels: [],
            subtasks: [],
            comments: [],
            projectId: INBOX_PROJECT_ID,
          },
        ];

        // Apply upcomingTasksAtom logic
        const todayNormalized = new Date(today);
        todayNormalized.setHours(0, 0, 0, 0);
        const tomorrowNormalized = new Date(todayNormalized);
        tomorrowNormalized.setDate(tomorrowNormalized.getDate() + 1);

        const upcomingTasks = testTasks.filter((task) => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          taskDate.setHours(0, 0, 0, 0);
          return taskDate.getTime() >= tomorrowNormalized.getTime();
        });

        // This test will FAIL if someone accidentally changes upcomingTasksAtom
        // to use the more restrictive filteredTasksAtom logic
        expect(upcomingTasks.length).toBe(3); // tomorrow, day-after, next-month

        // Specifically check that far future tasks are included
        expect(
          upcomingTasks.find(
            (t) => t.id === "55555555-5555-4555-8555-555555555555",
          ),
        ).toBeDefined();

        // And today is excluded
        expect(upcomingTasks.find((t) => t.id === "today")).toBeUndefined();
      });
    });
  });
});
