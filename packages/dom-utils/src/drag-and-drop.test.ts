import { describe, it, expect } from "vitest";
import { calculateInsertIndex, reorderItems } from "./drag-and-drop";
import type { Instruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/list-item";

// Note: extractDropPayload is not tested here as it's a thin wrapper around
// @atlaskit/pragmatic-drag-and-drop-hitbox's extractInstruction function,
// which is already tested by the library maintainers. Testing it would require
// complex mocking of internal symbols and pointer event data.

describe("calculateInsertIndex", () => {
  const beforeInstruction: Instruction = {
    operation: "reorder-before",
    blocked: false,
    axis: "vertical",
  };

  const afterInstruction: Instruction = {
    operation: "reorder-after",
    blocked: false,
    axis: "vertical",
  };

  describe("with string arrays", () => {
    it("should return index for reorder-before", () => {
      const items = ["a", "b", "c", "d"];
      const index = calculateInsertIndex(items, "c", beforeInstruction);

      expect(index).toBe(2);
    });

    it("should return index + 1 for reorder-after", () => {
      const items = ["a", "b", "c", "d"];
      const index = calculateInsertIndex(items, "c", afterInstruction);

      expect(index).toBe(3);
    });

    it("should return -1 if target not found", () => {
      const items = ["a", "b", "c"];
      const index = calculateInsertIndex(items, "z", beforeInstruction);

      expect(index).toBe(-1);
    });

    it("should work with first item", () => {
      const items = ["a", "b", "c"];
      const beforeIndex = calculateInsertIndex(items, "a", beforeInstruction);
      const afterIndex = calculateInsertIndex(items, "a", afterInstruction);

      expect(beforeIndex).toBe(0);
      expect(afterIndex).toBe(1);
    });

    it("should work with last item", () => {
      const items = ["a", "b", "c"];
      const beforeIndex = calculateInsertIndex(items, "c", beforeInstruction);
      const afterIndex = calculateInsertIndex(items, "c", afterInstruction);

      expect(beforeIndex).toBe(2);
      expect(afterIndex).toBe(3);
    });
  });

  describe("with object arrays", () => {
    interface Item {
      id: string;
      name: string;
    }

    const items: Item[] = [
      { id: "1", name: "First" },
      { id: "2", name: "Second" },
      { id: "3", name: "Third" },
    ];

    it("should work with custom getId function", () => {
      const beforeIndex = calculateInsertIndex(
        items,
        "2",
        beforeInstruction,
        (item) => item.id,
      );
      const afterIndex = calculateInsertIndex(
        items,
        "2",
        afterInstruction,
        (item) => item.id,
      );

      expect(beforeIndex).toBe(1);
      expect(afterIndex).toBe(2);
    });

    it("should return -1 if target not found with custom getId", () => {
      const index = calculateInsertIndex(
        items,
        "99",
        beforeInstruction,
        (item) => item.id,
      );

      expect(index).toBe(-1);
    });
  });
});

describe("reorderItems", () => {
  const beforeInstruction: Instruction = {
    operation: "reorder-before",
    blocked: false,
    axis: "vertical",
  };

  const afterInstruction: Instruction = {
    operation: "reorder-after",
    blocked: false,
    axis: "vertical",
  };

  describe("with string arrays", () => {
    it("should reorder single item before target", () => {
      const items = ["a", "b", "c", "d"];
      const result = reorderItems(items, ["b"], "d", beforeInstruction);

      expect(result).toEqual(["a", "c", "b", "d"]);
    });

    it("should reorder single item after target", () => {
      const items = ["a", "b", "c", "d"];
      const result = reorderItems(items, ["b"], "d", afterInstruction);

      expect(result).toEqual(["a", "c", "d", "b"]);
    });

    it("should reorder multiple items", () => {
      const items = ["a", "b", "c", "d", "e"];
      const result = reorderItems(items, ["b", "d"], "e", beforeInstruction);

      expect(result).toEqual(["a", "c", "b", "d", "e"]);
    });

    it("should preserve order of dragged items", () => {
      const items = ["a", "b", "c", "d", "e"];
      const result = reorderItems(items, ["d", "b"], "e", beforeInstruction);

      expect(result).toEqual(["a", "c", "d", "b", "e"]);
    });

    it("should handle moving item to beginning", () => {
      const items = ["a", "b", "c", "d"];
      const result = reorderItems(items, ["d"], "a", beforeInstruction);

      expect(result).toEqual(["d", "a", "b", "c"]);
    });

    it("should handle moving item to end", () => {
      const items = ["a", "b", "c", "d"];
      const result = reorderItems(items, ["a"], "d", afterInstruction);

      expect(result).toEqual(["b", "c", "d", "a"]);
    });

    it("should return null if target not found", () => {
      const items = ["a", "b", "c"];
      const result = reorderItems(items, ["a"], "z", beforeInstruction);

      expect(result).toBeNull();
    });

    it("should handle moving item to its current position", () => {
      const items = ["a", "b", "c"];
      const result = reorderItems(items, ["b"], "b", beforeInstruction);

      // Item is removed and re-inserted at its own position
      expect(result).toEqual(["a", "b", "c"]);
    });

    it("should not mutate original array", () => {
      const items = ["a", "b", "c", "d"];
      const itemsCopy = [...items];
      reorderItems(items, ["b"], "d", beforeInstruction);

      expect(items).toEqual(itemsCopy);
    });
  });

  describe("with object arrays", () => {
    interface Item {
      id: string;
      name: string;
    }

    const items: Item[] = [
      { id: "1", name: "First" },
      { id: "2", name: "Second" },
      { id: "3", name: "Third" },
      { id: "4", name: "Fourth" },
    ];

    it("should reorder objects before target", () => {
      const result = reorderItems(
        items,
        ["2"],
        "4",
        beforeInstruction,
        (item) => item.id,
      );

      expect(result).toEqual([
        { id: "1", name: "First" },
        { id: "3", name: "Third" },
        { id: "2", name: "Second" },
        { id: "4", name: "Fourth" },
      ]);
    });

    it("should reorder objects after target", () => {
      const result = reorderItems(
        items,
        ["2"],
        "4",
        afterInstruction,
        (item) => item.id,
      );

      expect(result).toEqual([
        { id: "1", name: "First" },
        { id: "3", name: "Third" },
        { id: "4", name: "Fourth" },
        { id: "2", name: "Second" },
      ]);
    });

    it("should handle multiple objects", () => {
      const result = reorderItems(
        items,
        ["1", "3"],
        "4",
        beforeInstruction,
        (item) => item.id,
      );

      expect(result).toEqual([
        { id: "2", name: "Second" },
        { id: "1", name: "First" },
        { id: "3", name: "Third" },
        { id: "4", name: "Fourth" },
      ]);
    });

    it("should not mutate original array", () => {
      const itemsCopy = items.map((item) => ({ ...item }));
      reorderItems(items, ["2"], "4", beforeInstruction, (item) => item.id);

      expect(items).toEqual(itemsCopy);
    });
  });
});
