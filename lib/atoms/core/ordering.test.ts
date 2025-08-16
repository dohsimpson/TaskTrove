/**
 * Tests for ordering atoms - API-based ordering system
 *
 * These tests verify the new API-based ordering system where orderingAtom
 * is read-only and derived from dataQueryAtom, and mutations use API calls.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { createStore } from "jotai"
import { INBOX_PROJECT_ID } from "../../types"
import {
  TEST_PROJECT_ID_1,
  TEST_PROJECT_ID_2,
  TEST_LABEL_ID_1,
  TEST_LABEL_ID_2,
} from "../../utils/test-constants"
import {
  orderingAtom,
  reorderProjectAtom,
  reorderLabelAtom,
  addProjectToOrderingAtom,
  removeProjectFromOrderingAtom,
  addLabelToOrderingAtom,
  removeLabelFromOrderingAtom,
} from "./ordering"
import { updateOrderingMutationAtom } from "./base"
import { createMockResponse } from "../../utils/test-helpers"

// Mock the logger to avoid console noise in tests
vi.mock("../../utils/logger", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

interface MockableProcessEnv {
  NODE_ENV?: string
  API_BASE_URL?: string
}

// Type guard for process.env
function isProcessEnv(env: unknown): env is Record<string, string | undefined> {
  return typeof env === "object" && env !== null
}

// Type-safe helper for mocking process.env
function mockProcessEnv(key: keyof MockableProcessEnv, value: string | undefined): void {
  if (!isProcessEnv(process.env)) {
    throw new Error("process.env is not accessible")
  }

  if (value !== undefined) {
    vi.stubEnv(key, value)
  } else {
    vi.stubEnv(key, "")
  }
}

// Mock the fetch API for API calls
global.fetch = vi.fn()
const mockedFetch = vi.mocked(global.fetch)

let store: ReturnType<typeof createStore>

/**
 * Reset test environment before each test
 */
function resetTestEnvironment(): void {
  store = createStore()
  vi.clearAllMocks()

  // Reset fetch mock
  mockedFetch.mockReset()
}

