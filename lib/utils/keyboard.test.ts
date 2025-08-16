import { describe, it, expect, vi, afterEach } from "vitest"
import { createKeyboardHandler, getKeyboardShortcuts, formatKeyboardShortcut } from "./keyboard"
import type { KeyboardEvent } from "react"

// Mock React keyboard event - properly typed for testing
function createMockKeyboardEvent(options: {
  key: string
  shiftKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
}): KeyboardEvent<HTMLElement> {
  // Create minimal mock that satisfies TypeScript without type assertions
  const mockEvent = {
    key: options.key,
    shiftKey: options.shiftKey || false,
    ctrlKey: options.ctrlKey || false,
    metaKey: options.metaKey || false,
    altKey: options.altKey || false,
    preventDefault: vi.fn(),
    // Add minimal KeyboardEvent properties to satisfy TypeScript
    currentTarget: Object.create(HTMLElement.prototype),
    target: Object.create(HTMLElement.prototype),
    type: "keydown",
    bubbles: false,
    cancelable: true,
    defaultPrevented: false,
    eventPhase: 2,
    isTrusted: true,
    stopPropagation: vi.fn(),
    timeStamp: Date.now(),
    nativeEvent: Object.create(KeyboardEvent.prototype),
    isDefaultPrevented: () => false,
    isPropagationStopped: () => false,
    persist: vi.fn(),
    // Additional KeyboardEvent properties
    charCode: 0,
    code: options.key,
    keyCode: 0,
    location: 0,
    repeat: false,
    which: 0,
    getModifierState: vi.fn(() => false),
    // Additional UI Event properties
    locale: "",
    detail: 0,
    // Minimal view mock that satisfies the interface
    view: Object.create(EventTarget.prototype),
  } satisfies KeyboardEvent<HTMLElement>

  return mockEvent
}

