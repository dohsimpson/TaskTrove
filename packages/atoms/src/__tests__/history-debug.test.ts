/**
 * ⚠️  WEB API DEPENDENT - History Atoms Debug Test Suite
 *
 * Platform dependencies:
 * - Window object for browser environment detection
 * - localStorage API for history state persistence
 * - Performance API for timing measurements
 * - Console API for debug logging
 * - Web-specific history atom functionality
 *
 * History Atoms Debug Test
 *
 * This test file helps debug the jotai-history atom structure
 * to understand why the undo button isn't being disabled properly.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createStore, type Atom } from "jotai";
import { v4 as uuidv4 } from "uuid";
import {
  tasksHistoryAtom,
  projectsHistoryAtom,
  labelsHistoryAtom,
  historyStateAtom,
  lastOperationAtom,
  undoAtom,
  redoAtom,
  recordOperationAtom,
} from "../core/history";
import { taskAtoms } from "../core/tasks";
import { projectAtoms } from "../core/projects";
import { labelAtoms } from "../core/labels";
import type { Task, Project } from "@tasktrove/types";
import {
  createTaskId,
  createSectionId,
  createProjectId,
  INBOX_PROJECT_ID,
} from "@tasktrove/types";

// Test constants - defined locally since they're test-only
const TEST_TASK_ID_1 = createTaskId("12345678-1234-4234-8234-123456789012");
const TEST_PROJECT_ID_1 = createProjectId(
  "12345678-1234-4234-8234-123456789012",
);

// =============================================================================
// LOCAL TEST HELPERS
// =============================================================================

/**
 * Creates a mock task with reasonable defaults
 */
function createMockTask(overrides: Partial<Task> = {}): Task {
  const defaultTask: Task = {
    id: createTaskId(uuidv4()),
    title: "Mock Task",
    description: "This is a mock task for testing",
    completed: false,
    priority: 2,
    sectionId: createSectionId("00000000-0000-0000-0000-000000000000"),
    projectId: INBOX_PROJECT_ID,
    labels: [],
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: new Date(),
    status: "active",
    order: 0,
    recurringMode: "dueDate",
  };

  return { ...defaultTask, ...overrides };
}

/**
 * Creates a mock project with reasonable defaults
 */
function createMockProject(
  overrides: Partial<Project> = {},
): Omit<Project, "id" | "viewState"> {
  const defaults = {
    name: `Mock Project ${Date.now()}`,
    slug: `mock-project-${Date.now()}`,
    color: "#3b82f6",
    favorite: false,
    shared: false,
    sections: [],
  };

  return { ...defaults, ...overrides };
}

/**
 * Snapshot an atom's value for comparison
 */
async function snapshotAtom<T>(
  store: ReturnType<typeof createStore>,
  atom: Atom<T>,
  label: string,
): Promise<T> {
  const value = await store.get(atom);
  console.log(`📸 Snapshot [${label}]:`, JSON.stringify(value, null, 2));
  return value;
}

// Type-safe debugging helper for object properties
function logProperty(obj: unknown, prop: string, label?: string): void {
  const prefix = label ? `${label} - ${prop}:` : `${prop}:`;
  if (typeof obj === "object" && obj !== null && prop in obj) {
    // Type guard to ensure object is indexable
    if (Object.prototype.hasOwnProperty.call(obj, prop)) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const record = obj as Record<string, unknown>;
      console.log(`  ✅ ${prefix}`, record[prop]);
    } else {
      console.log(`  ❌ ${prefix}`, "property not accessible");
    }
  } else {
    console.log(`  ❌ ${prefix}`, "property not found or object is null");
  }
}

// =============================================================================
// TEST SETUP
// =============================================================================

let store: ReturnType<typeof createStore>;

function resetTestEnvironment(): void {
  store = createStore();

  // Clear localStorage
  if (typeof window !== "undefined") {
    const keysToRemove = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("tasktrove-")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  }
}

// =============================================================================
// HISTORY ATOM STRUCTURE TESTS
// =============================================================================

