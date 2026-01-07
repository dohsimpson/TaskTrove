import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createStore } from "jotai";
import { lastViewedPathAtom } from "../ui/navigation";

const STORAGE_KEY = "tasktrove-last-viewed-path";

function clearLastViewedStorage() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors in tests
  }
}

describe("lastViewedPathAtom", () => {
  beforeEach(() => {
    clearLastViewedStorage();
  });

  afterEach(() => {
    clearLastViewedStorage();
  });

  it("hydrates from localStorage on init", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify("/today"));
    const store = createStore();

    const unsubscribe = store.sub(lastViewedPathAtom, () => {});
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(store.get(lastViewedPathAtom)).toBe("/today");

    unsubscribe();
  });

  it("persists updates to localStorage", () => {
    const store = createStore();

    store.set(lastViewedPathAtom, "/inbox");

    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    expect(storedValue).not.toBeNull();
    expect(JSON.parse(storedValue ?? "null")).toBe("/inbox");
  });
});
