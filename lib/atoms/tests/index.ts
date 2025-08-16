/**
 * TaskTrove Jotai Atoms Test Suite
 *
 * Main entry point for all testing utilities and integration tests.
 * Import this module to access all testing functionality.
 */

// Export main test runner and utilities
export { resetTestEnvironment, createSampleData } from "./basic-integration.test"

// Export test helpers
export {
  testHelpers,
  // Data factories
  createMockTask,
  createMockProject,
  createMockLabel,
  createMockTaskSet,
  // Assertions
  assert,
  assertLength,
  assertHasProperties,
  assertEqual,
  assertType,
  assertThrows,
  assertDoesNotThrow,
  // Timing utilities
  measureTime,
  assertCompletesWithin,
  // Atom utilities
  createTestStore,
  waitForAtomValue,
  snapshotAtom,
  // General utilities
  deepEqual,
  generateTestId,
  wait,
  range,
  shuffle,
  // Linked-list utilities
  validateLinkedListIntegrity,
  linkedListToArray,
  // Performance testing
  testPerformanceWithLargeDataset,
} from "./test-helpers"

// =============================================================================
// QUICK ACCESS FUNCTIONS
// =============================================================================

/**
 * Quick test runner for browser console
 * Usage: import { quickTest } from './lib/atoms/tests'; quickTest();
 */
export async function quickTest(): Promise<void> {
  console.log("Running basic integration tests...")
  // Basic integration tests are now in Vitest format
  console.log("To run tests, use: pnpm test lib/atoms/tests/basic-integration.test.ts")
}

/**
 * Quick reset for testing
 * Usage: import { quickReset } from './lib/atoms/tests'; quickReset();
 */
export async function quickReset(): Promise<void> {
  const { resetTestEnvironment } = await import("./basic-integration.test")
  resetTestEnvironment()
}

/**
 * Quick sample data creation
 * Usage: import { quickSetup } from './lib/atoms/tests'; quickSetup();
 */
export async function quickSetup(): Promise<void> {
  const { resetTestEnvironment, createSampleData } = await import("./basic-integration.test")
  resetTestEnvironment()
  createSampleData()
}

// =============================================================================
// BROWSER CONSOLE HELPERS
// =============================================================================

// Define interface for window extension
interface TaskTroveTestSuite {
  quickTest: () => Promise<void>
  quickReset: () => void
  quickSetup: () => void
}

declare global {
  interface Window {
    TaskTroveTestSuite: TaskTroveTestSuite
  }
}

// Make testing functions available in browser console
if (typeof window !== "undefined") {
  window.TaskTroveTestSuite = {
    quickTest,
    quickReset,
    quickSetup,
  }

  console.log("🧪 TaskTrove Test Suite loaded")
  console.log("Available functions:")
  console.log("  - window.TaskTroveTestSuite.quickTest()")
  console.log("  - window.TaskTroveTestSuite.quickReset()")
  console.log("  - window.TaskTroveTestSuite.quickSetup()")
}
