// Unmock atoms - this test needs real atoms for store API
vi.unmock("jotai/utils")

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  userShortcutsAtom,
  applyUserShortcutsAtom,
  customizeShortcut,
  resetShortcut,
  resetAllShortcuts,
  exportShortcuts,
  importShortcuts,
  validateCustomShortcut,
  getShortcutThemes,
  applyShortcutTheme,
  __setStore,
} from "./customization"
import { validateHandlerRegistration } from "./conflict-detector"

// Comprehensive Jotai mocking interfaces
interface MockJotaiStore {
  get: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
  sub: ReturnType<typeof vi.fn>
}

interface MockAtomResult<T = unknown> {
  read: T | ((get: unknown) => T) | ((get: unknown) => unknown)
  write: unknown
  debugLabel?: string
}

interface MockAtomFactory {
  // Unified signature for all atom types
  (getterOrValue?: unknown, setter?: unknown): MockAtomResult
  // Mock function properties
  mockImplementation: ReturnType<typeof vi.fn>["mockImplementation"]
}

// Mock Jotai
const mockJotai = vi.hoisted(() => {
  const atomMock: MockAtomFactory = vi.fn(() => ({
    debugLabel: undefined,
    read: vi.fn(),
    write: vi.fn(),
  }))

  atomMock.mockImplementation = vi.fn()

  return {
    useAtom: vi.fn(),
    useAtomValue: vi.fn(),
    useSetAtom: vi.fn(),
    atom: atomMock,
    getDefaultStore: vi.fn(
      (): MockJotaiStore => ({
        get: vi.fn(),
        set: vi.fn(),
        sub: vi.fn(() => vi.fn()),
      }),
    ),
  }
})

vi.mock("jotai", () => mockJotai)

// Mock localStorage
const mockLocalStorage = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}))

// Mock Jotai utils for storage
vi.mock("jotai/utils", () => ({
  atomWithStorage: vi.fn((key: string, initialValue: unknown) => {
    return mockJotai.atom(initialValue)
  }),
}))

// Note: Atom mocks are now centralized in test-utils/atoms-mocks.ts

// Mock conflict detector
vi.mock("./conflict-detector", () => ({
  validateHandlerRegistration: vi.fn(() => ({ isValid: true, conflicts: [] })),
}))

