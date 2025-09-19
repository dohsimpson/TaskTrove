import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook } from "@testing-library/react"
import {
  useKeyboardShortcuts,
  useGlobalShortcuts,
  useDialogShortcuts,
  useTaskShortcuts,
  useViewShortcuts,
  useFocusShortcuts,
  findMatchingShortcut,
} from "./use-keyboard-shortcuts"

// Mock Jotai
const mockJotai = vi.hoisted(() => ({
  useSetAtom: vi.fn(() => vi.fn()),
  useAtom: vi.fn(() => [null, vi.fn()]),
  useAtomValue: vi.fn(() => null),
  atom: vi.fn(() => ({
    debugLabel: undefined,
    read: vi.fn(),
    write: vi.fn(),
  })),
}))

vi.mock("jotai", () => mockJotai)

// Mock the keyboard context atoms
vi.mock("@/lib/atoms/ui/keyboard-context", () => ({
  registerKeyboardHandlerAtom: "mockRegisterKeyboardHandlerAtom",
  unregisterKeyboardHandlerAtom: "mockUnregisterKeyboardHandlerAtom",
  setActiveComponentAtom: "mockSetActiveComponentAtom",
}))

// Mock the global keyboard manager
vi.mock("@/hooks/use-global-keyboard-manager", () => ({
  matchesShortcut: vi.fn((shortcut: string, event: KeyboardEvent) => {
    // Simple mock implementation for testing
    if (shortcut === "Cmd+N" && event.key === "n" && (event.metaKey || event.ctrlKey)) return true
    if (shortcut === "Escape" && event.key === "Escape") return true
    if (shortcut === "Space" && event.key === " ") return true
    return false
  }),
}))

