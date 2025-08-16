import { describe, it, expect, beforeEach } from "vitest"
import { createStore } from "jotai"
import { currentRouteContextAtom, setPathnameAtom } from "../ui/navigation"
// Removed unused imports

/**
 * Test suite for currentRouteContextAtom
 *
 * This atom parses the current pathname and provides structured
 * route context information that was previously handled by
 * manual functions in MainLayoutWrapper.
 */

describe("currentRouteContextAtom", () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createStore()
  })

  describe("standard views", () => {
    it("should parse today route correctly", () => {
      // Set pathname
      store.set(setPathnameAtom, "/today")

      const context = store.get(currentRouteContextAtom)

      expect(context).toEqual({
        pathname: "/today",
        viewId: "today",
        routeType: "standard",
      })
    })

    it("should parse inbox route correctly", () => {
      store.set(setPathnameAtom, "/inbox")

      const context = store.get(currentRouteContextAtom)

      expect(context).toEqual({
        pathname: "/inbox",
        viewId: "inbox",
        routeType: "standard",
      })
    })

    it("should parse upcoming route correctly", () => {
      store.set(setPathnameAtom, "/upcoming")

      const context = store.get(currentRouteContextAtom)

      expect(context).toEqual({
        pathname: "/upcoming",
        viewId: "upcoming",
        routeType: "standard",
      })
    })

    it("should handle root path as today", () => {
      store.set(setPathnameAtom, "/")

      const context = store.get(currentRouteContextAtom)

      expect(context).toEqual({
        pathname: "/",
        viewId: "today",
        routeType: "standard",
      })
    })
  })

  describe("project routes", () => {
    it("should parse project route correctly", () => {
      store.set(setPathnameAtom, "/projects/87654321-4321-4321-8321-210987654321")

      const context = store.get(currentRouteContextAtom)

      expect(context).toEqual({
        pathname: "/projects/87654321-4321-4321-8321-210987654321",
        viewId: "87654321-4321-4321-8321-210987654321", // ViewId is now directly the ProjectId
        routeType: "project",
      })
    })

    it("should handle project routes with special characters", () => {
      const testProjectId = "12345678-1234-1234-8234-123456789012"
      store.set(setPathnameAtom, `/projects/${testProjectId}`)

      const context = store.get(currentRouteContextAtom)

      expect(context).toEqual({
        pathname: `/projects/${testProjectId}`,
        viewId: testProjectId, // ViewId is now directly the ProjectId
        routeType: "project",
      })
    })
  })

  describe("label routes", () => {
    it("should parse label route correctly and fallback when no labels are available", () => {
      store.set(setPathnameAtom, "/labels/urgent")

      const context = store.get(currentRouteContextAtom)

      // Since labels atom returns empty array in test environment,
      // should fallback to 'all' view
      expect(context).toEqual({
        pathname: "/labels/urgent",
        viewId: "all", // Fallback to 'all' view when label not found
        routeType: "label",
      })
    })

    it("should handle label routes with encoded characters", () => {
      store.set(setPathnameAtom, "/labels/high%20priority")

      const context = store.get(currentRouteContextAtom)

      expect(context).toEqual({
        pathname: "/labels/high%20priority",
        viewId: "all", // Fallback when labels not available in test
        routeType: "label",
      })
    })
  })

  // Filter routes have been removed - not supported in the new system

  describe("edge cases", () => {
    it("should handle malformed routes gracefully", () => {
      store.set(setPathnameAtom, "/unknown-route")

      const context = store.get(currentRouteContextAtom)

      // Should default to standard route type for unknown routes
      expect(context).toEqual({
        pathname: "/unknown-route",
        viewId: "unknown-route",
        routeType: "standard",
      })
    })

    it("should handle empty pathname parts", () => {
      store.set(setPathnameAtom, "/projects/")

      const context = store.get(currentRouteContextAtom)

      expect(context).toEqual({
        pathname: "/projects/",
        viewId: "projects",
        routeType: "standard",
      })
    })

    it("should handle nested project routes", () => {
      store.set(setPathnameAtom, "/projects/87654321-4321-4321-8321-210987654321/settings")

      const context = store.get(currentRouteContextAtom)

      // Should only use the first segment after /projects/
      expect(context).toEqual({
        pathname: "/projects/87654321-4321-4321-8321-210987654321/settings",
        viewId: "87654321-4321-4321-8321-210987654321", // ViewId is now directly the ProjectId
        routeType: "project",
      })
    })
  })

  describe("type safety", () => {
    it("should return correct types", () => {
      store.set(setPathnameAtom, "/today")
      const context = store.get(currentRouteContextAtom)

      expect(typeof context.pathname).toBe("string")
      expect(typeof context.viewId).toBe("string")
      expect(typeof context.routeType).toBe("string")
    })

    it("should have consistent viewId format for project routes", () => {
      const testProjectId = "11111111-2222-3333-8444-555555555555"
      store.set(setPathnameAtom, `/projects/${testProjectId}`)
      const context = store.get(currentRouteContextAtom)

      if (context.routeType === "project") {
        // ViewId is now directly the ProjectId (no prefix)
        expect(context.viewId).toBe(testProjectId)
      }
    })

    it("should have consistent viewId format for label routes", () => {
      store.set(setPathnameAtom, "/labels/urgent")
      const context = store.get(currentRouteContextAtom)

      if (context.routeType === "label") {
        // Should fallback to 'all' view when labels not available in test
        expect(context.viewId).toBe("all")
      }
    })
  })

  describe("reactivity", () => {
    it("should be reactive to pathname changes", () => {
      // Set initial state
      store.set(setPathnameAtom, "/today")
      const context = store.get(currentRouteContextAtom)
      expect(context.viewId).toBe("today")

      // Change pathname and verify atom updates
      store.set(setPathnameAtom, "/inbox")
      const newContext = store.get(currentRouteContextAtom)
      expect(newContext.viewId).toBe("inbox")
    })
  })

  describe("compatibility with existing code", () => {
    it("should provide all data that getCurrentView() provided", () => {
      store.set(setPathnameAtom, "/today")
      const context = store.get(currentRouteContextAtom)

      // Should provide viewId (equivalent to getCurrentView())
      expect(context.viewId).toBeDefined()
      expect(typeof context.viewId).toBe("string")
    })

    it("should match new ViewId logic for projects", () => {
      const testProjectId = "abcdef12-1234-1234-8234-123456789abc"
      store.set(setPathnameAtom, `/projects/${testProjectId}`)
      const context = store.get(currentRouteContextAtom)

      if (context.pathname.startsWith("/projects/")) {
        const expectedProjectId = context.pathname.split("/")[2]
        // ViewId is now directly the ProjectId (no prefix)
        expect(context.viewId).toBe(expectedProjectId)
      }
    })
  })
})