describe("createKeyboardHandler", () => {
  describe("Single-line behavior", () => {
    it("should call onSave when Enter is pressed", () => {
      const onSave = vi.fn()
      const onCancel = vi.fn()
      const handler = createKeyboardHandler({ multiline: false, onSave, onCancel })

      const event = createMockKeyboardEvent({ key: "Enter" })
      handler(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(onSave).toHaveBeenCalled()
      expect(onCancel).not.toHaveBeenCalled()
    })

    it("should call onCancel when Escape is pressed", () => {
      const onSave = vi.fn()
      const onCancel = vi.fn()
      const handler = createKeyboardHandler({ multiline: false, onSave, onCancel })

      const event = createMockKeyboardEvent({ key: "Escape" })
      handler(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(onCancel).toHaveBeenCalled()
      expect(onSave).not.toHaveBeenCalled()
    })

    it("should ignore Shift+Enter in single-line mode", () => {
      const onSave = vi.fn()
      const onCancel = vi.fn()
      const handler = createKeyboardHandler({ multiline: false, onSave, onCancel })

      const event = createMockKeyboardEvent({ key: "Enter", shiftKey: true })
      handler(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(onSave).toHaveBeenCalled()
    })

    it("should not react to other keys", () => {
      const onSave = vi.fn()
      const onCancel = vi.fn()
      const handler = createKeyboardHandler({ multiline: false, onSave, onCancel })

      const event = createMockKeyboardEvent({ key: "a" })
      handler(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(onSave).not.toHaveBeenCalled()
      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  describe("Multi-line behavior", () => {
    it("should call onSave when plain Enter is pressed", () => {
      const onSave = vi.fn()
      const onCancel = vi.fn()
      const handler = createKeyboardHandler({ multiline: true, onSave, onCancel })

      const event = createMockKeyboardEvent({ key: "Enter" })
      handler(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(onSave).toHaveBeenCalled()
      expect(onCancel).not.toHaveBeenCalled()
    })

    it("should allow newline when Shift+Enter is pressed (uniform behavior)", () => {
      const onSave = vi.fn()
      const onCancel = vi.fn()
      const handler = createKeyboardHandler({ multiline: true, onSave, onCancel })

      const event = createMockKeyboardEvent({ key: "Enter", shiftKey: true })
      handler(event)

      // Should NOT prevent default to allow newline
      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(onSave).not.toHaveBeenCalled()
      expect(onCancel).not.toHaveBeenCalled()
    })

    it("should call onSave when Ctrl+Enter is pressed (but Ctrl modifier is ignored)", () => {
      const onSave = vi.fn()
      const onCancel = vi.fn()
      const handler = createKeyboardHandler({ multiline: true, onSave, onCancel })

      const event = createMockKeyboardEvent({ key: "Enter", ctrlKey: true })
      handler(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(onSave).toHaveBeenCalled()
      expect(onCancel).not.toHaveBeenCalled()
    })

    it("should call onSave when Cmd+Enter is pressed (but Cmd modifier is ignored)", () => {
      const onSave = vi.fn()
      const onCancel = vi.fn()
      const handler = createKeyboardHandler({ multiline: true, onSave, onCancel })

      const event = createMockKeyboardEvent({ key: "Enter", metaKey: true })
      handler(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(onSave).toHaveBeenCalled()
      expect(onCancel).not.toHaveBeenCalled()
    })

    it("should call onCancel when Escape is pressed", () => {
      const onSave = vi.fn()
      const onCancel = vi.fn()
      const handler = createKeyboardHandler({ multiline: true, onSave, onCancel })

      const event = createMockKeyboardEvent({ key: "Escape" })
      handler(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(onCancel).toHaveBeenCalled()
      expect(onSave).not.toHaveBeenCalled()
    })

    it("should NOT allow newline with Alt+Enter (removed platform-specific behavior)", () => {
      const onSave = vi.fn()
      const onCancel = vi.fn()
      const handler = createKeyboardHandler({ multiline: true, onSave, onCancel })

      const event = createMockKeyboardEvent({ key: "Enter", altKey: true })
      handler(event)

      // Alt+Enter should now save (not create newline) for uniform behavior
      expect(event.preventDefault).toHaveBeenCalled()
      expect(onSave).toHaveBeenCalled()
      expect(onCancel).not.toHaveBeenCalled()
    })

    it("should prioritize Shift over Ctrl when both are pressed", () => {
      const onSave = vi.fn()
      const onCancel = vi.fn()
      const handler = createKeyboardHandler({ multiline: true, onSave, onCancel })

      const event = createMockKeyboardEvent({ key: "Enter", ctrlKey: true, shiftKey: true })
      handler(event)

      // Shift takes precedence, should allow newline (not prevent default)
      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(onSave).not.toHaveBeenCalled()
      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  describe("Optional handlers", () => {
    it("should work without onSave handler", () => {
      const handler = createKeyboardHandler({ multiline: false })

      const event = createMockKeyboardEvent({ key: "Enter" })
      expect(() => handler(event)).not.toThrow()
      expect(event.preventDefault).toHaveBeenCalled()
    })

    it("should work without onCancel handler", () => {
      const handler = createKeyboardHandler({ multiline: false })

      const event = createMockKeyboardEvent({ key: "Escape" })
      expect(() => handler(event)).not.toThrow()
      expect(event.preventDefault).toHaveBeenCalled()
    })
  })
})

describe("getKeyboardShortcuts", () => {
  it("should return single-line shortcuts", () => {
    const shortcuts = getKeyboardShortcuts(false)

    expect(shortcuts).toEqual({
      save: ["Enter"],
      cancel: ["Escape"],
    })
  })

  it("should return multi-line shortcuts with uniform Shift+Enter", () => {
    const shortcuts = getKeyboardShortcuts(true)

    expect(shortcuts).toEqual({
      save: ["Enter"],
      newline: ["Shift+Enter"],
      cancel: ["Escape"],
    })
  })

  it("should default to single-line when no parameter provided", () => {
    const shortcuts = getKeyboardShortcuts()

    expect(shortcuts).toEqual({
      save: ["Enter"],
      cancel: ["Escape"],
    })
  })
})

describe("formatKeyboardShortcut", () => {
  // Mock navigator for platform detection
  const originalNavigator = global.navigator

  afterEach(() => {
    global.navigator = originalNavigator
  })

  it("should format shortcuts for macOS", () => {
    Object.defineProperty(global, "navigator", {
      value: { platform: "MacIntel" },
      writable: true,
      configurable: true,
    })

    expect(formatKeyboardShortcut("Ctrl+Enter")).toBe("⌘Enter")
    expect(formatKeyboardShortcut("Alt+Enter")).toBe("⌥Enter")
    expect(formatKeyboardShortcut("Shift+Enter")).toBe("⇧Enter")
    expect(formatKeyboardShortcut("Cmd+Enter")).toBe("Cmd+Enter")
  })

  it("should format shortcuts for Windows/Linux", () => {
    Object.defineProperty(global, "navigator", {
      value: { platform: "Win32" },
      writable: true,
      configurable: true,
    })

    expect(formatKeyboardShortcut("Ctrl+Enter")).toBe("Ctrl+Enter")
    expect(formatKeyboardShortcut("Alt+Enter")).toBe("Alt+Enter")
    expect(formatKeyboardShortcut("Shift+Enter")).toBe("Shift+Enter")
    expect(formatKeyboardShortcut("Cmd+Enter")).toBe("Ctrl+Enter")
  })

  it("should handle shortcuts without modifiers", () => {
    Object.defineProperty(global, "navigator", {
      value: { platform: "MacIntel" },
      writable: true,
      configurable: true,
    })

    expect(formatKeyboardShortcut("Enter")).toBe("Enter")
    expect(formatKeyboardShortcut("Escape")).toBe("Escape")
  })

  it("should handle undefined navigator gracefully", () => {
    // Type-safe way to test undefined navigator
    const originalNavigator = global.navigator
    // Type-safe way to delete navigator property
    const globalObj: { navigator?: typeof global.navigator } = global
    delete globalObj.navigator

    expect(formatKeyboardShortcut("Ctrl+Enter")).toBe("Ctrl+Enter")
    expect(formatKeyboardShortcut("Cmd+Enter")).toBe("Ctrl+Enter")

    // Restore navigator
    global.navigator = originalNavigator
  })
})