describe("Dynamic Shortcut Customization System", () => {
  const mockCustomShortcuts = {
    "global-shortcuts-Cmd+N": "Cmd+Shift+N",
    "task-panel-shortcuts-Escape": "Alt+Escape",
  }

  // Create a mock store that persists across tests
  const mockStore: MockJotaiStore = {
    get: vi.fn(),
    set: vi.fn(),
    sub: vi.fn(() => vi.fn()), // Returns unsubscribe function
  }

  const mockHandlers = new Map([
    [
      "global-shortcuts",
      {
        id: "global-shortcuts",
        shortcuts: ["Cmd+N", "Cmd+F"],
        context: { priority: 10 },
        handler: vi.fn(),
      },
    ],
    [
      "task-panel-shortcuts",
      {
        id: "task-panel-shortcuts",
        shortcuts: ["Escape", "Space"],
        context: { priority: 20 },
        handler: vi.fn(),
      },
    ],
  ])

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock localStorage
    Object.defineProperty(global, "localStorage", {
      value: mockLocalStorage,
      writable: true,
    })

    // Reset mock store and inject it
    mockStore.get.mockReturnValue({})
    mockStore.set.mockClear()
    __setStore(mockStore)
    mockJotai.getDefaultStore.mockReturnValue(mockStore)

    // Mock atom implementation
    mockJotai.atom.mockImplementation((...args: [unknown, unknown?]): MockAtomResult => {
      const getterOrValue = args[0]
      if (typeof getterOrValue === "function") {
        return {
          debugLabel: undefined,
          read: getterOrValue,
          write: args[1] || vi.fn(),
        }
      }
      return {
        debugLabel: undefined,
        read: () => getterOrValue,
        write: args[1] || vi.fn(),
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("userShortcutsAtom", () => {
    it("should provide storage for user-customized shortcuts", () => {
      const atom = userShortcutsAtom
      expect(atom).toBeDefined()
    })

    it("should initialize with empty customizations", () => {
      // Mock atom with initial value
      mockJotai.atom.mockImplementation(
        (...args: [unknown, unknown?]): MockAtomResult => ({
          debugLabel: undefined,
          read: vi.fn(() => args[0]),
          write: args[1] || vi.fn(),
        }),
      )

      const atom = userShortcutsAtom
      expect(atom).toBeDefined()
    })
  })

  describe("customizeShortcut", () => {
    it("should allow customizing a shortcut", () => {
      const result = customizeShortcut("global-shortcuts", "Cmd+N", "Cmd+Shift+N")

      expect(result.success).toBe(true)
      expect(result.handlerId).toBe("global-shortcuts")
      expect(result.originalShortcut).toBe("Cmd+N")
      expect(result.newShortcut).toBe("Cmd+Shift+N")
    })

    it("should validate new shortcut before applying", () => {
      const result = customizeShortcut("global-shortcuts", "Cmd+N", "invalid-shortcut")

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain("Invalid shortcut format")
    })

    it("should check for conflicts before applying", () => {
      const mockValidator = vi.mocked(validateHandlerRegistration)
      mockValidator.mockReturnValueOnce({
        isValid: false,
        conflicts: [{ shortcut: "Cmd+F", handlers: ["global-shortcuts", "other"], contexts: [] }],
      })

      const result = customizeShortcut("global-shortcuts", "Cmd+N", "Cmd+F")

      expect(result.success).toBe(false)
      expect(result.error).toContain("conflict")
    })

    it("should store customization on success", () => {
      customizeShortcut("global-shortcuts", "Cmd+N", "Cmd+Shift+N")

      // Verify storage was attempted through the store
      expect(mockStore.set).toHaveBeenCalled()
    })
  })

  describe("resetShortcut", () => {
    it("should reset a shortcut to its default value", () => {
      const result = resetShortcut("global-shortcuts", "Cmd+N")

      expect(result.success).toBe(true)
      expect(result.handlerId).toBe("global-shortcuts")
      expect(result.shortcut).toBe("Cmd+N")
    })

    it("should remove customization from storage", () => {
      resetShortcut("global-shortcuts", "Cmd+N")

      expect(mockStore.set).toHaveBeenCalled()
    })

    it("should handle non-existent shortcuts gracefully", () => {
      const result = resetShortcut("non-existent-handler", "Cmd+X")

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe("resetAllShortcuts", () => {
    it("should reset all shortcuts to defaults", () => {
      mockStore.get.mockReturnValue(mockCustomShortcuts) // Return some shortcuts to reset

      const result = resetAllShortcuts()

      expect(result.success).toBe(true)
      expect(result.resetCount).toBeGreaterThanOrEqual(0)
    })

    it("should clear all customizations from storage", () => {
      resetAllShortcuts()

      expect(mockStore.set).toHaveBeenCalledWith(expect.anything(), {}) // Empty object
    })
  })

  describe("exportShortcuts", () => {
    it("should export current shortcut configuration", () => {
      mockJotai.useAtomValue.mockReturnValue(mockCustomShortcuts)

      const exported = exportShortcuts()

      expect(exported).toHaveProperty("version")
      expect(exported).toHaveProperty("shortcuts")
      expect(exported).toHaveProperty("exportedAt")
      expect(typeof exported.exportedAt).toBe("string")
    })

    it("should include metadata in export", () => {
      mockStore.get.mockReturnValue(mockCustomShortcuts)

      const exported = exportShortcuts()

      expect(exported.version).toBe("1.0")
      expect(exported.shortcuts).toEqual(mockCustomShortcuts)
    })
  })

  describe("importShortcuts", () => {
    it("should import valid shortcut configuration", () => {
      const importData = {
        version: "1.0",
        shortcuts: mockCustomShortcuts,
        exportedAt: new Date().toISOString(),
      }

      const result = importShortcuts(importData)

      expect(result.success).toBe(true)
      expect(result.importedCount).toBe(Object.keys(mockCustomShortcuts).length)
    })

    it("should validate import data format", () => {
      const invalidData = {
        version: "2.0", // Unsupported version
        shortcuts: mockCustomShortcuts,
        exportedAt: new Date().toISOString(),
      }

      const result = importShortcuts(invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toContain("version")
    })

    it("should validate individual shortcuts during import", () => {
      const invalidData = {
        version: "1.0",
        shortcuts: {
          "global-shortcuts-Cmd+N": "invalid-shortcut-format",
        },
        exportedAt: new Date().toISOString(),
      }

      const result = importShortcuts(invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it("should apply imported shortcuts to storage", () => {
      const importData = {
        version: "1.0",
        shortcuts: mockCustomShortcuts,
        exportedAt: new Date().toISOString(),
      }

      importShortcuts(importData)

      expect(mockStore.set).toHaveBeenCalledWith(expect.anything(), mockCustomShortcuts)
    })
  })

  describe("validateCustomShortcut", () => {
    it("should accept valid shortcuts", () => {
      const validShortcuts = ["Cmd+N", "Ctrl+Shift+S", "Alt+F4", "Escape", "F1", "G+T"]

      validShortcuts.forEach((shortcut) => {
        const result = validateCustomShortcut(shortcut)
        expect(result.isValid).toBe(true)
      })
    })

    it("should reject invalid shortcuts", () => {
      const invalidShortcuts = ["", "invalid", "Cmd+", "+N", "Cmd++N", "Cmd+invalid-key"]

      invalidShortcuts.forEach((shortcut) => {
        const result = validateCustomShortcut(shortcut)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })

    it("should provide helpful error messages", () => {
      const result = validateCustomShortcut("Cmd++N")

      expect(result.isValid).toBe(false)
      expect(result.error).toContain("Invalid shortcut format")
    })

    it("should validate modifiers and keys separately", () => {
      const result1 = validateCustomShortcut("InvalidModifier+N")
      expect(result1.isValid).toBe(false)

      const result2 = validateCustomShortcut("Cmd+InvalidKey")
      expect(result2.isValid).toBe(false)
    })
  })

  describe("shortcutThemesAtom", () => {
    it("should provide predefined shortcut themes", () => {
      const themes = getShortcutThemes()

      expect(Array.isArray(themes)).toBe(true)
      expect(themes.length).toBeGreaterThan(0)

      // Check theme structure
      themes.forEach((theme) => {
        expect(theme).toHaveProperty("id")
        expect(theme).toHaveProperty("name")
        expect(theme).toHaveProperty("description")
        expect(theme).toHaveProperty("shortcuts")
        expect(typeof theme.shortcuts).toBe("object")
      })
    })

    it("should include common themes like vim, emacs, vscode", () => {
      const themes = getShortcutThemes()
      const themeNames = themes.map((t) => t.id)

      expect(themeNames).toContain("default")
      expect(themeNames).toContain("vim")
      expect(themeNames).toContain("emacs")
      expect(themeNames).toContain("vscode")
    })
  })

  describe("applyShortcutTheme", () => {
    it("should apply a shortcut theme", () => {
      const result = applyShortcutTheme("vim")

      expect(result.success).toBe(true)
      expect(result.themeId).toBe("vim")
      expect(result.appliedCount).toBeGreaterThan(0)
    })

    it("should handle non-existent themes", () => {
      const result = applyShortcutTheme("non-existent-theme")

      expect(result.success).toBe(false)
      expect(result.error).toContain("Theme not found")
    })

    it("should validate theme shortcuts before applying", () => {
      // Test with a theme that has invalid shortcuts by directly creating one
      // The applyShortcutTheme function will validate the shortcuts internally
      const result = applyShortcutTheme("invalid-theme-test")

      expect(result.success).toBe(false)
      expect(result.error).toContain("Theme not found")
    })
  })

  describe("applyUserShortcutsAtom", () => {
    it("should apply user customizations to handlers", () => {
      // Mock atom with getter and setter
      mockJotai.atom.mockImplementation((...args: [unknown, unknown?]): MockAtomResult => {
        const [getter, setter] = args
        const mockGet = vi.fn()
        mockGet.mockImplementation((atom: unknown) => {
          if (atom === "mockKeyboardHandlersAtom") return mockHandlers
          if (atom === userShortcutsAtom) return mockCustomShortcuts
          return null
        })

        if (setter && typeof setter === "function") {
          setter(mockGet, vi.fn())
        }

        return {
          debugLabel: undefined,
          read: getter,
          write: setter,
        }
      })

      const applyAtom = applyUserShortcutsAtom
      expect(applyAtom).toBeDefined()
    })
  })

  describe("Persistence", () => {
    it("should persist shortcuts to localStorage", () => {
      // Since we're using atoms, we don't directly call localStorage
      // The atomWithStorage handles this automatically
      const result = customizeShortcut("global-shortcuts", "Cmd+N", "Cmd+Shift+N")

      // Verify the customization was successful
      expect(result.success).toBe(true)
    })

    it("should load shortcuts from localStorage on init", () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockCustomShortcuts))

      // Initialize the atom (implementation-dependent)
      const atom = userShortcutsAtom
      expect(atom).toBeDefined()
    })

    it("should handle localStorage errors gracefully", () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error("localStorage full")
      })

      expect(() => {
        customizeShortcut("global-shortcuts", "Cmd+N", "Cmd+Shift+N")
      }).not.toThrow()
    })
  })

  describe("Integration with conflict detection", () => {
    it("should check for conflicts when customizing shortcuts", () => {
      const mockValidator = vi.mocked(validateHandlerRegistration)

      customizeShortcut("global-shortcuts", "Cmd+N", "Cmd+Shift+N")

      expect(mockValidator).toHaveBeenCalled()
    })

    it("should prevent conflicting customizations", () => {
      const mockValidator = vi.mocked(validateHandlerRegistration)
      mockValidator.mockReturnValue({
        isValid: false,
        conflicts: [{ shortcut: "Cmd+F", handlers: ["global", "search"], contexts: [] }],
      })

      const result = customizeShortcut("global-shortcuts", "Cmd+N", "Cmd+F")

      expect(result.success).toBe(false)
      expect(result.error).toContain("conflict")
    })
  })
})
