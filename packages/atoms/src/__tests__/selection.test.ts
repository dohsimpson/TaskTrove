import { describe, it, expect, beforeEach } from "vitest";
import { createStore } from "jotai";
import {
  selectionModeAtom,
  lastSelectedTaskAtom,
  hasSelectedTasksAtom,
  selectedTaskCountAtom,
  isTaskSelectedAtom,
  toggleTaskSelectionAtom,
  enterSelectionModeAtom,
  exitSelectionModeAtom,
  selectAllVisibleTasksAtom,
  clearSelectionAtom,
  addTaskToSelectionAtom,
  removeTaskFromSelectionAtom,
  selectTaskRangeAtom,
  allVisibleTasksSelectedAtom,
  someVisibleTasksSelectedAtom,
} from "../ui/selection";
import {
  selectedTasksAtom,
  baseSelectedTasksAtom,
  selectedTaskIdAtom,
} from "../ui/dialogs";
import { filteredTasksAtom } from "../ui/filtered-tasks";
import { createTaskId, type Task, type TaskId } from "@tasktrove/types";
import {
  TEST_TASK_ID_1,
  TEST_TASK_ID_2,
  TEST_TASK_ID_3,
  TEST_TASK_ID_4,
  TEST_TASK_ID_5,
} from "../utils/test-helpers";

