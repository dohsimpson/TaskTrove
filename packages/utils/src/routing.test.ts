import { DEFAULT_PROJECT_SECTION } from "@tasktrove/types/defaults";
import { describe, it, expect } from "vitest";
import {
  createEntitySlug,
  createProjectSlug,
  createLabelSlug,
  createProjectGroupSlug,
  extractIdFromSlug,
  resolveProject,
  resolveLabel,
  resolveProjectGroup,
  getApiBasePath,
} from "./routing";
import { Project, Label } from "@tasktrove/types/core";
import { ProjectGroup } from "@tasktrove/types/group";
import {
  createProjectId,
  createLabelId,
  createGroupId,
} from "@tasktrove/types/id";

const TEST_PROJECT_ID = createProjectId("650e8400-e29b-41d4-a716-446655440001");
const TEST_LABEL_ID = createLabelId("750e8400-e29b-41d4-a716-446655440001");
const TEST_GROUP_ID = createGroupId("550e8400-e29b-41d4-a716-446655440001");

describe("routing utilities", () => {
  describe("slug generation", () => {
    it("should generate deterministic slugs with ID suffix", () => {
      const slug = createEntitySlug("My New Project", TEST_PROJECT_ID);
      expect(slug.startsWith("my-new-project-")).toBe(true);
      expect(slug).toMatch(/-[1-9A-HJ-NP-Za-km-z]{22}$/);
      expect(extractIdFromSlug(slug)).toBe(TEST_PROJECT_ID);
    });

    it("should normalize special characters and preserve ID", () => {
      const slug = createEntitySlug(
        "Project & Task Management!",
        TEST_PROJECT_ID,
      );
      expect(slug.startsWith("project-and-task-management-")).toBe(true);
      expect(slug).toMatch(/-[1-9A-HJ-NP-Za-km-z]{22}$/);
      expect(extractIdFromSlug(slug)).toBe(TEST_PROJECT_ID);
    });

    it("should fall back to a hash when name slugifies to empty", () => {
      const slug = createEntitySlug("!!!", TEST_PROJECT_ID);
      expect(slug).toMatch(/^[a-z0-9]{8}-/);
      expect(extractIdFromSlug(slug)).toBe(TEST_PROJECT_ID);
    });

    it("should be deterministic for same name and id", () => {
      const slug1 = createEntitySlug("Work", TEST_PROJECT_ID);
      const slug2 = createEntitySlug("Work", TEST_PROJECT_ID);
      expect(slug1).toBe(slug2);
    });
  });

  describe("extractIdFromSlug", () => {
    it("should extract UUID from a slug suffix", () => {
      const slug = `example-${TEST_PROJECT_ID}`;
      expect(extractIdFromSlug(slug)).toBe(TEST_PROJECT_ID);
    });

    it("should extract UUID from a short-id slug suffix", () => {
      const slug = createEntitySlug("Example", TEST_PROJECT_ID);
      expect(extractIdFromSlug(slug)).toBe(TEST_PROJECT_ID);
    });

    it("should return UUID when slug is just the id", () => {
      expect(extractIdFromSlug(TEST_PROJECT_ID)).toBe(TEST_PROJECT_ID);
    });

    it("should return null when no UUID is present", () => {
      expect(extractIdFromSlug("not-a-uuid")).toBeNull();
    });
  });

  describe("resolveProject/Label/Group", () => {
    const projects: Project[] = [
      {
        id: TEST_PROJECT_ID,
        name: "Test Project",
        color: "#3b82f6",
        sections: [DEFAULT_PROJECT_SECTION],
      },
    ];

    const labels: Label[] = [
      {
        id: TEST_LABEL_ID,
        name: "Important",
        color: "#ef4444",
      },
    ];

    const projectGroups: ProjectGroup = {
      type: "project",
      id: TEST_GROUP_ID,
      name: "Work Projects",
      items: [TEST_PROJECT_ID],
    };

    it("should resolve project by slug (id suffix)", () => {
      const [project] = projects;
      if (!project) {
        throw new Error("Expected test project");
      }
      const slug = createProjectSlug(project);
      const result = resolveProject(slug, projects);
      expect(result?.id).toBe(TEST_PROJECT_ID);
    });

    it("should resolve label by slug (id suffix)", () => {
      const [label] = labels;
      if (!label) {
        throw new Error("Expected test label");
      }
      const slug = createLabelSlug(label);
      const result = resolveLabel(slug, labels);
      expect(result?.id).toBe(TEST_LABEL_ID);
    });

    it("should resolve project group by slug (id suffix)", () => {
      const slug = createProjectGroupSlug(projectGroups);
      const result = resolveProjectGroup(slug, projectGroups);
      expect(result?.id).toBe(TEST_GROUP_ID);
    });
  });

  describe("getApiBasePath", () => {
    it("should strip dynamic segments from API routes", () => {
      expect(getApiBasePath("/api/v1/assets/[...path]")).toBe("/api/v1/assets");
      expect(getApiBasePath("/api/users/[id]")).toBe("/api/users");
      expect(getApiBasePath("/api/posts/[slug]/comments")).toBe(
        "/api/posts/comments",
      );
      expect(getApiBasePath("/api/v1/tasks")).toBe("/api/v1/tasks");
    });
  });
});
