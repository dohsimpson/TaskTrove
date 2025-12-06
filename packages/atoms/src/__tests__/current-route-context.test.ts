/**
 * ⚠️  WEB API DEPENDENT - Current Route Context Test Suite
 *
 * Platform dependencies:
 * - Web URL parsing and pathname handling
 * - Browser routing and navigation state
 * - Web-specific route context management
 * - URL encoding/decoding for route parameters
 *
 * Test suite for currentRouteContextAtom
 *
 * This atom parses the current pathname and provides structured
 * route context information that was previously handled by
 * manual functions in MainLayoutWrapper.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createStore } from "jotai";
import { currentRouteContextAtom, setPathnameAtom } from "../ui/navigation";
import { createGroupId } from "@tasktrove/types/id";

// Test constants for project groups
const TEST_GROUP_ID_1 = createGroupId("550e8400-e29b-41d4-a716-446655440001");

describe("currentRouteContextAtom", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  describe("standard views", () => {
    it("should parse today route correctly", () => {
      // Set pathname
      store.set(setPathnameAtom, "/today");

      const context = store.get(currentRouteContextAtom);

      expect(context).toEqual({
        pathname: "/today",
        viewId: "today",
        routeType: "standard",
      });
    });

    it("should parse inbox route correctly", () => {
      store.set(setPathnameAtom, "/inbox");

      const context = store.get(currentRouteContextAtom);

      expect(context).toEqual({
        pathname: "/inbox",
        viewId: "inbox",
        routeType: "standard",
      });
    });

    it("should parse upcoming route correctly", () => {
      store.set(setPathnameAtom, "/upcoming");

      const context = store.get(currentRouteContextAtom);

      expect(context).toEqual({
        pathname: "/upcoming",
        viewId: "upcoming",
        routeType: "standard",
      });
    });

    it("should handle root path as today", () => {
      store.set(setPathnameAtom, "/");

      const context = store.get(currentRouteContextAtom);

      expect(context).toEqual({
        pathname: "/",
        viewId: "today",
        routeType: "standard",
      });
    });
  });

  describe("project routes", () => {
    it("should parse project route correctly", () => {
      store.set(
        setPathnameAtom,
        "/projects/87654321-4321-4321-8321-210987654321",
      );

      const context = store.get(currentRouteContextAtom);

      expect(context).toEqual({
        pathname: "/projects/87654321-4321-4321-8321-210987654321",
        viewId: "not-found",
        routeType: "project",
        slug: "87654321-4321-4321-8321-210987654321",
      });
    });

    it("should handle project routes with special characters", () => {
      const testProjectId = "12345678-1234-1234-8234-123456789012";
      store.set(setPathnameAtom, `/projects/${testProjectId}`);

      const context = store.get(currentRouteContextAtom);

      expect(context).toEqual({
        pathname: `/projects/${testProjectId}`,
        viewId: "not-found",
        routeType: "project",
        slug: testProjectId,
      });
    });

    it("should mark non-existent project slug as not-found and expose slug", () => {
      store.set(setPathnameAtom, "/projects/not-valid-project");

      const context = store.get(currentRouteContextAtom);

      expect(context).toEqual({
        pathname: "/projects/not-valid-project",
        viewId: "not-found",
        routeType: "project",
        slug: "not-valid-project",
      });
    });
  });

  describe("label routes", () => {
    it("should parse label route correctly and fallback when no labels are available", () => {
      store.set(setPathnameAtom, "/labels/urgent");

      const context = store.get(currentRouteContextAtom);

      // Since labels atom returns empty array in test environment,
      // should fallback to not-found sentinel
      expect(context).toEqual({
        pathname: "/labels/urgent",
        viewId: "not-found", // Not found when label not in data
        routeType: "label",
        slug: "urgent",
      });
    });

    it("should handle label routes with encoded characters", () => {
      store.set(setPathnameAtom, "/labels/high%20priority");

      const context = store.get(currentRouteContextAtom);

      expect(context).toEqual({
        pathname: "/labels/high%20priority",
        viewId: "not-found", // Fallback when labels not available in test
        routeType: "label",
        slug: "high priority",
      });
    });
  });

  // Filter routes have been removed - not supported in the new system

  describe("edge cases", () => {
    it("should handle malformed routes gracefully", () => {
      store.set(setPathnameAtom, "/unknown-route");

      const context = store.get(currentRouteContextAtom);

      // Should default to standard route type for unknown routes
      expect(context).toEqual({
        pathname: "/unknown-route",
        viewId: "unknown-route",
        routeType: "standard",
      });
    });

    it("should handle empty pathname parts", () => {
      store.set(setPathnameAtom, "/projects/");

      const context = store.get(currentRouteContextAtom);

      expect(context).toEqual({
        pathname: "/projects/",
        viewId: "projects",
        routeType: "standard",
      });
    });

    it("should handle nested project routes", () => {
      store.set(
        setPathnameAtom,
        "/projects/87654321-4321-4321-8321-210987654321/settings",
      );

      const context = store.get(currentRouteContextAtom);

      // Should only use the first segment after /projects/
      expect(context).toEqual({
        pathname: "/projects/87654321-4321-4321-8321-210987654321/settings",
        viewId: "not-found",
        routeType: "project",
        slug: "87654321-4321-4321-8321-210987654321",
      });
    });
  });

  describe("type safety", () => {
    it("should return correct types", () => {
      store.set(setPathnameAtom, "/today");
      const context = store.get(currentRouteContextAtom);

      expect(typeof context.pathname).toBe("string");
      expect(typeof context.viewId).toBe("string");
      expect(typeof context.routeType).toBe("string");
    });

    it("should have consistent viewId format for project routes", () => {
      const testProjectId = "11111111-2222-3333-8444-555555555555";
      store.set(setPathnameAtom, `/projects/${testProjectId}`);
      const context = store.get(currentRouteContextAtom);

      if (context.routeType === "project") {
        expect(context.viewId).toBe("not-found");
        expect(context.slug).toBe(testProjectId);
      }
    });

    it("should have consistent viewId format for label routes", () => {
      store.set(setPathnameAtom, "/labels/urgent");
      const context = store.get(currentRouteContextAtom);

      if (context.routeType === "label") {
        expect(context.viewId).toBe("not-found");
      }
    });
  });

  describe("reactivity", () => {
    it("should be reactive to pathname changes", () => {
      // Set initial state
      store.set(setPathnameAtom, "/today");
      const context = store.get(currentRouteContextAtom);
      expect(context.viewId).toBe("today");

      // Change pathname and verify atom updates
      store.set(setPathnameAtom, "/inbox");
      const newContext = store.get(currentRouteContextAtom);
      expect(newContext.viewId).toBe("inbox");
    });
  });

  describe("compatibility with existing code", () => {
    it("should provide all data that getCurrentView() provided", () => {
      store.set(setPathnameAtom, "/today");
      const context = store.get(currentRouteContextAtom);

      // Should provide viewId (equivalent to getCurrentView())
      expect(context.viewId).toBeDefined();
      expect(typeof context.viewId).toBe("string");
    });

    it("should match new ViewId logic for projects", () => {
      const testProjectId = "abcdef12-1234-1234-8234-123456789abc";
      store.set(setPathnameAtom, `/projects/${testProjectId}`);
      const context = store.get(currentRouteContextAtom);

      if (context.pathname.startsWith("/projects/")) {
        expect(context.viewId).toBe("not-found");
      }
    });
  });

  describe("projectgroup routes", () => {
    it("should parse projectgroup route with UUID correctly", () => {
      store.set(setPathnameAtom, `/projectgroups/${TEST_GROUP_ID_1}`);

      const context = store.get(currentRouteContextAtom);

      expect(context).toEqual({
        pathname: `/projectgroups/${TEST_GROUP_ID_1}`,
        viewId: "not-found", // Show not found for non-existent UUID
        routeType: "projectgroup",
        slug: `${TEST_GROUP_ID_1}`,
      });
    });

    it("should parse projectgroup route with slug correctly", () => {
      store.set(setPathnameAtom, "/projectgroups/work-projects");

      const context = store.get(currentRouteContextAtom);

      expect(context).toEqual({
        pathname: "/projectgroups/work-projects",
        viewId: "not-found", // Show not found since no test project groups data
        routeType: "projectgroup",
        slug: "work-projects",
      });
    });

    it("should handle non-existent projectgroup gracefully", () => {
      store.set(setPathnameAtom, "/projectgroups/non-existent-group");

      const context = store.get(currentRouteContextAtom);

      expect(context).toEqual({
        pathname: "/projectgroups/non-existent-group",
        viewId: "not-found", // Show not found for non-existent group
        routeType: "projectgroup",
        slug: "non-existent-group",
      });
    });

    it("should handle projectgroup route without ID/slug", () => {
      store.set(setPathnameAtom, "/projectgroups");

      const context = store.get(currentRouteContextAtom);

      // Should fallback to standard route since no second segment
      expect(context.routeType).toBe("standard");
      expect(context.viewId).toBe("projectgroups"); // first segment becomes viewId
    });

    it("should handle projectgroup route with empty ID/slug", () => {
      store.set(setPathnameAtom, "/projectgroups/");

      const context = store.get(currentRouteContextAtom);

      // Should fallback to standard route since empty segment
      expect(context.routeType).toBe("standard");
      expect(context.viewId).toBe("projectgroups"); // first segment becomes viewId
    });

    it("should handle projectgroup route with multiple segments", () => {
      store.set(setPathnameAtom, "/projectgroups/work-projects/extra-segment");

      const context = store.get(currentRouteContextAtom);

      // Should still parse as projectgroup but show not found for non-existent group
      expect(context).toEqual({
        pathname: "/projectgroups/work-projects/extra-segment",
        viewId: "not-found", // Show not found since "work-projects" doesn't exist in test data
        routeType: "projectgroup",
        slug: "work-projects",
      });
    });

    it("should handle projectgroup route with URL-encoded segments", () => {
      const encodedSlug = encodeURIComponent("work & personal projects");
      store.set(setPathnameAtom, `/projectgroups/${encodedSlug}`);

      const context = store.get(currentRouteContextAtom);

      expect(context).toEqual({
        pathname: `/projectgroups/${encodedSlug}`,
        viewId: "not-found", // Show not found for non-existent group
        routeType: "projectgroup",
        slug: "work & personal projects",
      });
    });

    it("should differentiate between project and projectgroup routes", () => {
      // Test project route
      store.set(setPathnameAtom, "/projects/my-project");
      const projectContext = store.get(currentRouteContextAtom);
      expect(projectContext.routeType).toBe("project");

      // Test projectgroup route
      store.set(setPathnameAtom, "/projectgroups/my-project");
      const groupContext = store.get(currentRouteContextAtom);
      expect(groupContext.routeType).toBe("projectgroup");
    });

    it("should handle very long projectgroup slugs", () => {
      const longSlug =
        "a-very-long-project-group-slug-that-contains-many-words-and-should-still-work-correctly";
      store.set(setPathnameAtom, `/projectgroups/${longSlug}`);

      const context = store.get(currentRouteContextAtom);

      expect(context).toEqual({
        pathname: `/projectgroups/${longSlug}`,
        viewId: "not-found", // Show not found for non-existent group
        routeType: "projectgroup",
        slug: longSlug,
      });
    });

    it("should expose slug even when group is not found", () => {
      store.set(setPathnameAtom, "/projectgroups/tutorial");

      const context = store.get(currentRouteContextAtom);

      if (context.routeType !== "projectgroup") {
        throw new Error("Expected projectgroup route");
      }

      expect(context.slug).toBe("tutorial");
      expect(context.viewId).toBe("not-found");
    });
  });
});