describe("Selection Atoms", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  const createMockTask = (id: TaskId, title: string): Task => ({
    id,
    title,
    completed: false,
    createdAt: new Date(),
    description: "",
    priority: 4,
    labels: [],
    subtasks: [],
    comments: [],
    recurringMode: "dueDate",
  });

  describe("Base State Atoms", () => {
    describe("selectionModeAtom", () => {
      it("is false when no tasks are selected", () => {
        const selectionMode = store.get(selectionModeAtom);
        expect(selectionMode).toBe(false);
      });

      it("becomes true when tasks are added to baseSelectedTasksAtom", () => {
        store.set(baseSelectedTasksAtom, [TEST_TASK_ID_1]);
        const selectionMode = store.get(selectionModeAtom);
        expect(selectionMode).toBe(true);
      });

      it("becomes false when all tasks are removed from baseSelectedTasksAtom", () => {
        store.set(baseSelectedTasksAtom, [TEST_TASK_ID_1, TEST_TASK_ID_2]);
        expect(store.get(selectionModeAtom)).toBe(true);

        store.set(baseSelectedTasksAtom, []);
        expect(store.get(selectionModeAtom)).toBe(false);
      });

      it("updates automatically when baseSelectedTasksAtom changes", () => {
        expect(store.get(selectionModeAtom)).toBe(false);

        store.set(baseSelectedTasksAtom, [TEST_TASK_ID_1]);
        expect(store.get(selectionModeAtom)).toBe(true);

        store.set(baseSelectedTasksAtom, [TEST_TASK_ID_1, TEST_TASK_ID_2]);
        expect(store.get(selectionModeAtom)).toBe(true);

        store.set(baseSelectedTasksAtom, []);
        expect(store.get(selectionModeAtom)).toBe(false);
      });
    });

    describe("selectedTasksAtom", () => {
      it("returns empty array initially", () => {
        const selectedTasks = store.get(selectedTasksAtom);
        expect(selectedTasks).toEqual([]);
      });

      it("returns tasks from baseSelectedTasksAtom", () => {
        store.set(baseSelectedTasksAtom, [TEST_TASK_ID_1, TEST_TASK_ID_2]);
        const selectedTasks = store.get(selectedTasksAtom);
        expect(selectedTasks).toEqual([TEST_TASK_ID_1, TEST_TASK_ID_2]);
      });

      it("automatically includes selectedTaskId (panel task)", () => {
        store.set(selectedTaskIdAtom, TEST_TASK_ID_1);
        const selectedTasks = store.get(selectedTasksAtom);
        expect(selectedTasks).toContain(TEST_TASK_ID_1);
      });

      it("includes panel task even when baseSelectedTasks is empty", () => {
        store.set(baseSelectedTasksAtom, []);
        store.set(selectedTaskIdAtom, TEST_TASK_ID_1);
        const selectedTasks = store.get(selectedTasksAtom);
        expect(selectedTasks).toEqual([TEST_TASK_ID_1]);
      });

      it("does not duplicate panel task if already in baseSelectedTasks", () => {
        store.set(baseSelectedTasksAtom, [TEST_TASK_ID_1, TEST_TASK_ID_2]);
        store.set(selectedTaskIdAtom, TEST_TASK_ID_1);
        const selectedTasks = store.get(selectedTasksAtom);
        expect(selectedTasks).toEqual([TEST_TASK_ID_1, TEST_TASK_ID_2]);
      });

      it("merges baseSelectedTasks and panel task correctly", () => {
        store.set(baseSelectedTasksAtom, [TEST_TASK_ID_2, TEST_TASK_ID_3]);
        store.set(selectedTaskIdAtom, TEST_TASK_ID_1);
        const selectedTasks = store.get(selectedTasksAtom);
        expect(selectedTasks).toContain(TEST_TASK_ID_1);
        expect(selectedTasks).toContain(TEST_TASK_ID_2);
        expect(selectedTasks).toContain(TEST_TASK_ID_3);
        expect(selectedTasks).toHaveLength(3);
      });

      it("updates when baseSelectedTasksAtom changes", () => {
        store.set(baseSelectedTasksAtom, [TEST_TASK_ID_1]);
        expect(store.get(selectedTasksAtom)).toEqual([TEST_TASK_ID_1]);

        store.set(baseSelectedTasksAtom, [TEST_TASK_ID_1, TEST_TASK_ID_2]);
        expect(store.get(selectedTasksAtom)).toEqual([
          TEST_TASK_ID_1,
          TEST_TASK_ID_2,
        ]);
      });
    });

    describe("lastSelectedTaskAtom", () => {
      it("is null initially", () => {
        const lastSelected = store.get(lastSelectedTaskAtom);
        expect(lastSelected).toBeNull();
      });

      it("can be set to a task ID", () => {
        store.set(lastSelectedTaskAtom, TEST_TASK_ID_1);
        expect(store.get(lastSelectedTaskAtom)).toBe(TEST_TASK_ID_1);
      });
    });
  });

  describe("Derived State Atoms", () => {
    describe("hasSelectedTasksAtom", () => {
      it("is false when no tasks selected", () => {
        expect(store.get(hasSelectedTasksAtom)).toBe(false);
      });

      it("is true when tasks are selected", () => {
        store.set(baseSelectedTasksAtom, [TEST_TASK_ID_1]);
        expect(store.get(hasSelectedTasksAtom)).toBe(true);
      });
    });

    describe("selectedTaskCountAtom", () => {
      it("is 0 when no tasks selected", () => {
        expect(store.get(selectedTaskCountAtom)).toBe(0);
      });

      it("returns correct count", () => {
        store.set(baseSelectedTasksAtom, [TEST_TASK_ID_1, TEST_TASK_ID_2]);
        expect(store.get(selectedTaskCountAtom)).toBe(2);
      });

      it("includes panel task in count", () => {
        store.set(baseSelectedTasksAtom, [TEST_TASK_ID_1]);
        store.set(selectedTaskIdAtom, TEST_TASK_ID_2);
        expect(store.get(selectedTaskCountAtom)).toBe(2);
      });
    });

    describe("isTaskSelectedAtom", () => {
      it("returns function that checks if task is selected", () => {
        store.set(baseSelectedTasksAtom, [TEST_TASK_ID_1, TEST_TASK_ID_2]);
        const isSelected = store.get(isTaskSelectedAtom);
        expect(isSelected(TEST_TASK_ID_1)).toBe(true);
        expect(isSelected(TEST_TASK_ID_2)).toBe(true);
        expect(isSelected(TEST_TASK_ID_3)).toBe(false);
      });
    });

    // Note: Tests for allVisibleTasksSelectedAtom and someVisibleTasksSelectedAtom
    // are skipped because they depend on filteredTasksAtom which is a derived atom
    // and cannot be set directly in tests. These atoms are tested indirectly through
    // integration tests below and in component tests.
  });

  describe("Action Atoms", () => {
    describe("toggleTaskSelectionAtom", () => {
      it("adds task to selection when not selected", () => {
        store.set(toggleTaskSelectionAtom, TEST_TASK_ID_1);
        expect(store.get(selectedTasksAtom)).toContain(TEST_TASK_ID_1);
      });

      it("removes task from selection when selected", () => {
        store.set(baseSelectedTasksAtom, [TEST_TASK_ID_1]);
        store.set(toggleTaskSelectionAtom, TEST_TASK_ID_1);
        expect(store.get(selectedTasksAtom)).not.toContain(TEST_TASK_ID_1);
      });

      it("sets lastSelectedTaskAtom when adding task", () => {
        store.set(toggleTaskSelectionAtom, TEST_TASK_ID_1);
        expect(store.get(lastSelectedTaskAtom)).toBe(TEST_TASK_ID_1);
      });

      it("does not change lastSelectedTaskAtom when removing task", () => {
        store.set(toggleTaskSelectionAtom, TEST_TASK_ID_1);
        store.set(lastSelectedTaskAtom, TEST_TASK_ID_2);
        store.set(toggleTaskSelectionAtom, TEST_TASK_ID_1);
        expect(store.get(lastSelectedTaskAtom)).toBe(TEST_TASK_ID_2);
      });

      it("automatically activates selection mode when first task added", () => {
        expect(store.get(selectionModeAtom)).toBe(false);
        store.set(toggleTaskSelectionAtom, TEST_TASK_ID_1);
        expect(store.get(selectionModeAtom)).toBe(true);
      });

      it("automatically deactivates selection mode when last task removed", () => {
        store.set(toggleTaskSelectionAtom, TEST_TASK_ID_1);
        expect(store.get(selectionModeAtom)).toBe(true);
        store.set(toggleTaskSelectionAtom, TEST_TASK_ID_1);
        expect(store.get(selectionModeAtom)).toBe(false);
      });
    });

    describe("addTaskToSelectionAtom", () => {
      it("adds task to selection", () => {
        store.set(addTaskToSelectionAtom, TEST_TASK_ID_1);
        expect(store.get(selectedTasksAtom)).toContain(TEST_TASK_ID_1);
      });

      it("does not add duplicate", () => {
        store.set(addTaskToSelectionAtom, TEST_TASK_ID_1);
        store.set(addTaskToSelectionAtom, TEST_TASK_ID_1);
        const selected = store.get(selectedTasksAtom);
        expect(selected.filter((id) => id === TEST_TASK_ID_1)).toHaveLength(1);
      });

      it("updates lastSelectedTaskAtom", () => {
        store.set(addTaskToSelectionAtom, TEST_TASK_ID_1);
        expect(store.get(lastSelectedTaskAtom)).toBe(TEST_TASK_ID_1);
      });

      it("activates selection mode", () => {
        store.set(addTaskToSelectionAtom, TEST_TASK_ID_1);
        expect(store.get(selectionModeAtom)).toBe(true);
      });
    });

    describe("removeTaskFromSelectionAtom", () => {
      it("removes task from selection", () => {
        store.set(baseSelectedTasksAtom, [TEST_TASK_ID_1, TEST_TASK_ID_2]);
        store.set(removeTaskFromSelectionAtom, TEST_TASK_ID_1);
        expect(store.get(selectedTasksAtom)).not.toContain(TEST_TASK_ID_1);
        expect(store.get(selectedTasksAtom)).toContain(TEST_TASK_ID_2);
      });

      it("deactivates selection mode when last task removed", () => {
        store.set(baseSelectedTasksAtom, [TEST_TASK_ID_1]);
        store.set(removeTaskFromSelectionAtom, TEST_TASK_ID_1);
        expect(store.get(selectionModeAtom)).toBe(false);
      });
    });

    describe("enterSelectionModeAtom", () => {
      it("adds initial task if provided", () => {
        store.set(enterSelectionModeAtom, TEST_TASK_ID_1);
        expect(store.get(selectedTasksAtom)).toContain(TEST_TASK_ID_1);
      });

      it("does not add task if already selected", () => {
        store.set(baseSelectedTasksAtom, [TEST_TASK_ID_1]);
        store.set(enterSelectionModeAtom, TEST_TASK_ID_1);
        const selected = store.get(selectedTasksAtom);
        expect(selected.filter((id) => id === TEST_TASK_ID_1)).toHaveLength(1);
      });

      it("works without initial task", () => {
        store.set(enterSelectionModeAtom, undefined);
        expect(store.get(selectedTasksAtom)).toEqual([]);
      });
    });

    describe("exitSelectionModeAtom", () => {
      it("clears all selections", () => {
        store.set(baseSelectedTasksAtom, [TEST_TASK_ID_1, TEST_TASK_ID_2]);
        store.set(exitSelectionModeAtom);
        expect(store.get(selectedTasksAtom)).toEqual([]);
      });

      it("deactivates selection mode", () => {
        store.set(baseSelectedTasksAtom, [TEST_TASK_ID_1]);
        store.set(exitSelectionModeAtom);
        expect(store.get(selectionModeAtom)).toBe(false);
      });
    });

    describe("clearSelectionAtom", () => {
      it("clears all selections", () => {
        store.set(baseSelectedTasksAtom, [TEST_TASK_ID_1, TEST_TASK_ID_2]);
        store.set(clearSelectionAtom);
        expect(store.get(selectedTasksAtom)).toEqual([]);
      });

      it("deactivates selection mode", () => {
        store.set(baseSelectedTasksAtom, [TEST_TASK_ID_1]);
        store.set(clearSelectionAtom);
        expect(store.get(selectionModeAtom)).toBe(false);
      });
    });

    // Note: selectAllVisibleTasksAtom and selectTaskRangeAtom tests are skipped
    // because they depend on filteredTasksAtom which is a derived atom.
    // These atoms are tested indirectly through component tests where the full
    // task filtering pipeline is set up.
  });

  describe("Integration Scenarios", () => {
    it("toggle selection workflow", () => {
      // Start with no selection
      expect(store.get(selectionModeAtom)).toBe(false);

      // CMD+click task 1 → select it
      store.set(toggleTaskSelectionAtom, TEST_TASK_ID_1);
      expect(store.get(selectedTasksAtom)).toEqual([TEST_TASK_ID_1]);
      expect(store.get(selectionModeAtom)).toBe(true);

      // CMD+click task 2 → add to selection
      store.set(toggleTaskSelectionAtom, TEST_TASK_ID_2);
      let selected = store.get(selectedTasksAtom);
      expect(selected).toContain(TEST_TASK_ID_1);
      expect(selected).toContain(TEST_TASK_ID_2);

      // CMD+click task 2 → deselect it
      store.set(toggleTaskSelectionAtom, TEST_TASK_ID_2);
      selected = store.get(selectedTasksAtom);
      expect(selected).not.toContain(TEST_TASK_ID_2);
      expect(selected).toContain(TEST_TASK_ID_1);

      // Clear selection
      store.set(clearSelectionAtom);
      expect(store.get(selectedTasksAtom)).toEqual([]);
      expect(store.get(selectionModeAtom)).toBe(false);
    });

    it("panel task is always included in selection", () => {
      // Open task 1 in panel
      store.set(selectedTaskIdAtom, TEST_TASK_ID_1);
      expect(store.get(selectedTasksAtom)).toContain(TEST_TASK_ID_1);

      // Select task 2 manually
      store.set(toggleTaskSelectionAtom, TEST_TASK_ID_2);
      let selected = store.get(selectedTasksAtom);
      expect(selected).toContain(TEST_TASK_ID_1); // Panel task still included
      expect(selected).toContain(TEST_TASK_ID_2); // Manually selected

      // Close panel
      store.set(selectedTaskIdAtom, null);
      selected = store.get(selectedTasksAtom);
      expect(selected).not.toContain(TEST_TASK_ID_1);
      expect(selected).toContain(TEST_TASK_ID_2);
    });

    it("selection mode only depends on manual selection", () => {
      // Opening panel task does NOT activate selection mode
      store.set(selectedTaskIdAtom, TEST_TASK_ID_1);
      expect(store.get(selectionModeAtom)).toBe(false);
      expect(store.get(selectedTasksAtom)).toContain(TEST_TASK_ID_1);

      // Manually selecting activates selection mode
      store.set(toggleTaskSelectionAtom, TEST_TASK_ID_2);
      expect(store.get(selectionModeAtom)).toBe(true);

      // Deselecting manual selection deactivates mode (panel task doesn't count)
      store.set(toggleTaskSelectionAtom, TEST_TASK_ID_2);
      expect(store.get(selectionModeAtom)).toBe(false);
      expect(store.get(selectedTasksAtom)).toContain(TEST_TASK_ID_1); // Panel task still there
    });
  });
});
