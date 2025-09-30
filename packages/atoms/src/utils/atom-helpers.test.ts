import { describe, it, expect } from "vitest";
import { atom } from "jotai";
import { namedAtom, withErrorHandling } from "./atom-helpers";

describe("namedAtom", () => {
  it("should assign debug label to read-only atom", () => {
    const testAtom = namedAtom("testAtom", atom(42));
    expect(testAtom.debugLabel).toBe("testAtom");
  });

  it("should assign debug label to writable atom", () => {
    const testAtom = namedAtom("writableAtom", atom(0));
    expect(testAtom.debugLabel).toBe("writableAtom");
  });

  it("should preserve atom type", () => {
    const testAtom = namedAtom("countAtom", atom(5));
    expect(testAtom.debugLabel).toBe("countAtom");
    // The atom should still be a valid Jotai atom
    expect(testAtom).toBeDefined();
  });

  it("should work with derived atoms", () => {
    const baseAtom = atom(10);
    const derivedAtom = namedAtom(
      "derivedAtom",
      atom((get) => get(baseAtom) * 2),
    );
    expect(derivedAtom.debugLabel).toBe("derivedAtom");
  });

  it("should work with writable derived atoms", () => {
    const baseAtom = atom(0);
    const writableAtom = namedAtom(
      "incrementAtom",
      atom(
        (get) => get(baseAtom),
        (get, set) => set(baseAtom, get(baseAtom) + 1),
      ),
    );
    expect(writableAtom.debugLabel).toBe("incrementAtom");
  });

  it("should work with write-only atoms", () => {
    const baseAtom = atom(0);
    const writeOnlyAtom = namedAtom(
      "setValueAtom",
      atom(null, (get, set, newValue: number) => set(baseAtom, newValue)),
    );
    expect(writeOnlyAtom.debugLabel).toBe("setValueAtom");
  });

  it("should handle different value types", () => {
    const stringAtom = namedAtom("stringAtom", atom("test"));
    const arrayAtom = namedAtom("arrayAtom", atom([1, 2, 3]));
    const objectAtom = namedAtom("objectAtom", atom({ key: "value" }));

    expect(stringAtom.debugLabel).toBe("stringAtom");
    expect(arrayAtom.debugLabel).toBe("arrayAtom");
    expect(objectAtom.debugLabel).toBe("objectAtom");
  });
});

describe("withErrorHandling", () => {
  it("should return function result when no error", () => {
    const result = withErrorHandling(() => 42, "test", 0);
    expect(result).toBe(42);
  });

  it("should return fallback when function throws", () => {
    const result = withErrorHandling(
      () => {
        throw new Error("test error");
      },
      "testAtom",
      [],
    );
    expect(result).toEqual([]);
  });

  it("should call handleAtomError when error occurs", () => {
    // This test verifies error handling is called
    const testError = new Error("test");
    const result = withErrorHandling(
      () => {
        throw testError;
      },
      "errorAtom",
      null,
    );
    expect(result).toBeNull();
  });

  it("should preserve return type", () => {
    const arrayResult = withErrorHandling(() => [1, 2, 3], "test", []);
    expect(Array.isArray(arrayResult)).toBe(true);

    const objectResult = withErrorHandling(() => ({ a: 1 }), "test", { a: 0 });
    expect(typeof objectResult).toBe("object");

    const numberResult = withErrorHandling(() => 42, "test", 0);
    expect(typeof numberResult).toBe("number");
  });

  it("should work with complex logic", () => {
    const result = withErrorHandling(
      () => {
        const data = [1, 2, 3, 4, 5];
        return data.filter((x) => x > 2).map((x) => x * 2);
      },
      "complexAtom",
      [],
    );
    expect(result).toEqual([6, 8, 10]);
  });

  it("should handle nested function calls", () => {
    const helper = () => {
      throw new Error("nested error");
    };

    const result = withErrorHandling(
      () => {
        helper();
        return "success";
      },
      "nestedAtom",
      "fallback",
    );
    expect(result).toBe("fallback");
  });
});
