import { describe, it, expect, beforeEach } from "vitest";
import { createStore } from "jotai";
import { v4 as uuidv4 } from "uuid";
import type { CreateTaskRequest } from "@tasktrove/types/api-requests";
import { createLabelId, createProjectId } from "@tasktrove/types/id";
import {
  quickAddTaskAtom,
  updateQuickAddTaskAtom,
  resetQuickAddTaskAtom,
} from "../ui/dialogs";

describe("Quick Add Dialog Atoms", () => {
  let store: ReturnType<typeof createStore>;

  // Generate valid UUIDs for testing
  const projectId1 = uuidv4();
  const projectId2 = uuidv4();
  const projectId3 = uuidv4();
  const projectIdMulti = uuidv4();
  const projectIdHealth = uuidv4();
  const projectIdWork = uuidv4();
  const labelId1 = uuidv4();
  const labelId2 = uuidv4();
  const labelIdA = uuidv4();
  const labelIdB = uuidv4();
  const labelIdUrgent = uuidv4();

  beforeEach(() => {
    store = createStore();
  });

  describe("updateQuickAddTaskAtom", () => {
    it("should update task fields", () => {
      // Set initial state
      store.set(quickAddTaskAtom, { title: "" });

      // Update with project
      store.set(updateQuickAddTaskAtom, {
        updateRequest: { projectId: createProjectId(projectId1) },
      });

      const task = store.get(quickAddTaskAtom);
      expect(task.projectId).toBe(createProjectId(projectId1));
      expect(task.title).toBe("");
    });

    it("should preserve existing fields when updating other fields", () => {
      // Set initial state with recurring and due date
      const initialTask: CreateTaskRequest = {
        title: "Test task",
        recurring: "RRULE:FREQ=DAILY",
        dueDate: new Date("2024-01-01"),
        priority: 2,
      };
      store.set(quickAddTaskAtom, initialTask);

      // Update only the project - should preserve recurring and dueDate
      store.set(updateQuickAddTaskAtom, {
        updateRequest: { projectId: createProjectId(projectId2) },
      });

      const updatedTask = store.get(quickAddTaskAtom);
      expect(updatedTask.projectId).toBe(createProjectId(projectId2));
      expect(updatedTask.recurring).toBe("RRULE:FREQ=DAILY");
      expect(updatedTask.dueDate).toEqual(new Date("2024-01-01"));
      expect(updatedTask.priority).toBe(2);
      expect(updatedTask.title).toBe("Test task");
    });

    it("should handle null values correctly only for fields being updated", () => {
      // Set initial state with various fields
      const initialTask: CreateTaskRequest = {
        title: "Test task",
        recurring: "RRULE:FREQ=WEEKLY",
        dueDate: new Date("2024-02-01"),
        dueTime: new Date("2024-02-01T14:00:00"),
        projectId: createProjectId(projectId3),
      };
      store.set(quickAddTaskAtom, initialTask);

      // Update with null dueDate - should only clear dueDate, not other fields
      store.set(updateQuickAddTaskAtom, {
        updateRequest: { dueDate: null },
      });

      let updatedTask = store.get(quickAddTaskAtom);
      expect(updatedTask.dueDate).toBeUndefined();
      expect(updatedTask.recurring).toBe("RRULE:FREQ=WEEKLY"); // Should be preserved
      expect(updatedTask.dueTime).toEqual(new Date("2024-02-01T14:00:00")); // Should be preserved
      expect(updatedTask.projectId).toBe(createProjectId(projectId3)); // Should be preserved

      // Update with null recurring - should only clear recurring
      store.set(updateQuickAddTaskAtom, {
        updateRequest: { recurring: null },
      });

      updatedTask = store.get(quickAddTaskAtom);
      expect(updatedTask.recurring).toBeUndefined();
      expect(updatedTask.dueTime).toEqual(new Date("2024-02-01T14:00:00")); // Should still be preserved
      expect(updatedTask.projectId).toBe(createProjectId(projectId3)); // Should still be preserved
    });

    it("should not clear fields that are not in the update request", () => {
      // This is the key test for our bug fix
      // Set initial state with recurring pattern and due date
      const initialTask: CreateTaskRequest = {
        title: "every day task",
        recurring: "RRULE:FREQ=DAILY",
        dueDate: new Date("2024-01-15"),
      };
      store.set(quickAddTaskAtom, initialTask);

      // Update only labels - recurring and dueDate should NOT be cleared
      store.set(updateQuickAddTaskAtom, {
        updateRequest: {
          labels: [createLabelId(labelId1), createLabelId(labelId2)],
        },
      });

      const updatedTask = store.get(quickAddTaskAtom);
      expect(updatedTask.labels).toEqual([
        createLabelId(labelId1),
        createLabelId(labelId2),
      ]);
      expect(updatedTask.recurring).toBe("RRULE:FREQ=DAILY"); // Must be preserved
      expect(updatedTask.dueDate).toEqual(new Date("2024-01-15")); // Must be preserved
      expect(updatedTask.title).toBe("every day task");
    });

    it("should handle updating multiple fields at once", () => {
      store.set(quickAddTaskAtom, { title: "Initial" });

      store.set(updateQuickAddTaskAtom, {
        updateRequest: {
          title: "Updated",
          priority: 1,
          projectId: createProjectId(projectIdMulti),
          labels: [createLabelId(labelIdA), createLabelId(labelIdB)],
          dueDate: new Date("2024-03-01"),
          recurring: "RRULE:FREQ=MONTHLY",
        },
      });

      const task = store.get(quickAddTaskAtom);
      expect(task.title).toBe("Updated");
      expect(task.priority).toBe(1);
      expect(task.projectId).toBe(createProjectId(projectIdMulti));
      expect(task.labels).toEqual([
        createLabelId(labelIdA),
        createLabelId(labelIdB),
      ]);
      expect(task.dueDate).toEqual(new Date("2024-03-01"));
      expect(task.recurring).toBe("RRULE:FREQ=MONTHLY");
    });

    it("should filter out completed field from update request", () => {
      store.set(quickAddTaskAtom, { title: "Test" });

      // The completed field should be ignored as it's not part of CreateTaskRequest
      store.set(updateQuickAddTaskAtom, {
        updateRequest: {
          title: "Updated",
          completed: true, // This should be filtered out
        },
      });

      const task = store.get(quickAddTaskAtom);
      expect(task.title).toBe("Updated");
      expect("completed" in task).toBe(false); // completed should not exist in CreateTaskRequest
    });

    it("should handle undefined values without converting them", () => {
      const initialTask: CreateTaskRequest = {
        title: "Test",
        priority: 2,
        projectId: createProjectId(projectId1),
      };
      store.set(quickAddTaskAtom, initialTask);

      // Update with undefined values - should clear the fields
      store.set(updateQuickAddTaskAtom, {
        updateRequest: {
          priority: undefined,
          projectId: undefined,
        },
      });

      const task = store.get(quickAddTaskAtom);
      expect(task.priority).toBeUndefined();
      expect(task.projectId).toBeUndefined();
      expect(task.title).toBe("Test"); // Should be preserved
    });
  });

  describe("resetQuickAddTaskAtom", () => {
    it("should reset task to initial state", () => {
      // Set some task data
      store.set(quickAddTaskAtom, {
        title: "Test task",
        priority: 1,
        projectId: createProjectId(projectId1),
        labels: [createLabelId(labelId1)],
        dueDate: new Date("2024-01-01"),
        recurring: "RRULE:FREQ=DAILY",
      });

      // Reset the task
      store.set(resetQuickAddTaskAtom);

      const task = store.get(quickAddTaskAtom);
      expect(task).toEqual({ title: "" });
    });
  });

  describe("Regression test for due date badge reset bug", () => {
    it("should preserve recurring and due date when updating project after parsing 'every day #Health'", () => {
      // This test simulates the exact bug scenario:
      // 1. User types "every day " - parser sets recurring and dueDate
      // 2. User types "#Health " - parser sets projectId
      // 3. Bug: recurring and dueDate were being cleared when updating projectId

      // Initial state after parsing "every day"
      const afterEveryDay: CreateTaskRequest = {
        title: "every day",
        recurring: "RRULE:FREQ=DAILY",
        dueDate: new Date("2024-01-15"),
      };
      store.set(quickAddTaskAtom, afterEveryDay);

      // Simulate parser finding "#Health" and updating only projectId
      store.set(updateQuickAddTaskAtom, {
        updateRequest: {
          projectId: createProjectId(projectIdHealth),
          title: "every day #Health", // Title also gets updated
        },
      });

      // Verify that recurring and dueDate are preserved
      const finalTask = store.get(quickAddTaskAtom);
      expect(finalTask.title).toBe("every day #Health");
      expect(finalTask.projectId).toBe(createProjectId(projectIdHealth));
      expect(finalTask.recurring).toBe("RRULE:FREQ=DAILY"); // Must NOT be cleared
      expect(finalTask.dueDate).toEqual(new Date("2024-01-15")); // Must NOT be cleared
    });

    it("should preserve project when updating labels after parsing '#Work @urgent'", () => {
      // Similar scenario but with project first, then labels

      // Initial state after parsing "#Work"
      const afterWork: CreateTaskRequest = {
        title: "#Work",
        projectId: createProjectId(projectIdWork),
      };
      store.set(quickAddTaskAtom, afterWork);

      // Simulate parser finding "@urgent" and updating only labels
      store.set(updateQuickAddTaskAtom, {
        updateRequest: {
          labels: [createLabelId(labelIdUrgent)],
          title: "#Work @urgent",
        },
      });

      // Verify that projectId is preserved
      const finalTask = store.get(quickAddTaskAtom);
      expect(finalTask.title).toBe("#Work @urgent");
      expect(finalTask.labels).toEqual([createLabelId(labelIdUrgent)]);
      expect(finalTask.projectId).toBe(createProjectId(projectIdWork)); // Must NOT be cleared
    });

    it("should preserve priority when updating due date after parsing 'p1 tomorrow'", () => {
      // Initial state after parsing "p1"
      const afterP1: CreateTaskRequest = {
        title: "p1",
        priority: 1,
      };
      store.set(quickAddTaskAtom, afterP1);

      // Simulate parser finding "tomorrow" and updating only dueDate
      store.set(updateQuickAddTaskAtom, {
        updateRequest: {
          dueDate: new Date("2024-01-16"),
          title: "p1 tomorrow",
        },
      });

      // Verify that priority is preserved
      const finalTask = store.get(quickAddTaskAtom);
      expect(finalTask.title).toBe("p1 tomorrow");
      expect(finalTask.dueDate).toEqual(new Date("2024-01-16"));
      expect(finalTask.priority).toBe(1); // Must NOT be cleared
    });
  });
});
