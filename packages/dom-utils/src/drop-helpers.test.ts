import { describe, it, expect } from "vitest";
import type { Instruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/list-item";
import {
  calculateTargetSectionItems,
  insertIdsAtSectionEnd,
  removeIdsFromProjects,
  replaceSectionItems,
  type ProjectLike,
} from "./drop-helpers";

describe("drop-helpers", () => {
  const reorderBefore: Instruction = {
    operation: "reorder-before",
    axis: "vertical",
    blocked: false,
  };
  const reorderAfter: Instruction = {
    operation: "reorder-after",
    axis: "vertical",
    blocked: false,
  };

  describe("calculateTargetSectionItems", () => {
    it("reorders within same section", () => {
      const result = calculateTargetSectionItems(
        ["a", "b", "c"],
        ["a"],
        "c",
        reorderBefore,
      );
      expect(result).toEqual(["b", "a", "c"]);
    });

    it("inserts cross-section before target", () => {
      const result = calculateTargetSectionItems(
        ["x", "y"],
        ["a"],
        "y",
        reorderBefore,
      );
      expect(result).toEqual(["x", "a", "y"]);
    });

    it("returns original when target missing", () => {
      const result = calculateTargetSectionItems(
        ["x", "y"],
        ["a"],
        "z",
        reorderAfter,
      );
      expect(result).toEqual(["x", "y"]);
    });
  });

  describe("project helpers", () => {
    const project: ProjectLike = {
      id: "p1",
      sections: [
        { id: "s1", items: ["a", "b"] },
        { id: "s2", items: ["c"] },
      ],
    };

    it("removes ids from all sections", () => {
      const cleaned = removeIdsFromProjects([project], ["b", "c"]);
      expect(cleaned[0]?.sections[0]?.items).toEqual(["a"]);
      expect(cleaned[0]?.sections[1]?.items).toEqual([]);
    });

    it("inserts ids at section end", () => {
      const updated = insertIdsAtSectionEnd(project, "s1", ["d"]);
      expect(updated.sections[0]?.items).toEqual(["a", "b", "d"]);
    });

    it("replaces section items", () => {
      const updated = replaceSectionItems(project, "s2", ["n1", "n2"]);
      expect(updated.sections[1]?.items).toEqual(["n1", "n2"]);
    });
  });
});