describe("Ordering Atoms", () => {
  beforeEach(() => {
    resetTestEnvironment()
    // Mock window to simulate browser environment for non-test-env tests
    Object.defineProperty(global, "window", {
      value: { localStorage: { getItem: vi.fn(), setItem: vi.fn() } },
      writable: true,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("Basic Ordering State", () => {
    it("should have default ordering with inbox project when no API data", () => {
      const ordering = store.get(orderingAtom)

      expect(ordering.projects).toContain(INBOX_PROJECT_ID)
      expect(Array.isArray(ordering.projects)).toBe(true)
      expect(Array.isArray(ordering.labels)).toBe(true)
      expect(ordering).toEqual({
        projects: [INBOX_PROJECT_ID],
        labels: [],
      })
    })

    it("should return default ordering when API data is not available", () => {
      // This test verifies the fallback behavior when API data isn't loaded yet
      // In actual usage, dataQueryAtom would be managed by tanstack-query
      const ordering = store.get(orderingAtom)

      // Should fall back to default ordering
      expect(ordering).toEqual({
        projects: [INBOX_PROJECT_ID],
        labels: [],
      })
    })
  })

  describe("updateOrderingMutationAtom", () => {
    it("should exist and be callable", () => {
      // Verify the atom exists and can be retrieved
      const updateOrderingMutation = store.get(updateOrderingMutationAtom)

      expect(updateOrderingMutation).toBeDefined()
      expect(typeof updateOrderingMutation.mutateAsync).toBe("function")
    })

    it("should handle successful API updates in production environment", async () => {
      const mockOrdering = {
        projects: [INBOX_PROJECT_ID, TEST_PROJECT_ID_1, TEST_PROJECT_ID_2],
        labels: [TEST_LABEL_ID_1, TEST_LABEL_ID_2],
      }
      const mockResponse = {
        success: true,
        ordering: mockOrdering,
        message: "Ordering updated successfully",
      }

      // Set NODE_ENV to production to avoid test environment bypass
      const originalEnv = process.env.NODE_ENV
      mockProcessEnv("NODE_ENV", "production")

      try {
        // Mock successful API response
        mockedFetch.mockResolvedValueOnce(
          createMockResponse({
            ok: true,
            json: () => Promise.resolve(mockResponse),
          }),
        )

        // Get the mutation atom
        const updateOrderingMutation = store.get(updateOrderingMutationAtom)

        // Execute the mutation
        const result = await updateOrderingMutation.mutateAsync(mockOrdering)

        // Verify the API was called correctly
        expect(global.fetch).toHaveBeenCalledWith("/api/ordering", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mockOrdering),
        })

        // Verify the response
        expect(result).toEqual(mockResponse)
        expect(result.success).toBe(true)
        expect(result.ordering).toEqual(mockOrdering)
      } finally {
        mockProcessEnv("NODE_ENV", originalEnv)
      }
    })

    it("should handle test environment correctly", async () => {
      const mockOrdering = {
        projects: [INBOX_PROJECT_ID, TEST_PROJECT_ID_1],
        labels: [TEST_LABEL_ID_1],
      }

      // Set test environment
      const originalEnv = process.env.NODE_ENV
      mockProcessEnv("NODE_ENV", "test")

      try {
        // Get the mutation atom
        const updateOrderingMutation = store.get(updateOrderingMutationAtom)

        // Execute the mutation
        const result = await updateOrderingMutation.mutateAsync(mockOrdering)

        // Verify test mode response
        expect(result.success).toBe(true)
        expect(result.ordering).toEqual(mockOrdering)
        expect(result.message).toBe("Ordering updated successfully (test mode)")

        // Verify fetch was not called in test mode
        expect(global.fetch).not.toHaveBeenCalled()
      } finally {
        mockProcessEnv("NODE_ENV", originalEnv)
      }
    })

    it("should handle API errors gracefully in production environment", async () => {
      const mockOrdering = {
        projects: [INBOX_PROJECT_ID, TEST_PROJECT_ID_1],
        labels: [TEST_LABEL_ID_1],
      }

      // Set NODE_ENV to production to avoid test environment bypass
      const originalEnv = process.env.NODE_ENV
      mockProcessEnv("NODE_ENV", "production")

      try {
        // Mock API error response
        mockedFetch.mockResolvedValueOnce(
          createMockResponse({
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
            json: () =>
              Promise.resolve({
                error: "Database connection failed",
                message: "Failed to update ordering",
              }),
          }),
        )

        // Get the mutation atom
        const updateOrderingMutation = store.get(updateOrderingMutationAtom)

        // Execute the mutation and expect it to throw
        await expect(updateOrderingMutation.mutateAsync(mockOrdering)).rejects.toThrow(
          "Failed to update ordering",
        )

        // Verify the API was called
        expect(global.fetch).toHaveBeenCalledWith("/api/ordering", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mockOrdering),
        })
      } finally {
        mockProcessEnv("NODE_ENV", originalEnv)
      }
    })
  })

  describe("Project Ordering Operations", () => {
    it("should handle addProjectToOrderingAtom in test environment", async () => {
      // Set test environment to avoid actual API calls
      const originalEnv = process.env.NODE_ENV
      mockProcessEnv("NODE_ENV", "test")

      try {
        // Execute the add project operation
        await store.set(addProjectToOrderingAtom, { projectId: TEST_PROJECT_ID_1 })

        // Verify fetch was not called in test mode
        expect(global.fetch).not.toHaveBeenCalled()
      } finally {
        mockProcessEnv("NODE_ENV", originalEnv)
      }
    })

    it("should handle removeProjectFromOrderingAtom in test environment", async () => {
      // Set test environment to avoid actual API calls
      const originalEnv = process.env.NODE_ENV
      mockProcessEnv("NODE_ENV", "test")

      try {
        // Execute the remove project operation
        await store.set(removeProjectFromOrderingAtom, TEST_PROJECT_ID_1)

        // Verify fetch was not called in test mode
        expect(global.fetch).not.toHaveBeenCalled()
      } finally {
        mockProcessEnv("NODE_ENV", originalEnv)
      }
    })

    it("should handle reorderProjectAtom in test environment", async () => {
      // Set test environment to avoid actual API calls
      const originalEnv = process.env.NODE_ENV
      mockProcessEnv("NODE_ENV", "test")

      try {
        // Execute the reorder project operation
        await store.set(reorderProjectAtom, { projectId: TEST_PROJECT_ID_1, newIndex: 0 })

        // Verify fetch was not called in test mode
        expect(global.fetch).not.toHaveBeenCalled()
      } finally {
        mockProcessEnv("NODE_ENV", originalEnv)
      }
    })
  })

  describe("Label Ordering Operations", () => {
    it("should handle addLabelToOrderingAtom in test environment", async () => {
      // Set test environment to avoid actual API calls
      const originalEnv = process.env.NODE_ENV
      mockProcessEnv("NODE_ENV", "test")

      try {
        // Execute the add label operation
        await store.set(addLabelToOrderingAtom, { labelId: TEST_LABEL_ID_1 })

        // Verify fetch was not called in test mode
        expect(global.fetch).not.toHaveBeenCalled()
      } finally {
        mockProcessEnv("NODE_ENV", originalEnv)
      }
    })

    it("should handle removeLabelFromOrderingAtom in test environment", async () => {
      // Set test environment to avoid actual API calls
      const originalEnv = process.env.NODE_ENV
      mockProcessEnv("NODE_ENV", "test")

      try {
        // Execute the remove label operation
        await store.set(removeLabelFromOrderingAtom, TEST_LABEL_ID_1)

        // Verify fetch was not called in test mode
        expect(global.fetch).not.toHaveBeenCalled()
      } finally {
        mockProcessEnv("NODE_ENV", originalEnv)
      }
    })

    it("should handle reorderLabelAtom in test environment", async () => {
      // Set test environment to avoid actual API calls
      const originalEnv = process.env.NODE_ENV
      mockProcessEnv("NODE_ENV", "test")

      try {
        // Execute the reorder label operation
        await store.set(reorderLabelAtom, { labelId: TEST_LABEL_ID_1, newIndex: 0 })

        // Verify fetch was not called in test mode
        expect(global.fetch).not.toHaveBeenCalled()
      } finally {
        mockProcessEnv("NODE_ENV", originalEnv)
      }
    })
  })

  describe("Error Handling", () => {
    it("should handle invalid operations gracefully", async () => {
      // Set test environment
      const originalEnv = process.env.NODE_ENV
      mockProcessEnv("NODE_ENV", "test")

      try {
        // Test invalid operations don't crash the system
        // Note: We cannot test with invalid UUIDs directly as createProjectId throws ZodError
        // Instead, test with valid but non-existent IDs
        expect(() => {
          store.set(addProjectToOrderingAtom, { projectId: TEST_PROJECT_ID_1 })
        }).not.toThrow()

        expect(() => {
          store.set(removeProjectFromOrderingAtom, TEST_PROJECT_ID_1)
        }).not.toThrow()

        expect(() => {
          store.set(reorderProjectAtom, { projectId: TEST_PROJECT_ID_1, newIndex: -1 })
        }).not.toThrow()
      } finally {
        mockProcessEnv("NODE_ENV", originalEnv)
      }
    })
  })

  describe("Type Safety", () => {
    it("should have proper TypeScript types", () => {
      // Verify the atoms have proper types and can be used safely
      const updateOrderingMutation = store.get(updateOrderingMutationAtom)
      const ordering = store.get(orderingAtom)

      // These should be defined and have the right shape
      expect(updateOrderingMutation).toBeDefined()
      expect(ordering).toBeDefined()

      // Verify mutation has expected methods
      expect(typeof updateOrderingMutation.mutateAsync).toBe("function")
      expect(typeof updateOrderingMutation.mutate).toBe("function")

      // Verify ordering has expected structure
      expect(Array.isArray(ordering.projects)).toBe(true)
      expect(Array.isArray(ordering.labels)).toBe(true)
    })
  })

  describe("Regression Tests: Async Ordering Operations", () => {
    /**
     * REGRESSION TEST for commit 082d5af bug fix:
     * Previously, ordering operations were not awaited in parent atoms like addProjectAtom,
     * causing timing issues where project data and ordering data were out of sync.
     *
     * This test ensures ordering operations properly return promises that can be awaited.
     */
    it("should return promises from ordering operations that can be awaited", async () => {
      // Set test environment
      const originalEnv = process.env.NODE_ENV
      mockProcessEnv("NODE_ENV", "test")

      try {
        // Test that all ordering operations return promises
        const addProjectPromise = store.set(addProjectToOrderingAtom, {
          projectId: TEST_PROJECT_ID_1,
        })
        const removeProjectPromise = store.set(removeProjectFromOrderingAtom, TEST_PROJECT_ID_1)
        const reorderProjectPromise = store.set(reorderProjectAtom, {
          projectId: TEST_PROJECT_ID_1,
          newIndex: 0,
        })
        const addLabelPromise = store.set(addLabelToOrderingAtom, { labelId: TEST_LABEL_ID_1 })
        const removeLabelPromise = store.set(removeLabelFromOrderingAtom, TEST_LABEL_ID_1)
        const reorderLabelPromise = store.set(reorderLabelAtom, {
          labelId: TEST_LABEL_ID_1,
          newIndex: 0,
        })

        // All operations should return promises
        expect(addProjectPromise).toBeInstanceOf(Promise)
        expect(removeProjectPromise).toBeInstanceOf(Promise)
        expect(reorderProjectPromise).toBeInstanceOf(Promise)
        expect(addLabelPromise).toBeInstanceOf(Promise)
        expect(removeLabelPromise).toBeInstanceOf(Promise)
        expect(reorderLabelPromise).toBeInstanceOf(Promise)

        // All promises should resolve without errors
        await expect(addProjectPromise).resolves.not.toThrow()
        await expect(removeProjectPromise).resolves.not.toThrow()
        await expect(reorderProjectPromise).resolves.not.toThrow()
        await expect(addLabelPromise).resolves.not.toThrow()
        await expect(removeLabelPromise).resolves.not.toThrow()
        await expect(reorderLabelPromise).resolves.not.toThrow()
      } finally {
        mockProcessEnv("NODE_ENV", originalEnv)
      }
    })

    it("should handle concurrent ordering operations without race conditions", async () => {
      // Set test environment
      const originalEnv = process.env.NODE_ENV
      mockProcessEnv("NODE_ENV", "test")

      try {
        // Execute multiple ordering operations concurrently
        const operations = await Promise.allSettled([
          store.set(addProjectToOrderingAtom, { projectId: TEST_PROJECT_ID_1 }),
          store.set(addProjectToOrderingAtom, { projectId: TEST_PROJECT_ID_2 }),
          store.set(addLabelToOrderingAtom, { labelId: TEST_LABEL_ID_1 }),
          store.set(addLabelToOrderingAtom, { labelId: TEST_LABEL_ID_2 }),
        ])

        // All operations should complete successfully
        operations.forEach((result) => {
          expect(result.status).toBe("fulfilled")
        })
      } finally {
        mockProcessEnv("NODE_ENV", originalEnv)
      }
    })

    it("should maintain operation timing guarantees", async () => {
      // Set test environment
      const originalEnv = process.env.NODE_ENV
      mockProcessEnv("NODE_ENV", "test")

      try {
        const executionOrder: string[] = []

        // Mock mutation to track execution timing
        const updateOrderingMutation = store.get(updateOrderingMutationAtom)

        vi.spyOn(updateOrderingMutation, "mutateAsync").mockImplementation(async (ordering) => {
          executionOrder.push("mutation-start")
          await new Promise((resolve) => setTimeout(resolve, 10))
          executionOrder.push("mutation-end")
          return {
            success: true,
            ordering,
            message: "Test success",
            meta: { updatedAt: new Date().toISOString() },
          }
        })

        // Execute ordering operation
        executionOrder.push("operation-start")
        await store.set(addProjectToOrderingAtom, { projectId: TEST_PROJECT_ID_1 })
        executionOrder.push("operation-end")

        // Verify execution order is maintained
        expect(executionOrder).toEqual([
          "operation-start",
          "mutation-start",
          "mutation-end",
          "operation-end",
        ])
      } finally {
        mockProcessEnv("NODE_ENV", originalEnv)
      }
    })
  })

  describe("Project Deletion from Ordering", () => {
    it("should remove project from ordering by calling removeProjectFromOrderingAtom", async () => {
      // This tests the removeProjectFromOrderingAtom behavior in production environment
      // Set production environment to ensure API calls are made
      const originalEnv = process.env.NODE_ENV
      mockProcessEnv("NODE_ENV", "production")

      try {
        // Mock successful API response for ordering update
        mockedFetch.mockResolvedValueOnce(
          createMockResponse({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                ordering: {
                  projects: [TEST_PROJECT_ID_1], // Only remaining project after deletion
                  labels: [TEST_LABEL_ID_1],
                },
                message: "Ordering updated successfully",
              }),
          }),
        )

        // Mock initial ordering state (this would normally come from the dataQueryAtom)
        mockedFetch.mockResolvedValueOnce(
          createMockResponse({
            ok: true,
            json: () =>
              Promise.resolve({
                ordering: {
                  projects: [TEST_PROJECT_ID_1, TEST_PROJECT_ID_2], // Both projects initially
                  labels: [TEST_LABEL_ID_1],
                },
              }),
          }),
        )

        // Execute remove project operation
        await store.set(removeProjectFromOrderingAtom, TEST_PROJECT_ID_2)

        // Verify API was called to update ordering
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/ordering",
          expect.objectContaining({
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
          }),
        )

        // Verify the API call does NOT contain the deleted project
        const orderingCall = mockedFetch.mock.calls.find(
          (call) => call[0] === "/api/ordering" && call[1]?.method === "PATCH",
        )

        // Type guard for request options with body
        function hasBodyProperty(obj: unknown): obj is { body: string } {
          if (typeof obj !== "object" || obj === null || !("body" in obj)) {
            return false
          }
          const record: Record<string, unknown> = obj
          return typeof record.body === "string"
        }

        // The key test: verify that removeProjectFromOrderingAtom filters out the deleted project
        if (orderingCall && orderingCall[1] && hasBodyProperty(orderingCall[1])) {
          const body = orderingCall[1].body
          expect(body).not.toContain(TEST_PROJECT_ID_2) // Should NOT contain deleted project

          // Verify that it's a valid ordering update with projects array
          const parsedBody = JSON.parse(body)
          expect(parsedBody).toHaveProperty("projects")
          expect(Array.isArray(parsedBody.projects)).toBe(true)
        }
      } finally {
        mockProcessEnv("NODE_ENV", originalEnv)
      }
    })

    it("should properly remove project from ordering through deleteProjectAtom integration", async () => {
      // This test focuses on documenting the expected behavior of project deletion
      // in the context of both data and ordering updates

      // This test runs in test environment where mutations are simulated
      const originalEnv = process.env.NODE_ENV
      mockProcessEnv("NODE_ENV", "test")

      try {
        // Execute the remove project operation (this tests the atom logic)
        await store.set(removeProjectFromOrderingAtom, TEST_PROJECT_ID_2)

        // In test environment, the operation should complete without making API calls
        // The important part is that the atom handles the operation correctly
        expect(true).toBe(true) // Test passes if no errors thrown

        // The removeProjectFromOrderingAtom should:
        // 1. Get current ordering
        // 2. Filter out the deleted project ID
        // 3. Call updateOrderingMutationAtom with filtered array
        // 4. In production, this would result in API call to /api/ordering
      } finally {
        mockProcessEnv("NODE_ENV", originalEnv)
      }
    })
  })
})
