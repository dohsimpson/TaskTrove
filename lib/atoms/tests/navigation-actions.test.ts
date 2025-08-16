import { describe, it, expect, beforeEach } from "vitest"
import { createStore } from "jotai"
import {
  openSearchAtom,
  closeSearchAtom,
  toggleSearchAtom,
  openQuickAddAtom,
  closeQuickAddAtom,
  toggleQuickAddAtom,
  openProjectDialogAtom,
  closeProjectDialogAtom,
  toggleProjectDialogAtom,
  openLabelDialogAtom,
  closeLabelDialogAtom,
  toggleLabelDialogAtom,
  closeAllDialogsAtom,
} from "../ui/navigation"
import {
  showSearchDialogAtom,
  showQuickAddAtom,
  showProjectDialogAtom,
  showLabelDialogAtom,
} from "../ui/dialogs"

/**
 * Test suite for navigation action atoms
 *
 * These atoms provide centralized navigation actions to eliminate
 * scattered handler functions across components.
 */

describe("navigation action atoms", () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createStore()
    // Reset all dialog states
    store.set(showSearchDialogAtom, false)
    store.set(showQuickAddAtom, false)
    store.set(showProjectDialogAtom, false)
    store.set(showLabelDialogAtom, false)
  })

  describe("search dialog actions", () => {
    it("should open search dialog", () => {
      expect(store.get(showSearchDialogAtom)).toBe(false)

      store.set(openSearchAtom)

      expect(store.get(showSearchDialogAtom)).toBe(true)
    })

    it("should close search dialog", () => {
      store.set(showSearchDialogAtom, true)

      store.set(closeSearchAtom)

      expect(store.get(showSearchDialogAtom)).toBe(false)
    })

    it("should toggle search dialog from false to true", () => {
      expect(store.get(showSearchDialogAtom)).toBe(false)

      store.set(toggleSearchAtom)

      expect(store.get(showSearchDialogAtom)).toBe(true)
    })

    it("should toggle search dialog from true to false", () => {
      store.set(showSearchDialogAtom, true)

      store.set(toggleSearchAtom)

      expect(store.get(showSearchDialogAtom)).toBe(false)
    })
  })

  describe("quick add dialog actions", () => {
    it("should open quick add dialog", () => {
      expect(store.get(showQuickAddAtom)).toBe(false)

      store.set(openQuickAddAtom)

      expect(store.get(showQuickAddAtom)).toBe(true)
    })

    it("should close quick add dialog", () => {
      store.set(showQuickAddAtom, true)

      store.set(closeQuickAddAtom)

      expect(store.get(showQuickAddAtom)).toBe(false)
    })

    it("should toggle quick add dialog from false to true", () => {
      expect(store.get(showQuickAddAtom)).toBe(false)

      store.set(toggleQuickAddAtom)

      expect(store.get(showQuickAddAtom)).toBe(true)
    })

    it("should toggle quick add dialog from true to false", () => {
      store.set(showQuickAddAtom, true)

      store.set(toggleQuickAddAtom)

      expect(store.get(showQuickAddAtom)).toBe(false)
    })
  })

  describe("project dialog actions", () => {
    it("should open project dialog", () => {
      expect(store.get(showProjectDialogAtom)).toBe(false)

      store.set(openProjectDialogAtom)

      expect(store.get(showProjectDialogAtom)).toBe(true)
    })

    it("should close project dialog", () => {
      store.set(showProjectDialogAtom, true)

      store.set(closeProjectDialogAtom)

      expect(store.get(showProjectDialogAtom)).toBe(false)
    })

    it("should toggle project dialog from false to true", () => {
      expect(store.get(showProjectDialogAtom)).toBe(false)

      store.set(toggleProjectDialogAtom)

      expect(store.get(showProjectDialogAtom)).toBe(true)
    })

    it("should toggle project dialog from true to false", () => {
      store.set(showProjectDialogAtom, true)

      store.set(toggleProjectDialogAtom)

      expect(store.get(showProjectDialogAtom)).toBe(false)
    })
  })

  describe("label dialog actions", () => {
    it("should open label dialog", () => {
      expect(store.get(showLabelDialogAtom)).toBe(false)

      store.set(openLabelDialogAtom)

      expect(store.get(showLabelDialogAtom)).toBe(true)
    })

    it("should close label dialog", () => {
      store.set(showLabelDialogAtom, true)

      store.set(closeLabelDialogAtom)

      expect(store.get(showLabelDialogAtom)).toBe(false)
    })

    it("should toggle label dialog from false to true", () => {
      expect(store.get(showLabelDialogAtom)).toBe(false)

      store.set(toggleLabelDialogAtom)

      expect(store.get(showLabelDialogAtom)).toBe(true)
    })

    it("should toggle label dialog from true to false", () => {
      store.set(showLabelDialogAtom, true)

      store.set(toggleLabelDialogAtom)

      expect(store.get(showLabelDialogAtom)).toBe(false)
    })
  })

  describe("closeAllDialogs action", () => {
    it("should close all dialogs when they are open", () => {
      // Open all dialogs
      store.set(showSearchDialogAtom, true)
      store.set(showQuickAddAtom, true)
      store.set(showProjectDialogAtom, true)
      store.set(showLabelDialogAtom, true)

      // Verify they are open
      expect(store.get(showSearchDialogAtom)).toBe(true)
      expect(store.get(showQuickAddAtom)).toBe(true)
      expect(store.get(showProjectDialogAtom)).toBe(true)
      expect(store.get(showLabelDialogAtom)).toBe(true)

      // Close all
      store.set(closeAllDialogsAtom)

      // Verify they are all closed
      expect(store.get(showSearchDialogAtom)).toBe(false)
      expect(store.get(showQuickAddAtom)).toBe(false)
      expect(store.get(showProjectDialogAtom)).toBe(false)
      expect(store.get(showLabelDialogAtom)).toBe(false)
    })

    it("should work when dialogs are already closed", () => {
      // Ensure all dialogs are closed
      expect(store.get(showSearchDialogAtom)).toBe(false)
      expect(store.get(showQuickAddAtom)).toBe(false)
      expect(store.get(showProjectDialogAtom)).toBe(false)
      expect(store.get(showLabelDialogAtom)).toBe(false)

      // Close all (should be no-op)
      store.set(closeAllDialogsAtom)

      // Verify they are still closed
      expect(store.get(showSearchDialogAtom)).toBe(false)
      expect(store.get(showQuickAddAtom)).toBe(false)
      expect(store.get(showProjectDialogAtom)).toBe(false)
      expect(store.get(showLabelDialogAtom)).toBe(false)
    })

    it("should close only open dialogs when some are open and some are closed", () => {
      // Open some dialogs, keep others closed
      store.set(showSearchDialogAtom, true)
      store.set(showQuickAddAtom, false)
      store.set(showProjectDialogAtom, true)
      store.set(showLabelDialogAtom, false)

      store.set(closeAllDialogsAtom)

      // All should be closed
      expect(store.get(showSearchDialogAtom)).toBe(false)
      expect(store.get(showQuickAddAtom)).toBe(false)
      expect(store.get(showProjectDialogAtom)).toBe(false)
      expect(store.get(showLabelDialogAtom)).toBe(false)
    })
  })

  describe("action independence", () => {
    it("should not affect other dialogs when opening one dialog", () => {
      store.set(openSearchAtom)

      expect(store.get(showSearchDialogAtom)).toBe(true)
      expect(store.get(showQuickAddAtom)).toBe(false)
      expect(store.get(showProjectDialogAtom)).toBe(false)
      expect(store.get(showLabelDialogAtom)).toBe(false)
    })

    it("should allow multiple dialogs to be open simultaneously", () => {
      store.set(openSearchAtom)
      store.set(openQuickAddAtom)

      expect(store.get(showSearchDialogAtom)).toBe(true)
      expect(store.get(showQuickAddAtom)).toBe(true)
      expect(store.get(showProjectDialogAtom)).toBe(false)
      expect(store.get(showLabelDialogAtom)).toBe(false)
    })

    it("should close specific dialog without affecting others", () => {
      // Open multiple dialogs
      store.set(openSearchAtom)
      store.set(openQuickAddAtom)
      store.set(openProjectDialogAtom)

      // Close only the search dialog
      store.set(closeSearchAtom)

      expect(store.get(showSearchDialogAtom)).toBe(false)
      expect(store.get(showQuickAddAtom)).toBe(true)
      expect(store.get(showProjectDialogAtom)).toBe(true)
      expect(store.get(showLabelDialogAtom)).toBe(false)
    })
  })
})
