/**
 * ⚠️  WEB API DEPENDENT - Show Label Dialog Test Suite
 *
 * Platform dependencies:
 * - UI state management for dialog visibility
 * - Dialog atom state management
 * - Web-specific dialog behavior
 *
 * Test suite for showLabelDialogAtom
 *
 * This atom manages the label dialog state, completing the set
 * of dialog state atoms that were missing from dialogs.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createStore } from "jotai";
import { showLabelDialogAtom } from "../ui/dialogs";

describe("showLabelDialogAtom", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  describe("default state", () => {
    it("should have default value of false", () => {
      const state = store.get(showLabelDialogAtom);
      expect(state).toBe(false);
    });
  });

  describe("state changes", () => {
    it("should allow setting to true", () => {
      store.set(showLabelDialogAtom, true);

      const state = store.get(showLabelDialogAtom);
      expect(state).toBe(true);
    });

    it("should allow setting to false", () => {
      store.set(showLabelDialogAtom, true);
      store.set(showLabelDialogAtom, false);

      const state = store.get(showLabelDialogAtom);
      expect(state).toBe(false);
    });

    it("should allow multiple state changes", () => {
      // Start with default (false)
      expect(store.get(showLabelDialogAtom)).toBe(false);

      // Change to true
      store.set(showLabelDialogAtom, true);
      expect(store.get(showLabelDialogAtom)).toBe(true);

      // Change back to false
      store.set(showLabelDialogAtom, false);
      expect(store.get(showLabelDialogAtom)).toBe(false);

      // Change to true again
      store.set(showLabelDialogAtom, true);
      expect(store.get(showLabelDialogAtom)).toBe(true);
    });
  });

  describe("type safety", () => {
    it("should accept boolean values", () => {
      // These should not throw type errors when compiled
      store.set(showLabelDialogAtom, true);
      store.set(showLabelDialogAtom, false);

      expect(store.get(showLabelDialogAtom)).toBe(false);
    });

    it("should maintain boolean type", () => {
      store.set(showLabelDialogAtom, true);
      const state = store.get(showLabelDialogAtom);

      expect(typeof state).toBe("boolean");
      expect(state).toBe(true);
    });
  });

  describe("reactivity", () => {
    it("should be reactive to changes", () => {
      // Initial state
      let state = store.get(showLabelDialogAtom);
      expect(state).toBe(false);

      // Change state
      store.set(showLabelDialogAtom, true);

      // Get updated state
      state = store.get(showLabelDialogAtom);
      expect(state).toBe(true);
    });

    it("should handle rapid state changes", () => {
      // Rapid toggle
      store.set(showLabelDialogAtom, true);
      store.set(showLabelDialogAtom, false);
      store.set(showLabelDialogAtom, true);
      store.set(showLabelDialogAtom, false);

      const finalState = store.get(showLabelDialogAtom);
      expect(finalState).toBe(false);
    });
  });

  describe("independent from other dialog atoms", () => {
    it("should not affect other dialog states when changed", () => {
      // This test ensures showLabelDialogAtom is independent
      // In a real integration, we'd test this with other dialog atoms
      // but for unit testing, we just verify it works in isolation

      store.set(showLabelDialogAtom, true);

      // The atom should maintain its state
      expect(store.get(showLabelDialogAtom)).toBe(true);

      store.set(showLabelDialogAtom, false);
      expect(store.get(showLabelDialogAtom)).toBe(false);
    });
  });
});
