import { describe, it, expect } from "vitest";
import {
  compareVersions,
  isVersionLessThan,
  isVersionEqual,
  isVersionGreaterThan,
} from "./version";

describe("compareVersions", () => {
  it("returns 0 when versions are equal", () => {
    expect(compareVersions("v1.2.3", "1.2.3")).toBe(0);
  });

  it("returns -1 when first version is lower", () => {
    expect(compareVersions("v1.2.3", "v1.3.0")).toBe(-1);
    expect(compareVersions("1.2", "1.2.1")).toBe(-1);
  });

  it("returns 1 when first version is higher", () => {
    expect(compareVersions("v2.0.0", "v1.9.9")).toBe(1);
    expect(compareVersions("1.2.1", "1.2")).toBe(1);
  });

  it("handles differing segment lengths", () => {
    expect(compareVersions("v1", "v1.0.0")).toBe(0);
    expect(compareVersions("v1.0.1", "1")).toBe(1);
  });

  it("provides boolean helpers", () => {
    expect(isVersionLessThan("v1.0.0", "v1.0.1")).toBe(true);
    expect(isVersionEqual("v2", "2.0.0")).toBe(true);
    expect(isVersionGreaterThan("v2.1", "2.0.9")).toBe(true);
  });
});
