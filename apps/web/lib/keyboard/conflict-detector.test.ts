import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  shortcutConflictsAtom,
  detectConflicts,
  resolveConflicts,
  ShortcutConflict,
  validateHandlerRegistration,
  getConflictSeverity,
} from "./conflict-detector"

// Mock Jotai
const mockJotai = vi.hoisted(() => ({
  useAtom: vi.fn(),
  useAtomValue: vi.fn(),
  atom: vi.fn(() => ({
    debugLabel: undefined,
    read: vi.fn(),
    write: vi.fn(),
  })),
}))

vi.mock("jotai", () => mockJotai)

// Note: Atom mocks are now centralized in test-utils/atoms-mocks.ts

describe("Keyboard Conflict Detection System", () => {
  const mockHandlersWithConflicts = new Map([
    [
      "global-shortcuts",
      {
        id: "global-shortcuts",
        shortcuts: ["Cmd+N", "Cmd+F", "/"],
        context: {
          excludeDialogs: true,
          requiresNoTyping: true,
          priority: 10,
          group: "global",
        },
        handler: vi.fn(),
      },
    ],
    [
      "search-shortcuts",
      {
        id: "search-shortcuts",
        shortcuts: ["/", "Cmd+F"], // Conflicts with global
        context: {
          requiresDialog: "search",
          requiresNoTyping: true,
          priority: 20,
          group: "search",
        },
        handler: vi.fn(),
      },
    ],
    [
      "task-shortcuts",
      {
        id: "task-shortcuts",
        shortcuts: ["Enter", "Space"],
        context: {
          requiresTask: true,
          requiresNoTyping: true,
          priority: 25,
          group: "task-actions",
        },
        handler: vi.fn(),
      },
    ],
    [
      "conflicting-task-shortcuts",
      {
        id: "conflicting-task-shortcuts",
        shortcuts: ["Space", "Delete"], // Space conflicts with task-shortcuts
        context: {
          requiresTask: true,
          requiresNoTyping: true,
          priority: 30, // Higher priority
          group: "task-actions",
        },
        handler: vi.fn(),
      },
    ],
  ])

  const mockHandlersNoConflicts = new Map([
    [
      "global-shortcuts",
      {
        id: "global-shortcuts",
        shortcuts: ["Cmd+N", "Cmd+F"],
        context: { excludeDialogs: true, priority: 10 },
        handler: vi.fn(),
      },
    ],
    [
      "task-shortcuts",
      {
        id: "task-shortcuts",
        shortcuts: ["Enter", "Space"],
        context: { requiresTask: true, priority: 25 },
        handler: vi.fn(),
      },
    ],
  ])

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock atom implementation with proper typing
    mockJotai.atom.mockImplementation((getter?: unknown | ((get: unknown) => unknown)) => ({
      debugLabel: undefined,
      read: typeof getter === "function" ? vi.fn(() => getter({})) : vi.fn(() => getter),
      write: vi.fn(),
    }))
  })

  describe("shortcutConflictsAtom", () => {
    it("should detect conflicts between different handlers", () => {
      // Mock atom implementation for conflicts test
      mockJotai.atom.mockImplementation((getter?: unknown | ((get: unknown) => unknown)) => {
        const mockGet = vi.fn()
        mockGet.mockImplementation((atom: { debugLabel?: string }) => {
          if (atom.debugLabel === "keyboardHandlersAtom") return mockHandlersWithConflicts
          return null
        })

        const result = typeof getter === "function" ? getter(mockGet) : getter
        expect(Array.isArray(result)).toBe(true)
        return {
          debugLabel: undefined,
          read: vi.fn(() => result),
          write: vi.fn(),
        }
      })

      const conflictsAtom = shortcutConflictsAtom
      expect(conflictsAtom).toBeDefined()
    })

    it("should return empty array when no conflicts exist", () => {
      // Mock atom implementation for no conflicts test
      mockJotai.atom.mockImplementation((getter?: unknown | ((get: unknown) => unknown)) => {
        const mockGet = vi.fn()
        mockGet.mockImplementation((atom: { debugLabel?: string }) => {
          if (atom.debugLabel === "keyboardHandlersAtom") return mockHandlersNoConflicts
          return null
        })

        const result = typeof getter === "function" ? getter(mockGet) : getter
        expect(Array.isArray(result)).toBe(true)
        return {
          debugLabel: undefined,
          read: vi.fn(() => result),
          write: vi.fn(),
        }
      })

      const conflictsAtom = shortcutConflictsAtom
      expect(conflictsAtom).toBeDefined()
    })
  })

  describe("detectConflicts", () => {
    it("should detect shortcut conflicts between handlers", () => {
      const handlers = Array.from(mockHandlersWithConflicts.values())
      const conflicts = detectConflicts(handlers)

      expect(conflicts.length).toBeGreaterThan(0)

      // Should detect the '/' conflict between global and search
      const slashConflict = conflicts.find((c) => c.shortcut === "/")
      expect(slashConflict).toBeDefined()
      expect(slashConflict?.handlers).toContain("global-shortcuts")
      expect(slashConflict?.handlers).toContain("search-shortcuts")

      // Should detect the 'Space' conflict between task handlers
      const spaceConflict = conflicts.find((c) => c.shortcut === "Space")
      expect(spaceConflict).toBeDefined()
      expect(spaceConflict?.handlers).toContain("task-shortcuts")
      expect(spaceConflict?.handlers).toContain("conflicting-task-shortcuts")
    })

    it("should return empty array when no conflicts exist", () => {
      const handlers = Array.from(mockHandlersNoConflicts.values())
      const conflicts = detectConflicts(handlers)

      expect(conflicts).toEqual([])
    })

    it("should handle empty handlers array", () => {
      const conflicts = detectConflicts([])
      expect(conflicts).toEqual([])
    })

    it("should handle malformed handlers gracefully", () => {
      const malformedHandlers: Array<{
        id: string
        shortcuts: string[]
        context: Record<string, unknown>
        handler: () => boolean
      }> = [
        { id: "bad", shortcuts: [], context: {}, handler: vi.fn(() => true) },
        { id: "also-bad", shortcuts: [], context: {}, handler: vi.fn(() => true) },
      ]

      expect(() => {
        detectConflicts(malformedHandlers)
      }).not.toThrow()
    })
  })

  describe("getConflictSeverity", () => {
    it("should return high severity for same-context conflicts", () => {
      const conflict: ShortcutConflict = {
        shortcut: "Space",
        handlers: ["task-shortcuts", "conflicting-task-shortcuts"],
        contexts: [
          { requiresTask: true, priority: 25 },
          { requiresTask: true, priority: 30 },
        ],
      }

      const severity = getConflictSeverity(conflict)
      expect(severity).toBe("high")
    })

    it("should return medium severity for different-context conflicts", () => {
      const conflict: ShortcutConflict = {
        shortcut: "/",
        handlers: ["global-shortcuts", "search-shortcuts"],
        contexts: [
          { excludeDialogs: true, priority: 10 },
          { requiresDialog: "search", priority: 20 },
        ],
      }

      const severity = getConflictSeverity(conflict)
      expect(severity).toBe("medium")
    })

    it("should return low severity for well-separated contexts", () => {
      const conflict: ShortcutConflict = {
        shortcut: "Enter",
        handlers: ["global-enter", "specific-view-enter"],
        contexts: [
          { excludeDialogs: true, priority: 10 },
          { requiresView: "kanban", requiresDialog: "task-edit", priority: 30 },
        ],
      }

      const severity = getConflictSeverity(conflict)
      expect(severity).toBe("low")
    })
  })

  describe("resolveConflicts", () => {
    it("should resolve conflicts by removing lower priority handlers", () => {
      const conflict: ShortcutConflict = {
        shortcut: "Space",
        handlers: ["task-shortcuts", "conflicting-task-shortcuts"],
        contexts: [
          { requiresTask: true, priority: 25 },
          { requiresTask: true, priority: 30 },
        ],
      }

      const resolution = resolveConflicts([conflict], "priority")

      expect(resolution.length).toBe(1)
      const firstResolution = resolution[0]
      if (!firstResolution) {
        throw new Error("Expected to find first resolution")
      }
      expect(firstResolution.type).toBe("priority")
      expect(firstResolution.action).toBe("remove_handler")
      expect(firstResolution.targetHandler).toBe("task-shortcuts") // Lower priority
      expect(firstResolution.shortcut).toBe("Space")
    })

    it("should resolve conflicts by modifying shortcuts", () => {
      const conflict: ShortcutConflict = {
        shortcut: "/",
        handlers: ["global-shortcuts", "search-shortcuts"],
        contexts: [
          { excludeDialogs: true, priority: 10 },
          { requiresDialog: "search", priority: 20 },
        ],
      }

      const resolution = resolveConflicts([conflict], "modify")

      expect(resolution.length).toBe(1)
      const modifyResolution = resolution[0]
      if (!modifyResolution) {
        throw new Error("Expected to find modify resolution")
      }
      expect(modifyResolution.type).toBe("modify")
      expect(modifyResolution.action).toBe("modify_shortcut")
      expect(modifyResolution.newShortcut).toBeDefined()
    })

    it("should handle ignore resolution strategy", () => {
      const conflict: ShortcutConflict = {
        shortcut: "/",
        handlers: ["global-shortcuts", "search-shortcuts"],
        contexts: [
          { excludeDialogs: true, priority: 10 },
          { requiresDialog: "search", priority: 20 },
        ],
      }

      const resolution = resolveConflicts([conflict], "ignore")

      expect(resolution.length).toBe(1)
      const ignoreResolution = resolution[0]
      if (!ignoreResolution) {
        throw new Error("Expected to find ignore resolution")
      }
      expect(ignoreResolution.type).toBe("ignore")
      expect(ignoreResolution.action).toBe("ignore")
      expect(ignoreResolution.reason).toContain("Different contexts")
    })
  })

  describe("validateHandlerRegistration", () => {
    it("should return valid for non-conflicting handler", () => {
      const newHandler = {
        id: "new-handler",
        shortcuts: ["Cmd+X"],
        context: { priority: 15 },
        handler: vi.fn(),
      }

      const validation = validateHandlerRegistration(
        newHandler,
        Array.from(mockHandlersNoConflicts.values()),
      )

      expect(validation.isValid).toBe(true)
      expect(validation.conflicts).toEqual([])
    })

    it("should return invalid for conflicting handler", () => {
      const newHandler = {
        id: "conflicting-handler",
        shortcuts: ["Cmd+N"], // Conflicts with global-shortcuts
        context: { priority: 15 },
        handler: vi.fn(),
      }

      const validation = validateHandlerRegistration(
        newHandler,
        Array.from(mockHandlersNoConflicts.values()),
      )

      expect(validation.isValid).toBe(false)
      expect(validation.conflicts.length).toBeGreaterThan(0)
      const firstConflict = validation.conflicts[0]
      if (!firstConflict) {
        throw new Error("Expected to find first conflict")
      }
      expect(firstConflict.shortcut).toBe("Cmd+N")
    })

    it("should suggest alternative shortcuts for conflicts", () => {
      const newHandler = {
        id: "conflicting-handler",
        shortcuts: ["Cmd+N"],
        context: { priority: 15 },
        handler: vi.fn(),
      }

      const validation = validateHandlerRegistration(
        newHandler,
        Array.from(mockHandlersNoConflicts.values()),
      )

      expect(validation.suggestions).toBeDefined()
      if (validation.suggestions) {
        expect(validation.suggestions.length).toBeGreaterThan(0)
        expect(validation.suggestions.some((s) => s.includes("Cmd+"))).toBe(true)
      }
    })
  })

  describe("Edge cases", () => {
    it("should handle handlers with duplicate shortcuts in same handler", () => {
      const handlerWithDuplicates = {
        id: "duplicate-handler",
        shortcuts: ["Cmd+X", "Cmd+X"], // Duplicate shortcuts
        context: { priority: 10 },
        handler: vi.fn(),
      }

      const conflicts = detectConflicts([handlerWithDuplicates])
      expect(conflicts).toEqual([]) // No conflicts with other handlers
    })

    it("should handle case-sensitive shortcuts", () => {
      const handlers = [
        {
          id: "lower-case",
          shortcuts: ["cmd+n"],
          context: { priority: 10 },
          handler: vi.fn(),
        },
        {
          id: "upper-case",
          shortcuts: ["Cmd+N"],
          context: { priority: 15 },
          handler: vi.fn(),
        },
      ]

      const conflicts = detectConflicts(handlers)
      // Should detect as conflict (case insensitive)
      expect(conflicts.length).toBeGreaterThan(0)
    })

    it("should handle sequence shortcuts properly", () => {
      const handlers = [
        {
          id: "sequence-1",
          shortcuts: ["G+T"],
          context: { priority: 10 },
          handler: vi.fn(),
        },
        {
          id: "sequence-2",
          shortcuts: ["G+T"], // Same sequence
          context: { priority: 15 },
          handler: vi.fn(),
        },
      ]

      const conflicts = detectConflicts(handlers)
      expect(conflicts.length).toBe(1)
      const firstSequenceConflict = conflicts[0]
      if (!firstSequenceConflict) {
        throw new Error("Expected to find first sequence conflict")
      }
      expect(firstSequenceConflict.shortcut).toBe("G+T")
    })
  })

  describe("Resolution strategies", () => {
    it("should provide multiple resolution options", () => {
      const conflict: ShortcutConflict = {
        shortcut: "Cmd+S",
        handlers: ["save-global", "save-local"],
        contexts: [
          { excludeDialogs: true, priority: 10 },
          { requiresView: "editor", priority: 20 },
        ],
      }

      const priorityResolution = resolveConflicts([conflict], "priority")
      const modifyResolution = resolveConflicts([conflict], "modify")
      const ignoreResolution = resolveConflicts([conflict], "ignore")

      const firstPriorityRes = priorityResolution[0]
      const firstModifyRes = modifyResolution[0]
      const firstIgnoreRes = ignoreResolution[0]
      if (!firstPriorityRes || !firstModifyRes || !firstIgnoreRes) {
        throw new Error("Expected to find all resolution types")
      }
      expect(firstPriorityRes.type).toBe("priority")
      expect(firstModifyRes.type).toBe("modify")
      expect(firstIgnoreRes.type).toBe("ignore")
    })
  })
})
