import { describe, it, expect, beforeEach } from "vitest";
import { createStore } from "jotai";
import {
  selectedTasksAtom,
  selectedTaskIdAtom,
  lastSelectedTaskAtom,
  toggleTaskSelectionAtom,
  clearSelectedTasksAtom,
  setSelectedTaskIdAtom,
  selectRangeAtom,
  selectedTaskRouteContextAtom,
} from "../ui/selection";
import {
  TEST_TASK_ID_1,
  TEST_TASK_ID_2,
  TEST_TASK_ID_3,
} from "../utils/test-helpers";
import type { TaskId } from "@tasktrove/types/id";

// Helper functions for derived logic
const hasSelectedTasks = (store: ReturnType<typeof createStore>) => {
  const selectedTasks = store.get(selectedTasksAtom);
  return selectedTasks.length > 0;
};

const getSelectedTaskCount = (store: ReturnType<typeof createStore>) => {
  const selectedTasks = store.get(selectedTasksAtom);
  return selectedTasks.length;
};

const isTaskSelected = (store: ReturnType<typeof createStore>) => {
  const selectedTasks = store.get(selectedTasksAtom);
  return (taskId: TaskId) => selectedTasks.includes(taskId);
};

describe("Selection Atoms", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  describe("Core Selection Atoms", () => {
    describe("selectedTasksAtom", () => {
      it("returns empty array initially", () => {
        const selectedTasks = store.get(selectedTasksAtom);
        expect(selectedTasks).toEqual([]);
      });

      it("stores selected task IDs", () => {
        store.set(selectedTasksAtom, [TEST_TASK_ID_1]);
        const selectedTasks = store.get(selectedTasksAtom);
        expect(selectedTasks).toEqual([TEST_TASK_ID_1]);
      });

      it("can store multiple selected task IDs", () => {
        store.set(selectedTasksAtom, [TEST_TASK_ID_1, TEST_TASK_ID_2]);
        const selectedTasks = store.get(selectedTasksAtom);
        expect(selectedTasks).toEqual([TEST_TASK_ID_1, TEST_TASK_ID_2]);
      });

      it("updates correctly when changed", () => {
        expect(store.get(selectedTasksAtom)).toEqual([]);

        store.set(selectedTasksAtom, [TEST_TASK_ID_1]);
        expect(store.get(selectedTasksAtom)).toEqual([TEST_TASK_ID_1]);

        store.set(selectedTasksAtom, [TEST_TASK_ID_1, TEST_TASK_ID_2]);
        expect(store.get(selectedTasksAtom)).toEqual([
          TEST_TASK_ID_1,
          TEST_TASK_ID_2,
        ]);

        store.set(selectedTasksAtom, []);
        expect(store.get(selectedTasksAtom)).toEqual([]);
      });
    });

    describe("selectedTaskIdAtom", () => {
      it("returns null initially", () => {
        const selectedTaskId = store.get(selectedTaskIdAtom);
        expect(selectedTaskId).toBe(null);
      });

      it("stores the selected task ID for panel", () => {
        store.set(selectedTaskIdAtom, TEST_TASK_ID_1);
        const selectedTaskId = store.get(selectedTaskIdAtom);
        expect(selectedTaskId).toBe(TEST_TASK_ID_1);
      });
    });

    describe("lastSelectedTaskAtom", () => {
      it("returns null initially", () => {
        const lastSelectedTask = store.get(lastSelectedTaskAtom);
        expect(lastSelectedTask).toBe(null);
      });

      it("stores the last selected task ID", () => {
        store.set(lastSelectedTaskAtom, TEST_TASK_ID_1);
        const lastSelectedTask = store.get(lastSelectedTaskAtom);
        expect(lastSelectedTask).toBe(TEST_TASK_ID_1);
      });
    });
  });

  describe("Derived State Helpers", () => {
    describe("hasSelectedTasks helper", () => {
      it("is false when no tasks selected", () => {
        expect(hasSelectedTasks(store)).toBe(false);
      });

      it("is true when tasks are selected", () => {
        store.set(selectedTasksAtom, [TEST_TASK_ID_1]);
        expect(hasSelectedTasks(store)).toBe(true);
      });
    });

    describe("getSelectedTaskCount helper", () => {
      it("is 0 when no tasks selected", () => {
        expect(getSelectedTaskCount(store)).toBe(0);
      });

      it("returns correct count", () => {
        store.set(selectedTasksAtom, [TEST_TASK_ID_1, TEST_TASK_ID_2]);
        expect(getSelectedTaskCount(store)).toBe(2);
      });
    });

    describe("isTaskSelected helper", () => {
      it("returns function that checks if task is selected", () => {
        store.set(selectedTasksAtom, [TEST_TASK_ID_1, TEST_TASK_ID_2]);
        expect(isTaskSelected(store)(TEST_TASK_ID_1)).toBe(true);
        expect(isTaskSelected(store)(TEST_TASK_ID_2)).toBe(true);
        expect(isTaskSelected(store)(TEST_TASK_ID_3)).toBe(false);
      });
    });
  });

  describe("Action Atoms", () => {
    describe("setSelectedTaskIdAtom", () => {
      it("sets selected task ID and clears bulk selection", () => {
        store.set(selectedTasksAtom, [TEST_TASK_ID_1, TEST_TASK_ID_2]);
        store.set(setSelectedTaskIdAtom, TEST_TASK_ID_3);

        expect(store.get(selectedTaskIdAtom)).toBe(TEST_TASK_ID_3);
        expect(store.get(selectedTasksAtom)).toEqual([]);
      });

      it("sets selected task ID to null", () => {
        store.set(selectedTaskIdAtom, TEST_TASK_ID_1);
        store.set(setSelectedTaskIdAtom, null);

        expect(store.get(selectedTaskIdAtom)).toBe(null);
      });

      it("clears route context when deselecting", () => {
        store.set(setSelectedTaskIdAtom, TEST_TASK_ID_1);
        store.set(setSelectedTaskIdAtom, null);

        expect(store.get(selectedTaskRouteContextAtom)).toBeNull();
      });
    });

    describe("toggleTaskSelectionAtom", () => {
      it("adds task to selection when not selected", () => {
        store.set(toggleTaskSelectionAtom, TEST_TASK_ID_1);
        expect(store.get(selectedTasksAtom)).toContain(TEST_TASK_ID_1);
      });

      it("removes task from selection when selected", () => {
        store.set(selectedTasksAtom, [TEST_TASK_ID_1]);
        store.set(toggleTaskSelectionAtom, TEST_TASK_ID_1);
        expect(store.get(selectedTasksAtom)).not.toContain(TEST_TASK_ID_1);
      });

      it("tracks last selected task when adding to selection", () => {
        store.set(toggleTaskSelectionAtom, TEST_TASK_ID_1);
        expect(store.get(lastSelectedTaskAtom)).toBe(TEST_TASK_ID_1);
      });

      it("clears last selected task when removing from selection", () => {
        store.set(selectedTasksAtom, [TEST_TASK_ID_1]);
        store.set(lastSelectedTaskAtom, TEST_TASK_ID_1);
        store.set(toggleTaskSelectionAtom, TEST_TASK_ID_1);
        expect(store.get(lastSelectedTaskAtom)).toBe(null);
      });
    });

    describe("clearSelectedTasksAtom", () => {
      it("clears all selections", () => {
        store.set(selectedTasksAtom, [TEST_TASK_ID_1, TEST_TASK_ID_2]);
        store.set(clearSelectedTasksAtom);
        expect(store.get(selectedTasksAtom)).toEqual([]);
      });

      it("clears last selected task", () => {
        store.set(selectedTasksAtom, [TEST_TASK_ID_1]);
        store.set(lastSelectedTaskAtom, TEST_TASK_ID_1);
        store.set(clearSelectedTasksAtom);
        expect(store.get(lastSelectedTaskAtom)).toBe(null);
      });
    });

    describe("selectRangeAtom", () => {
      it("selects range between two tasks", () => {
        const sortedTaskIds = [TEST_TASK_ID_1, TEST_TASK_ID_2, TEST_TASK_ID_3];

        store.set(selectRangeAtom, {
          startTaskId: TEST_TASK_ID_1,
          endTaskId: TEST_TASK_ID_3,
          sortedTaskIds,
        });

        expect(store.get(selectedTasksAtom)).toEqual([
          TEST_TASK_ID_1,
          TEST_TASK_ID_2,
          TEST_TASK_ID_3,
        ]);
        expect(store.get(lastSelectedTaskAtom)).toBe(TEST_TASK_ID_3);
      });

      it("merges range with existing selection", () => {
        const sortedTaskIds = [TEST_TASK_ID_1, TEST_TASK_ID_2, TEST_TASK_ID_3];
        store.set(selectedTasksAtom, [TEST_TASK_ID_3]);

        store.set(selectRangeAtom, {
          startTaskId: TEST_TASK_ID_1,
          endTaskId: TEST_TASK_ID_2,
          sortedTaskIds,
        });

        const selected = store.get(selectedTasksAtom);
        expect(selected).toContain(TEST_TASK_ID_1);
        expect(selected).toContain(TEST_TASK_ID_2);
        expect(selected).toContain(TEST_TASK_ID_3);
        expect(selected).toHaveLength(3);
      });

      it("handles reverse range selection", () => {
        const sortedTaskIds = [TEST_TASK_ID_1, TEST_TASK_ID_2, TEST_TASK_ID_3];

        store.set(selectRangeAtom, {
          startTaskId: TEST_TASK_ID_3,
          endTaskId: TEST_TASK_ID_1,
          sortedTaskIds,
        });

        expect(store.get(selectedTasksAtom)).toEqual([
          TEST_TASK_ID_1,
          TEST_TASK_ID_2,
          TEST_TASK_ID_3,
        ]);
      });
    });
  });

  describe("Integration Scenarios", () => {
    it("toggle selection workflow", () => {
      // Start with no selection
      expect(store.get(selectedTasksAtom)).toEqual([]);

      // CMD+click task 1 → select it
      store.set(toggleTaskSelectionAtom, TEST_TASK_ID_1);
      expect(store.get(selectedTasksAtom)).toEqual([TEST_TASK_ID_1]);
      expect(store.get(lastSelectedTaskAtom)).toBe(TEST_TASK_ID_1);

      // CMD+click task 2 → add to selection
      store.set(toggleTaskSelectionAtom, TEST_TASK_ID_2);
      let selected = store.get(selectedTasksAtom);
      expect(selected).toContain(TEST_TASK_ID_1);
      expect(selected).toContain(TEST_TASK_ID_2);
      expect(store.get(lastSelectedTaskAtom)).toBe(TEST_TASK_ID_2);

      // CMD+click task 2 → deselect it
      store.set(toggleTaskSelectionAtom, TEST_TASK_ID_2);
      selected = store.get(selectedTasksAtom);
      expect(selected).not.toContain(TEST_TASK_ID_2);
      expect(selected).toContain(TEST_TASK_ID_1);
      expect(store.get(lastSelectedTaskAtom)).toBe(null);

      // Clear selection
      store.set(clearSelectedTasksAtom);
      expect(store.get(selectedTasksAtom)).toEqual([]);
      expect(store.get(lastSelectedTaskAtom)).toBe(null);
    });

    it("setSelectedTaskId clears bulk selection", () => {
      // Start with some bulk selection
      store.set(selectedTasksAtom, [TEST_TASK_ID_1, TEST_TASK_ID_2]);
      store.set(lastSelectedTaskAtom, TEST_TASK_ID_2);

      // Open task 3 in panel (should clear bulk selection)
      store.set(setSelectedTaskIdAtom, TEST_TASK_ID_3);

      expect(store.get(selectedTaskIdAtom)).toBe(TEST_TASK_ID_3);
      expect(store.get(selectedTasksAtom)).toEqual([]);
      expect(store.get(lastSelectedTaskAtom)).toBe(null);

      // Setting to null keeps bulk selection cleared
      store.set(setSelectedTaskIdAtom, null);
      expect(store.get(selectedTaskIdAtom)).toBe(null);
      expect(store.get(selectedTasksAtom)).toEqual([]);
    });

    it("range selection with existing selection", () => {
      const sortedTaskIds = [TEST_TASK_ID_1, TEST_TASK_ID_2, TEST_TASK_ID_3];

      // Start with task 3 selected
      store.set(selectedTasksAtom, [TEST_TASK_ID_3]);
      store.set(lastSelectedTaskAtom, TEST_TASK_ID_3);

      // Range select from task 1 to task 2
      store.set(selectRangeAtom, {
        startTaskId: TEST_TASK_ID_1,
        endTaskId: TEST_TASK_ID_2,
        sortedTaskIds,
      });

      // Should merge: task 3 (existing) + tasks 1,2 (range)
      const selected = store.get(selectedTasksAtom);
      expect(selected).toContain(TEST_TASK_ID_1);
      expect(selected).toContain(TEST_TASK_ID_2);
      expect(selected).toContain(TEST_TASK_ID_3);
      expect(selected).toHaveLength(3);
      expect(store.get(lastSelectedTaskAtom)).toBe(TEST_TASK_ID_2);
    });

    it("preserves side panel task when transitioning to multi-select", () => {
      // Start with task 1 selected in side panel
      store.set(selectedTaskIdAtom, TEST_TASK_ID_1);
      expect(store.get(selectedTaskIdAtom)).toBe(TEST_TASK_ID_1);
      expect(store.get(selectedTasksAtom)).toEqual([]);

      // CMD+click task 2 to enter multi-select mode
      store.set(toggleTaskSelectionAtom, TEST_TASK_ID_2);

      // Should preserve task 1 and add task 2 to multi-select
      const selected = store.get(selectedTasksAtom);
      expect(selected).toContain(TEST_TASK_ID_1);
      expect(selected).toContain(TEST_TASK_ID_2);
      expect(selected).toHaveLength(2);

      // Side panel should be cleared
      expect(store.get(selectedTaskIdAtom)).toBe(null);

      // Last selected should be task 2
      expect(store.get(lastSelectedTaskAtom)).toBe(TEST_TASK_ID_2);
    });

    it("preserves side panel task when SHIFT+clicking for range selection", () => {
      const sortedTaskIds = [TEST_TASK_ID_1, TEST_TASK_ID_2, TEST_TASK_ID_3];

      // Start with task 1 selected in side panel
      store.set(selectedTaskIdAtom, TEST_TASK_ID_1);
      expect(store.get(selectedTaskIdAtom)).toBe(TEST_TASK_ID_1);
      expect(store.get(selectedTasksAtom)).toEqual([]);

      // Simulate CMD+click on task 2 first (establishes anchor)
      store.set(toggleTaskSelectionAtom, TEST_TASK_ID_2);

      // Task 1 should now be preserved in multi-select along with task 2
      let selected = store.get(selectedTasksAtom);
      expect(selected).toContain(TEST_TASK_ID_1);
      expect(selected).toContain(TEST_TASK_ID_2);
      expect(store.get(lastSelectedTaskAtom)).toBe(TEST_TASK_ID_2);

      // Now SHIFT+click task 3 for range selection from task 2 to task 3
      store.set(selectRangeAtom, {
        startTaskId: TEST_TASK_ID_2,
        endTaskId: TEST_TASK_ID_3,
        sortedTaskIds,
      });

      // Should have all three tasks: task 1 (preserved), task 2-3 (range)
      selected = store.get(selectedTasksAtom);
      expect(selected).toContain(TEST_TASK_ID_1);
      expect(selected).toContain(TEST_TASK_ID_2);
      expect(selected).toContain(TEST_TASK_ID_3);
      expect(selected).toHaveLength(3);
    });
  });
});
