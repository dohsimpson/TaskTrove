/**
 * Keyboard Manager Test Suite
 *
 * Comprehensive tests for the unified keyboard shortcut system.
 * Tests atoms, context matching, shortcut parsing, and integration.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { createStore } from "jotai"

// Unmock atoms - this test needs real atoms for store API
vi.unmock("@tasktrove/atoms/ui/keyboard-context")
vi.unmock("@tasktrove/atoms/ui/dialogs")
vi.unmock("@tasktrove/atoms/ui/views")
vi.unmock("@tasktrove/atoms/ui/selection")

import { keyboardContextAtom } from "@tasktrove/atoms/ui/keyboard-context"
import {
  keyboardHandlersAtom,
  registerKeyboardHandlerAtom,
  unregisterKeyboardHandlerAtom,
  registerHandlerGroupAtom,
  unregisterHandlerGroupAtom,
  activeComponentAtom,
  isTypingAtom,
} from "@tasktrove/atoms/ui/keyboard-context"
import type { KeyboardHandler, KeyboardContext } from "@tasktrove/atoms/ui/keyboard-context"
import { matchesShortcut } from "@/hooks/use-global-keyboard-manager"
import * as ContextMatcher from "@/lib/keyboard/context-matcher"
import { TEST_TASK_ID_1, TEST_SECTION_ID_1 } from "@tasktrove/types/test-constants"
import { DEFAULT_TASK_PRIORITY } from "@tasktrove/constants"
import type { TaskPriority } from "@tasktrove/types/core"

// Mock atoms for testing
const mockContext: KeyboardContext = {
  activeComponent: null,
  focusedElement: null,
  isTyping: false,
  currentView: "today",
  isAnyDialogOpen: false,
  showTaskPanel: false,
  showSearchDialog: false,
  showQuickAdd: false,
  showProjectDialog: false,
  showPomodoro: false,
  selectedTask: null,
  selectedTasks: [],
  hasSearchQuery: false,
  isInTaskPanel: false,
  isInGlobalView: true,
  canUseGlobalShortcuts: true,
  canUseTaskShortcuts: false,
}

describe("Keyboard Manager System", () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createStore()
    vi.clearAllMocks()
  })

  describe("Handler Registry Atoms", () => {
    it("should register and store keyboard handlers", () => {
      const handler: KeyboardHandler = {
        id: "test-handler",
        shortcuts: ["Cmd+N"],
        context: { priority: 10 },
        handler: vi.fn(() => true),
      }

      store.set(registerKeyboardHandlerAtom, handler)
      const handlers = store.get(keyboardHandlersAtom)

      expect(handlers.has("test-handler")).toBe(true)
      expect(handlers.get("test-handler")).toEqual(handler)
    })

    it("should unregister keyboard handlers", () => {
      const handler: KeyboardHandler = {
        id: "test-handler",
        shortcuts: ["Cmd+N"],
        context: {},
        handler: vi.fn(() => true),
      }

      store.set(registerKeyboardHandlerAtom, handler)
      expect(store.get(keyboardHandlersAtom).has("test-handler")).toBe(true)

      store.set(unregisterKeyboardHandlerAtom, "test-handler")
      expect(store.get(keyboardHandlersAtom).has("test-handler")).toBe(false)
    })

    it("should handle handler groups", () => {
      const handlers: KeyboardHandler[] = [
        {
          id: "handler-1",
          shortcuts: ["1"],
          context: {},
          handler: vi.fn(() => true),
        },
        {
          id: "handler-2",
          shortcuts: ["2"],
          context: {},
          handler: vi.fn(() => true),
        },
      ]

      store.set(registerHandlerGroupAtom, "test-group", handlers)
      const registeredHandlers = store.get(keyboardHandlersAtom)

      expect(registeredHandlers.has("handler-1")).toBe(true)
      expect(registeredHandlers.has("handler-2")).toBe(true)
      expect(registeredHandlers.get("handler-1")?.context.group).toBe("test-group")
      expect(registeredHandlers.get("handler-2")?.context.group).toBe("test-group")
    })

    it("should unregister handler groups", () => {
      const handlers: KeyboardHandler[] = [
        {
          id: "handler-1",
          shortcuts: ["1"],
          context: {},
          handler: vi.fn(() => true),
        },
        {
          id: "handler-2",
          shortcuts: ["2"],
          context: {},
          handler: vi.fn(() => true),
        },
      ]

      store.set(registerHandlerGroupAtom, "test-group", handlers)
      expect(store.get(keyboardHandlersAtom).size).toBe(2)

      store.set(unregisterHandlerGroupAtom, "test-group")
      expect(store.get(keyboardHandlersAtom).size).toBe(0)
    })
  })

  describe("Shortcut Matching", () => {
    it("should match simple single-key shortcuts", () => {
      const event: globalThis.KeyboardEvent = new KeyboardEvent("keydown", { key: "Escape" })
      expect(matchesShortcut("Escape", event)).toBe(true)
      expect(matchesShortcut("Enter", event)).toBe(false)
    })

    it("should match shortcuts with modifiers", () => {
      const cmdNEvent: globalThis.KeyboardEvent = new KeyboardEvent("keydown", {
        key: "n",
        metaKey: true,
      })
      const ctrlNEvent: globalThis.KeyboardEvent = new KeyboardEvent("keydown", {
        key: "n",
        ctrlKey: true,
      })

      expect(matchesShortcut("Cmd+N", cmdNEvent)).toBe(true)
      expect(matchesShortcut("Ctrl+N", ctrlNEvent)).toBe(true)
      expect(matchesShortcut("Cmd+N", ctrlNEvent)).toBe(false)
      expect(matchesShortcut("N", cmdNEvent)).toBe(false)
    })

    it("should handle cross-platform Cmd/Ctrl compatibility", () => {
      const cmdEvent: globalThis.KeyboardEvent = new KeyboardEvent("keydown", {
        key: "z",
        metaKey: true,
      })
      const ctrlEvent: globalThis.KeyboardEvent = new KeyboardEvent("keydown", {
        key: "z",
        ctrlKey: true,
      })

      // Both Cmd and Ctrl shortcuts should match modifier keys
      expect(matchesShortcut("Cmd+Z", cmdEvent)).toBe(true)
      expect(matchesShortcut("Ctrl+Z", ctrlEvent)).toBe(true)
    })

    it("should match complex modifier combinations", () => {
      const event: globalThis.KeyboardEvent = new KeyboardEvent("keydown", {
        key: "T",
        ctrlKey: true,
        shiftKey: true,
      })

      expect(matchesShortcut("Ctrl+Shift+T", event)).toBe(true)
      expect(matchesShortcut("Ctrl+T", event)).toBe(false)
      expect(matchesShortcut("Shift+T", event)).toBe(false)
    })
  })

  describe("Context Matching", () => {
    it("should respect typing state", () => {
      const handler: KeyboardHandler = {
        id: "test",
        shortcuts: ["Cmd+N"],
        context: { requiresNoTyping: true },
        handler: vi.fn(),
      }

      const typingContext = { ...mockContext, isTyping: true }
      const notTypingContext = { ...mockContext, isTyping: false }

      expect(ContextMatcher.handlerApplies(handler, typingContext)).toBe(false)
      expect(ContextMatcher.handlerApplies(handler, notTypingContext)).toBe(true)
    })

    it("should match view requirements", () => {
      const handler: KeyboardHandler = {
        id: "test",
        shortcuts: ["J"],
        context: { requiresView: "today" },
        handler: vi.fn(),
      }

      const todayContext = { ...mockContext, currentView: "today" }
      const inboxContext = { ...mockContext, currentView: "inbox" }

      expect(ContextMatcher.handlerApplies(handler, todayContext)).toBe(true)
      expect(ContextMatcher.handlerApplies(handler, inboxContext)).toBe(false)
    })

    it("should match component requirements", () => {
      const handler: KeyboardHandler = {
        id: "test",
        shortcuts: ["Escape"],
        context: { requiresComponent: "task-side-panel" },
        handler: vi.fn(),
      }

      const taskPanelContext = { ...mockContext, activeComponent: "task-side-panel" }
      const noComponentContext = { ...mockContext, activeComponent: null }

      expect(ContextMatcher.handlerApplies(handler, taskPanelContext)).toBe(true)
      expect(ContextMatcher.handlerApplies(handler, noComponentContext)).toBe(false)
    })

    it("should respect dialog exclusions", () => {
      const handler: KeyboardHandler = {
        id: "test",
        shortcuts: ["G"],
        context: { excludeDialogs: true },
        handler: vi.fn(),
      }

      const noDialogContext = { ...mockContext, isAnyDialogOpen: false }
      const dialogOpenContext = { ...mockContext, isAnyDialogOpen: true }

      expect(ContextMatcher.handlerApplies(handler, noDialogContext)).toBe(true)
      expect(ContextMatcher.handlerApplies(handler, dialogOpenContext)).toBe(false)
    })

    it("should match specific dialog requirements", () => {
      const handler: KeyboardHandler = {
        id: "test",
        shortcuts: ["Escape"],
        context: { requiresDialog: "task-panel" },
        handler: vi.fn(),
      }

      const taskPanelOpenContext = { ...mockContext, showTaskPanel: true }
      const taskPanelClosedContext = { ...mockContext, showTaskPanel: false }

      expect(ContextMatcher.handlerApplies(handler, taskPanelOpenContext)).toBe(true)
      expect(ContextMatcher.handlerApplies(handler, taskPanelClosedContext)).toBe(false)
    })

    it("should match task requirements", () => {
      const handler: KeyboardHandler = {
        id: "test",
        shortcuts: ["Space"],
        context: { requiresTask: true },
        handler: vi.fn(),
      }

      const withTaskContext = {
        ...mockContext,
        selectedTask: {
          id: TEST_TASK_ID_1,
          title: "Test",
          completed: false,
          priority: DEFAULT_TASK_PRIORITY satisfies TaskPriority,
          sectionId: TEST_SECTION_ID_1,
          labels: [],
          subtasks: [],
          comments: [],
          createdAt: new Date(),
          recurringMode: "dueDate" as const,
        },
      }
      const noTaskContext = { ...mockContext, selectedTask: null }

      expect(ContextMatcher.handlerApplies(handler, withTaskContext)).toBe(true)
      expect(ContextMatcher.handlerApplies(handler, noTaskContext)).toBe(false)
    })
  })

  describe("Priority Sorting", () => {
    it("should sort handlers by priority (highest first)", () => {
      const handlers = new Map<string, KeyboardHandler>([
        [
          "low",
          {
            id: "low",
            shortcuts: ["Escape"],
            context: { priority: 1 },
            handler: vi.fn(),
          },
        ],
        [
          "high",
          {
            id: "high",
            shortcuts: ["Escape"],
            context: { priority: 10 },
            handler: vi.fn(),
          },
        ],
        [
          "medium",
          {
            id: "medium",
            shortcuts: ["Escape"],
            context: { priority: 5 },
            handler: vi.fn(),
          },
        ],
      ])

      const sorted = ContextMatcher.getApplicableHandlers(handlers, mockContext)
      expect(sorted.map((h) => h.id)).toEqual(["high", "medium", "low"])
    })

    it("should handle missing priority (defaults to 0)", () => {
      const handlers = new Map<string, KeyboardHandler>([
        [
          "no-priority",
          {
            id: "no-priority",
            shortcuts: ["Escape"],
            context: {},
            handler: vi.fn(),
          },
        ],
        [
          "with-priority",
          {
            id: "with-priority",
            shortcuts: ["Escape"],
            context: { priority: 5 },
            handler: vi.fn(),
          },
        ],
      ])

      const sorted = ContextMatcher.getApplicableHandlers(handlers, mockContext)
      expect(sorted.map((h) => h.id)).toEqual(["with-priority", "no-priority"])
    })
  })

  describe("Conflict Detection", () => {
    it("should detect shortcut conflicts", () => {
      const handlers = new Map<string, KeyboardHandler>([
        [
          "handler1",
          {
            id: "handler1",
            shortcuts: ["Escape"],
            context: {},
            handler: vi.fn(),
          },
        ],
        [
          "handler2",
          {
            id: "handler2",
            shortcuts: ["Escape"],
            context: {},
            handler: vi.fn(),
          },
        ],
      ])

      const conflicts = ContextMatcher.findShortcutConflicts(handlers, mockContext)
      expect(conflicts).toHaveLength(1)
      const firstConflict = conflicts[0]
      if (!firstConflict) {
        throw new Error("Expected to find first conflict")
      }
      expect(firstConflict.shortcut).toBe("Escape")
      expect(firstConflict.handlers).toHaveLength(2)
    })

    it("should not report conflicts for different contexts", () => {
      const handlers = new Map<string, KeyboardHandler>([
        [
          "global",
          {
            id: "global",
            shortcuts: ["Escape"],
            context: { excludeDialogs: true },
            handler: vi.fn(),
          },
        ],
        [
          "dialog",
          {
            id: "dialog",
            shortcuts: ["Escape"],
            context: { requiresDialog: "task-panel" },
            handler: vi.fn(),
          },
        ],
      ])

      const conflicts = ContextMatcher.findShortcutConflicts(handlers, mockContext)
      expect(conflicts).toHaveLength(0)
    })
  })

  describe("Context State Management", () => {
    it("should update active component", () => {
      store.set(activeComponentAtom, "task-form")
      expect(store.get(activeComponentAtom)).toBe("task-form")

      store.set(activeComponentAtom, null)
      expect(store.get(activeComponentAtom)).toBe(null)
    })

    it("should update typing state", () => {
      store.set(isTypingAtom, true)
      expect(store.get(isTypingAtom)).toBe(true)

      store.set(isTypingAtom, false)
      expect(store.get(isTypingAtom)).toBe(false)
    })
  })

  describe("Integration Tests", () => {
    it("should provide filtered applicable handlers", () => {
      // Register handlers with different contexts
      const globalHandler: KeyboardHandler = {
        id: "global",
        shortcuts: ["Cmd+N"],
        context: { excludeDialogs: true, priority: 10 },
        handler: vi.fn(),
      }

      const dialogHandler: KeyboardHandler = {
        id: "dialog",
        shortcuts: ["Escape"],
        context: { requiresDialog: "task-panel", priority: 20 },
        handler: vi.fn(),
      }

      store.set(registerKeyboardHandlerAtom, globalHandler)
      store.set(registerKeyboardHandlerAtom, dialogHandler)

      // Test with no dialogs open - use ContextMatcher for proper filtering
      const allHandlers = store.get(keyboardHandlersAtom)
      const context = store.get(keyboardContextAtom)
      const applicableWithNoDialogs = ContextMatcher.getApplicableHandlers(allHandlers, context)
      expect(applicableWithNoDialogs.map((h) => h.id)).toContain("global")
      expect(applicableWithNoDialogs.map((h) => h.id)).not.toContain("dialog")
    })
  })

  describe("Error Handling", () => {
    it("should handle invalid handler registration gracefully", () => {
      const invalidHandler: {
        id: string
        shortcuts: string[]
        context: Record<string, unknown>
        handler: () => boolean
      } = {
        id: "invalid",
        shortcuts: [],
        context: {},
        handler: vi.fn(() => false),
      }

      expect(() => {
        store.set(registerKeyboardHandlerAtom, invalidHandler)
      }).not.toThrow()
    })

    it("should handle unregistering non-existent handlers", () => {
      expect(() => {
        store.set(unregisterKeyboardHandlerAtom, "non-existent")
      }).not.toThrow()
    })
  })
})