describe("useKeyboardShortcuts", () => {
  let mockRegisterHandler: ReturnType<typeof vi.fn>
  let mockUnregisterHandler: ReturnType<typeof vi.fn>
  let mockSetActiveComponent: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockRegisterHandler = vi.fn()
    mockUnregisterHandler = vi.fn()
    mockSetActiveComponent = vi.fn()

    // @ts-expect-error - Mock implementation typing
    mockJotai.useSetAtom.mockImplementation((_atom: unknown) => {
      if (_atom === "mockRegisterKeyboardHandlerAtom") return mockRegisterHandler
      if (_atom === "mockUnregisterKeyboardHandlerAtom") return mockUnregisterHandler
      if (_atom === "mockSetActiveComponentAtom") return mockSetActiveComponent
      return vi.fn()
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("useKeyboardShortcuts", () => {
    it("registers keyboard shortcuts on mount", () => {
      const mockHandler = vi.fn()
      const shortcuts = {
        "Cmd+N": mockHandler,
        Escape: mockHandler,
      }

      renderHook(() =>
        useKeyboardShortcuts(shortcuts, {
          componentId: "test-component",
          priority: 10,
        }),
      )

      expect(mockRegisterHandler).toHaveBeenCalledOnce()
      const firstCall = mockRegisterHandler.mock.calls[0]
      if (!firstCall || !firstCall[0]) {
        throw new Error("Expected mockRegisterHandler to have been called with handler")
      }
      const registeredHandler = firstCall[0]

      expect(registeredHandler.shortcuts).toEqual(["Cmd+N", "Escape"])
      expect(registeredHandler.context.requiresComponent).toBe("test-component")
      expect(registeredHandler.context.priority).toBe(10)
    })

    it("unregisters shortcuts on unmount", () => {
      const mockHandler = vi.fn()
      const shortcuts = { "Cmd+N": mockHandler }

      const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts))

      unmount()

      expect(mockUnregisterHandler).toHaveBeenCalledOnce()
    })

    it("sets active component when componentId is provided", () => {
      const mockHandler = vi.fn()
      const shortcuts = { "Cmd+N": mockHandler }

      renderHook(() =>
        useKeyboardShortcuts(shortcuts, {
          componentId: "test-component",
        }),
      )

      expect(mockSetActiveComponent).toHaveBeenCalledWith("test-component")
    })

    it("does not register when enabled is false", () => {
      const mockHandler = vi.fn()
      const shortcuts = { "Cmd+N": mockHandler }

      renderHook(() =>
        useKeyboardShortcuts(shortcuts, {
          enabled: false,
        }),
      )

      expect(mockRegisterHandler).not.toHaveBeenCalled()
    })

    it("re-registers when shortcuts change", () => {
      const mockHandler = vi.fn()
      let shortcuts: Record<string, (event: KeyboardEvent) => void> = { "Cmd+N": mockHandler }

      const { rerender } = renderHook(({ shortcuts }) => useKeyboardShortcuts(shortcuts), {
        initialProps: { shortcuts },
      })

      expect(mockRegisterHandler).toHaveBeenCalledTimes(1)

      // Change shortcuts
      shortcuts = { Escape: mockHandler }
      rerender({ shortcuts })

      expect(mockUnregisterHandler).toHaveBeenCalledTimes(1)
      expect(mockRegisterHandler).toHaveBeenCalledTimes(2)
    })

    it("handles event properly when shortcut matches", () => {
      const mockHandler = vi.fn(() => true)
      const shortcuts = { "Cmd+N": mockHandler }

      renderHook(() => useKeyboardShortcuts(shortcuts))

      const firstCall = mockRegisterHandler.mock.calls[0]
      if (!firstCall || !firstCall[0]) {
        throw new Error("Expected mockRegisterHandler to have been called with handler")
      }
      const registeredHandler = firstCall[0]
      const mockEvent = new KeyboardEvent("keydown", { key: "n", metaKey: true })
      const mockContext = {}

      const result = registeredHandler.handler(mockEvent, mockContext)

      expect(result).toBe(true)
      expect(mockHandler).toHaveBeenCalledWith(mockEvent)
    })
  })

  describe("useGlobalShortcuts", () => {
    it("configures shortcuts for global use", () => {
      const mockHandler = vi.fn()
      const shortcuts = { "Cmd+N": mockHandler }

      renderHook(() => useGlobalShortcuts(shortcuts))

      expect(mockRegisterHandler).toHaveBeenCalledOnce()
      const firstCall = mockRegisterHandler.mock.calls[0]
      if (!firstCall || !firstCall[0]) {
        throw new Error("Expected mockRegisterHandler to have been called with handler")
      }
      const registeredHandler = firstCall[0]

      expect(registeredHandler.context.excludeDialogs).toBe(true)
      expect(registeredHandler.context.priority).toBe(10)
    })

    it("handles void-returning functions", () => {
      const mockHandler = vi.fn() // Returns undefined
      const shortcuts = { "Cmd+N": mockHandler }

      renderHook(() => useGlobalShortcuts(shortcuts))

      const firstCall = mockRegisterHandler.mock.calls[0]
      if (!firstCall || !firstCall[0]) {
        throw new Error("Expected mockRegisterHandler to have been called with handler")
      }
      const registeredHandler = firstCall[0]
      const mockEvent = new KeyboardEvent("keydown", { key: "n", metaKey: true })
      const mockContext = {}

      const result = registeredHandler.handler(mockEvent, mockContext)

      expect(result).toBe(true) // Should return true for void functions
      expect(mockHandler).toHaveBeenCalledWith()
    })
  })

  describe("useDialogShortcuts", () => {
    it("configures shortcuts for specific dialog", () => {
      const mockHandler = vi.fn()
      const shortcuts = { Escape: mockHandler }

      renderHook(() => useDialogShortcuts(shortcuts, "quick-add"))

      expect(mockRegisterHandler).toHaveBeenCalledOnce()
      const firstCall = mockRegisterHandler.mock.calls[0]
      if (!firstCall || !firstCall[0]) {
        throw new Error("Expected mockRegisterHandler to have been called with handler")
      }
      const registeredHandler = firstCall[0]

      expect(registeredHandler.context.requiresDialog).toBe("quick-add")
      expect(registeredHandler.context.priority).toBe(20)
    })
  })

  describe("useTaskShortcuts", () => {
    it("configures shortcuts that require a selected task", () => {
      const mockHandler = vi.fn()
      const shortcuts = { Delete: mockHandler }

      renderHook(() => useTaskShortcuts(shortcuts))

      expect(mockRegisterHandler).toHaveBeenCalledOnce()
      const firstCall = mockRegisterHandler.mock.calls[0]
      if (!firstCall || !firstCall[0]) {
        throw new Error("Expected mockRegisterHandler to have been called with handler")
      }
      const registeredHandler = firstCall[0]

      expect(registeredHandler.context.requiresTask).toBe(true)
      expect(registeredHandler.context.priority).toBe(25)
    })
  })

  describe("useViewShortcuts", () => {
    it("configures shortcuts for specific view", () => {
      const mockHandler = vi.fn()
      const shortcuts = { J: mockHandler }

      renderHook(() => useViewShortcuts(shortcuts, "kanban"))

      expect(mockRegisterHandler).toHaveBeenCalledOnce()
      const firstCall = mockRegisterHandler.mock.calls[0]
      if (!firstCall || !firstCall[0]) {
        throw new Error("Expected mockRegisterHandler to have been called with handler")
      }
      const registeredHandler = firstCall[0]

      expect(registeredHandler.context.requiresView).toBe("kanban")
      expect(registeredHandler.context.priority).toBe(15)
    })
  })

  describe("useFocusShortcuts", () => {
    it("configures shortcuts for focused elements", () => {
      const mockHandler = vi.fn()
      const shortcuts = { ArrowDown: mockHandler }

      renderHook(() => useFocusShortcuts(shortcuts, "[data-task-item]"))

      expect(mockRegisterHandler).toHaveBeenCalledOnce()
      const firstCall = mockRegisterHandler.mock.calls[0]
      if (!firstCall || !firstCall[0]) {
        throw new Error("Expected mockRegisterHandler to have been called with handler")
      }
      const registeredHandler = firstCall[0]

      expect(registeredHandler.context.requiresElement).toBe("[data-task-item]")
      expect(registeredHandler.context.requiresFocus).toBe(true)
      expect(registeredHandler.context.priority).toBe(30)
    })
  })

  describe("findMatchingShortcut", () => {
    it("finds matching shortcut from array", () => {
      const shortcuts = ["Cmd+N", "Escape", "Space"]
      const mockEvent = new KeyboardEvent("keydown", { key: "Escape" })

      const result = findMatchingShortcut(shortcuts, mockEvent)

      expect(result).toBe("Escape")
    })

    it("returns null when no shortcut matches", () => {
      const shortcuts = ["Cmd+N", "Escape"]
      const mockEvent = new KeyboardEvent("keydown", { key: "a" })

      const result = findMatchingShortcut(shortcuts, mockEvent)

      expect(result).toBeNull()
    })
  })

  describe("hook options", () => {
    it("supports custom priority", () => {
      const mockHandler = vi.fn()
      const shortcuts = { "Cmd+N": mockHandler }

      renderHook(() => useKeyboardShortcuts(shortcuts, { priority: 50 }))

      const firstCall = mockRegisterHandler.mock.calls[0]
      if (!firstCall || !firstCall[0]) {
        throw new Error("Expected mockRegisterHandler to have been called with handler")
      }
      const registeredHandler = firstCall[0]
      expect(registeredHandler.context.priority).toBe(50)
    })

    it("sets requiresNoTyping to true by default", () => {
      const mockHandler = vi.fn()
      const shortcuts = { "Cmd+N": mockHandler }

      renderHook(() => useKeyboardShortcuts(shortcuts))

      const firstCall = mockRegisterHandler.mock.calls[0]
      if (!firstCall || !firstCall[0]) {
        throw new Error("Expected mockRegisterHandler to have been called with handler")
      }
      const registeredHandler = firstCall[0]
      expect(registeredHandler.context.requiresNoTyping).toBe(true)
    })

    it("allows disabling requiresNoTyping", () => {
      const mockHandler = vi.fn()
      const shortcuts = { "Cmd+N": mockHandler }

      renderHook(() => useKeyboardShortcuts(shortcuts, { requiresNoTyping: false }))

      const firstCall = mockRegisterHandler.mock.calls[0]
      if (!firstCall || !firstCall[0]) {
        throw new Error("Expected mockRegisterHandler to have been called with handler")
      }
      const registeredHandler = firstCall[0]
      expect(registeredHandler.context.requiresNoTyping).toBe(false)
    })

    it("supports all context options", () => {
      const mockHandler = vi.fn()
      const shortcuts = { "Cmd+N": mockHandler }

      renderHook(() =>
        useKeyboardShortcuts(shortcuts, {
          requiresView: "today",
          requiresDialog: "quick-add",
          excludeDialogs: false,
          requiresTask: true,
          requiresFocus: true,
          requiresElement: "[data-test]",
        }),
      )

      const firstCall = mockRegisterHandler.mock.calls[0]
      if (!firstCall || !firstCall[0]) {
        throw new Error("Expected mockRegisterHandler to have been called with handler")
      }
      const registeredHandler = firstCall[0]
      expect(registeredHandler.context.requiresView).toBe("today")
      expect(registeredHandler.context.requiresDialog).toBe("quick-add")
      expect(registeredHandler.context.excludeDialogs).toBe(false)
      expect(registeredHandler.context.requiresTask).toBe(true)
      expect(registeredHandler.context.requiresFocus).toBe(true)
      expect(registeredHandler.context.requiresElement).toBe("[data-test]")
    })
  })
})