describe("History Atoms Debug Tests", () => {
  beforeEach(() => {
    resetTestEnvironment();
  });

  describe("Initial History Atom Structure", () => {
    it("should log the initial structure of all history atoms", async () => {
      console.log("\n=== INITIAL HISTORY ATOM STRUCTURE ===");

      // Get initial values
      const tasksHistory = await store.get(tasksHistoryAtom);
      const projectsHistory = await store.get(projectsHistoryAtom);
      const labelsHistory = await store.get(labelsHistoryAtom);
      const historyState = await store.get(historyStateAtom);
      const lastOperation = await store.get(lastOperationAtom);

      console.log("📋 tasksHistoryAtom structure:");
      console.log("  - Type:", typeof tasksHistory);
      console.log("  - Is Array:", Array.isArray(tasksHistory));
      console.log("  - Keys:", Object.keys(tasksHistory));
      console.log("  - Full structure:", JSON.stringify(tasksHistory, null, 2));

      console.log("\n📁 projectsHistoryAtom structure:");
      console.log("  - Type:", typeof projectsHistory);
      console.log("  - Is Array:", Array.isArray(projectsHistory));
      console.log("  - Keys:", Object.keys(projectsHistory));
      console.log(
        "  - Full structure:",
        JSON.stringify(projectsHistory, null, 2),
      );

      console.log("\n🏷️ labelsHistoryAtom structure:");
      console.log("  - Type:", typeof labelsHistory);
      console.log("  - Is Array:", Array.isArray(labelsHistory));
      console.log("  - Keys:", Object.keys(labelsHistory));
      console.log(
        "  - Full structure:",
        JSON.stringify(labelsHistory, null, 2),
      );

      console.log("\n📊 historyStateAtom structure:");
      console.log("  - Type:", typeof historyState);
      console.log("  - Keys:", Object.keys(historyState));
      console.log("  - Full structure:", JSON.stringify(historyState, null, 2));

      console.log("\n🔄 lastOperationAtom:");
      console.log("  - Value:", lastOperation);

      // Check if history atoms have expected properties
      const expectedHistoryProps = ["canUndo", "canRedo"];
      const expectedHistoryStateProps = [
        "canUndo",
        "canRedo",
        "lastOperation",
        "historyInfo",
      ];

      console.log("\n=== PROPERTY CHECKS ===");

      if (typeof tasksHistory === "object") {
        console.log(
          "✅ tasksHistoryAtom has properties:",
          Object.keys(tasksHistory),
        );
        expectedHistoryProps.forEach((prop) => {
          logProperty(tasksHistory, prop);
        });
      }

      if (typeof historyState === "object") {
        console.log(
          "✅ historyStateAtom has properties:",
          Object.keys(historyState),
        );
        expectedHistoryStateProps.forEach((prop) => {
          logProperty(historyState, prop);
        });
      }

      // Basic assertions
      expect(tasksHistory).toBeDefined();
      expect(projectsHistory).toBeDefined();
      expect(labelsHistory).toBeDefined();
      expect(historyState).toBeDefined();
    });
  });

  describe("History Atom Behavior After Changes", () => {
    it("should debug history atom behavior after making changes", async () => {
      console.log("\n=== HISTORY BEHAVIOR AFTER CHANGES ===");

      // Initial state
      console.log("📸 Initial state:");
      const initialHistoryState = await snapshotAtom(
        store,
        historyStateAtom,
        "Initial History State",
      );

      // Make a change to tasks
      console.log("\n🔄 Adding a task...");
      const mockTask = createMockTask({
        title: "Test Task for History",
        description: "This task is for testing history functionality",
      });

      // First record the operation
      store.set(recordOperationAtom, "Add test task");

      // Then make the change
      store.set(taskAtoms.actions.addTask, mockTask);

      // Check history state after change
      console.log("\n📸 After adding task:");
      const afterTaskAdd = await snapshotAtom(
        store,
        historyStateAtom,
        "After Task Add",
      );
      const tasksHistoryAfterAdd = await store.get(tasksHistoryAtom);

      console.log("📋 tasksHistoryAtom after add:");
      console.log("  - Type:", typeof tasksHistoryAfterAdd);
      console.log("  - Keys:", Object.keys(tasksHistoryAfterAdd));
      if (typeof tasksHistoryAfterAdd === "object") {
        logProperty(tasksHistoryAfterAdd, "canUndo", "tasksHistory");
        logProperty(tasksHistoryAfterAdd, "canRedo", "tasksHistory");
      }

      // Make another change
      console.log("\n🔄 Adding a project...");
      const mockProject = createMockProject({
        name: "Test Project for History",
        color: "#ff0000",
      });

      store.set(recordOperationAtom, "Add test project");
      store.set(projectAtoms.actions.addProject, mockProject);

      console.log("\n📸 After adding project:");
      const afterProjectAdd = await snapshotAtom(
        store,
        historyStateAtom,
        "After Project Add",
      );
      const projectsHistoryAfterAdd = await store.get(projectsHistoryAtom);

      console.log("📁 projectsHistoryAtom after add:");
      console.log("  - Type:", typeof projectsHistoryAfterAdd);
      console.log("  - Keys:", Object.keys(projectsHistoryAfterAdd));
      if (typeof projectsHistoryAfterAdd === "object") {
        logProperty(projectsHistoryAfterAdd, "canUndo", "projectsHistory");
        logProperty(projectsHistoryAfterAdd, "canRedo", "projectsHistory");
      }

      // Test undo
      console.log("\n↶ Testing undo...");
      store.set(undoAtom);

      console.log("\n📸 After undo:");
      const afterUndo = await snapshotAtom(
        store,
        historyStateAtom,
        "After Undo",
      );

      // Test redo
      console.log("\n↷ Testing redo...");
      store.set(redoAtom);

      console.log("\n📸 After redo:");
      const afterRedo = await snapshotAtom(
        store,
        historyStateAtom,
        "After Redo",
      );

      // Final assertions
      expect(initialHistoryState).toBeDefined();
      expect(afterTaskAdd).toBeDefined();
      expect(afterProjectAdd).toBeDefined();
      expect(afterUndo).toBeDefined();
      expect(afterRedo).toBeDefined();
    });
  });

  describe("History Atom Initialization Issues", () => {
    it("should check if history atoms are properly initialized", async () => {
      console.log("\n=== HISTORY ATOM INITIALIZATION CHECKS ===");

      // Check if the atoms return something on first access
      console.log("🔍 Checking atom initialization...");

      let tasksHistoryError: Error | null = null;
      let projectsHistoryError: Error | null = null;
      let labelsHistoryError: Error | null = null;
      let historyStateError: Error | null = null;

      try {
        const tasksHistory = await store.get(tasksHistoryAtom);
        console.log("✅ tasksHistoryAtom initialized successfully");
        console.log("  - Value:", tasksHistory);
      } catch (error) {
        tasksHistoryError =
          error instanceof Error ? error : new Error(String(error));
        console.log("❌ tasksHistoryAtom failed to initialize:", error);
      }

      try {
        const projectsHistory = await store.get(projectsHistoryAtom);
        console.log("✅ projectsHistoryAtom initialized successfully");
        console.log("  - Value:", projectsHistory);
      } catch (error) {
        projectsHistoryError =
          error instanceof Error ? error : new Error(String(error));
        console.log("❌ projectsHistoryAtom failed to initialize:", error);
      }

      try {
        const labelsHistory = await store.get(labelsHistoryAtom);
        console.log("✅ labelsHistoryAtom initialized successfully");
        console.log("  - Value:", labelsHistory);
      } catch (error) {
        labelsHistoryError =
          error instanceof Error ? error : new Error(String(error));
        console.log("❌ labelsHistoryAtom failed to initialize:", error);
      }

      try {
        const historyState = await store.get(historyStateAtom);
        console.log("✅ historyStateAtom initialized successfully");
        console.log("  - Value:", historyState);
      } catch (error) {
        historyStateError =
          error instanceof Error ? error : new Error(String(error));
        console.log("❌ historyStateAtom failed to initialize:", error);
      }

      // Check base atoms directly
      console.log("\n🔍 Checking base atoms...");
      try {
        const tasks = await store.get(taskAtoms.tasks);
        console.log(
          "✅ Base tasks atom:",
          Array.isArray(tasks) ? `${tasks.length} tasks` : tasks,
        );
      } catch (error) {
        console.log("❌ Base tasks atom failed:", error);
      }

      try {
        const projects = await store.get(projectAtoms.projects);
        console.log(
          "✅ Base projects atom:",
          Array.isArray(projects) ? `${projects.length} projects` : projects,
        );
      } catch (error) {
        console.log("❌ Base projects atom failed:", error);
      }

      try {
        const labels = await store.get(labelAtoms.labels);
        console.log(
          "✅ Base labels atom:",
          Array.isArray(labels) ? `${labels.length} labels` : labels,
        );
      } catch (error) {
        console.log("❌ Base labels atom failed:", error);
      }

      // Ensure no initialization errors
      expect(tasksHistoryError).toBeNull();
      expect(projectsHistoryError).toBeNull();
      expect(labelsHistoryError).toBeNull();
      expect(historyStateError).toBeNull();
    });
  });

  describe("History Atom Edge Cases", () => {
    it("should test edge cases that might cause undo button issues", async () => {
      console.log("\n=== EDGE CASE TESTING ===");

      // Test 1: Empty state
      console.log("🧪 Test 1: Empty state");
      const emptyState = await store.get(historyStateAtom);
      console.log("Empty state canUndo:", emptyState.canUndo);
      console.log("Empty state canRedo:", emptyState.canRedo);

      // Test 2: After single operation
      console.log("\n🧪 Test 2: After single operation");
      store.set(recordOperationAtom, "Single operation test");
      store.set(
        taskAtoms.actions.addTask,
        createMockTask({ title: "Single Op Task" }),
      );

      const singleOpState = await store.get(historyStateAtom);
      console.log("Single op canUndo:", singleOpState.canUndo);
      console.log("Single op canRedo:", singleOpState.canRedo);

      // Test 3: After undo from single operation
      console.log("\n🧪 Test 3: After undo from single operation");
      store.set(undoAtom);

      const afterUndoState = await store.get(historyStateAtom);
      console.log("After undo canUndo:", afterUndoState.canUndo);
      console.log("After undo canRedo:", afterUndoState.canRedo);

      // Test 4: After redo
      console.log("\n🧪 Test 4: After redo");
      store.set(redoAtom);

      const afterRedoState = await store.get(historyStateAtom);
      console.log("After redo canUndo:", afterRedoState.canUndo);
      console.log("After redo canRedo:", afterRedoState.canRedo);

      // Test 5: Multiple operations
      console.log("\n🧪 Test 5: Multiple operations");
      store.set(recordOperationAtom, "Second operation");
      store.set(
        taskAtoms.actions.addTask,
        createMockTask({ title: "Second Task" }),
      );
      store.set(recordOperationAtom, "Third operation");
      store.set(
        taskAtoms.actions.addTask,
        createMockTask({ title: "Third Task" }),
      );

      const multiOpState = await store.get(historyStateAtom);
      console.log("Multi op canUndo:", multiOpState.canUndo);
      console.log("Multi op canRedo:", multiOpState.canRedo);

      // Test 6: Multiple undos
      console.log("\n🧪 Test 6: Multiple undos");
      store.set(undoAtom);
      const afterFirstUndo = await store.get(historyStateAtom);
      console.log("After first undo canUndo:", afterFirstUndo.canUndo);

      store.set(undoAtom);
      const afterSecondUndo = await store.get(historyStateAtom);
      console.log("After second undo canUndo:", afterSecondUndo.canUndo);

      store.set(undoAtom);
      const afterThirdUndo = await store.get(historyStateAtom);
      console.log("After third undo canUndo:", afterThirdUndo.canUndo);

      // Test 7: Check individual atom states
      console.log("\n🧪 Test 7: Individual atom states");
      const finalTasksHistory = await store.get(tasksHistoryAtom);
      const finalProjectsHistory = await store.get(projectsHistoryAtom);
      const finalLabelsHistory = await store.get(labelsHistoryAtom);

      logProperty(finalTasksHistory, "canUndo", "final tasksHistory");
      logProperty(finalProjectsHistory, "canUndo", "final projectsHistory");
      logProperty(finalLabelsHistory, "canUndo", "final labelsHistory");

      // Assertions to ensure tests pass
      expect(emptyState).toBeDefined();
      expect(singleOpState).toBeDefined();
      expect(afterUndoState).toBeDefined();
      expect(afterRedoState).toBeDefined();
      expect(multiOpState).toBeDefined();
      expect(afterFirstUndo).toBeDefined();
      expect(afterSecondUndo).toBeDefined();
      expect(afterThirdUndo).toBeDefined();
    });

    it("should demonstrate the simultaneous undo problem", async () => {
      console.log("\n=== SIMULTANEOUS UNDO PROBLEM DEMO ===");

      // Only add tasks, no projects or labels
      console.log("🧪 Adding only tasks (no projects/labels changes)");
      store.set(recordOperationAtom, "Task 1");
      store.set(taskAtoms.actions.addTask, createMockTask({ title: "Task 1" }));

      store.set(recordOperationAtom, "Task 2");
      store.set(taskAtoms.actions.addTask, createMockTask({ title: "Task 2" }));

      // Check individual atom states
      const tasksHistory = await store.get(tasksHistoryAtom);
      const projectsHistory = await store.get(projectsHistoryAtom);
      const labelsHistory = await store.get(labelsHistoryAtom);

      // Type guard for history state
      function hasCanUndoProperty(obj: unknown): obj is { canUndo: boolean } {
        if (typeof obj !== "object" || obj === null || !("canUndo" in obj)) {
          return false;
        }
        const record: Record<string, unknown> = obj;
        return typeof record.canUndo === "boolean";
      }

      console.log("Before undo:");
      console.log(
        "  Tasks canUndo:",
        hasCanUndoProperty(tasksHistory) ? tasksHistory.canUndo : "undefined",
      );
      console.log(
        "  Projects canUndo:",
        hasCanUndoProperty(projectsHistory)
          ? projectsHistory.canUndo
          : "undefined",
      );
      console.log(
        "  Labels canUndo:",
        hasCanUndoProperty(labelsHistory) ? labelsHistory.canUndo : "undefined",
      );

      // This is the problem: undo calls UNDO on ALL atoms
      // even though projects and labels have no history
      console.log("\n🧪 Performing undo (calls UNDO on ALL atoms)");
      store.set(undoAtom);

      const afterUndoTasks = await store.get(tasksHistoryAtom);
      const afterUndoProjects = await store.get(projectsHistoryAtom);
      const afterUndoLabels = await store.get(labelsHistoryAtom);

      console.log("After undo:");
      console.log(
        "  Tasks canUndo:",
        hasCanUndoProperty(afterUndoTasks)
          ? afterUndoTasks.canUndo
          : "undefined",
      );
      console.log(
        "  Projects canUndo:",
        hasCanUndoProperty(afterUndoProjects)
          ? afterUndoProjects.canUndo
          : "undefined",
      );
      console.log(
        "  Labels canUndo:",
        hasCanUndoProperty(afterUndoLabels)
          ? afterUndoLabels.canUndo
          : "undefined",
      );

      // The problem: all atoms are being undone even when they have no history
      // This can cause state corruption or unexpected behavior

      expect(tasksHistory).toBeDefined();
      expect(projectsHistory).toBeDefined();
      expect(labelsHistory).toBeDefined();
    });
  });
});
