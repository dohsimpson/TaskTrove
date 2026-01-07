import { renderHook, act } from "@/test-utils"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import React from "react"
import { Provider } from "jotai"
import { useDebouncedParse } from "./use-debounced-parse"
import { nlpEnabledAtom } from "@tasktrove/atoms/ui/dialogs"
import { labelsAtom, settingsAtom, usersAtom } from "@tasktrove/atoms/data/base/atoms"
import { visibleProjectsAtom } from "@tasktrove/atoms/core/projects"
import { useAtomValue } from "jotai"

// Mock the natural language parser
vi.mock("@/lib/utils/enhanced-natural-language-parser", () => ({
  parseEnhancedNaturalLanguage: vi.fn(),
}))

// Note: Atom mocks are now centralized in test-utils/atoms-mocks.ts

// Mock jotai
vi.mock("jotai", async () => {
  const actual = await vi.importActual("jotai")
  return {
    ...actual,
    useAtomValue: vi.fn(),
  }
})

describe("useDebouncedParse", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider>{children}</Provider>
  const mockAtomValues = ({
    enabled,
    labels = [],
    projects = [],
    users = [],
    settings = { general: { preferDayMonthFormat: false } },
  }: {
    enabled: boolean
    labels?: Array<{ name: string }>
    projects?: Array<{ name: string }>
    users?: Array<{ username: string }>
    settings?: { general: { preferDayMonthFormat: boolean } }
  }) => {
    vi.mocked(useAtomValue).mockImplementation((atom) => {
      if (atom === nlpEnabledAtom) return enabled
      if (atom === labelsAtom) return labels
      if (atom === visibleProjectsAtom) return projects
      if (atom === usersAtom) return users
      if (atom === settingsAtom) return settings
      return []
    })
  }

  it("returns null when NLP is disabled", async () => {
    mockAtomValues({ enabled: false })

    const { result } = renderHook(() => useDebouncedParse("hello world"), { wrapper })

    act(() => {
      vi.runAllTimers()
    })

    expect(result.current).toBeNull()
  })

  it("returns parsed result when NLP is enabled and text is provided", async () => {
    mockAtomValues({ enabled: true, labels: [{ name: "urgent" }], projects: [{ name: "work" }] })

    const mockParsedResult = {
      title: "hello",
      labels: [],
      originalText: "hello world",
      dueDate: new Date("2024-01-15"),
      time: "9AM",
      matches: [],
      rawMatches: [],
      overlayMatches: [],
    }

    const { parseEnhancedNaturalLanguage } = await import(
      "@/lib/utils/enhanced-natural-language-parser"
    )
    vi.mocked(parseEnhancedNaturalLanguage).mockReturnValue(mockParsedResult)

    const { result } = renderHook(() => useDebouncedParse("hello world tomorrow 9AM"), { wrapper })

    act(() => {
      vi.runAllTimers()
    })

    expect(result.current).toEqual(mockParsedResult)
    expect(parseEnhancedNaturalLanguage).toHaveBeenCalledWith(
      "hello world tomorrow 9AM",
      new Set(),
      {
        projects: [{ name: "work" }],
        labels: [{ name: "urgent" }],
        users: [],
        preferDayMonthFormat: false,
      },
    )
  })

  it("returns null for empty text", async () => {
    mockAtomValues({ enabled: true })

    const { result } = renderHook(() => useDebouncedParse(""), { wrapper })

    act(() => {
      vi.runAllTimers()
    })

    expect(result.current).toBeNull()
  })

  it("returns null for whitespace-only text", async () => {
    mockAtomValues({ enabled: true })

    const { result } = renderHook(() => useDebouncedParse("   "), { wrapper })

    act(() => {
      vi.runAllTimers()
    })

    expect(result.current).toBeNull()
  })

  it("debounces parsing with custom delay", async () => {
    mockAtomValues({ enabled: true })

    const { parseEnhancedNaturalLanguage } = await import(
      "@/lib/utils/enhanced-natural-language-parser"
    )
    vi.mocked(parseEnhancedNaturalLanguage).mockReturnValue({
      title: "test",
      labels: [],
      originalText: "test",
      matches: [],
      rawMatches: [],
    })

    const { rerender } = renderHook(({ text }) => useDebouncedParse(text, new Set(), 300), {
      wrapper,
      initialProps: { text: "initial" },
    })

    // Change text multiple times quickly
    rerender({ text: "updated1" })
    rerender({ text: "updated2" })
    rerender({ text: "final" })

    // Parsing shouldn't have been called yet
    expect(parseEnhancedNaturalLanguage).not.toHaveBeenCalled()

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Should only parse the final value
    expect(parseEnhancedNaturalLanguage).toHaveBeenCalledTimes(1)
    expect(parseEnhancedNaturalLanguage).toHaveBeenCalledWith("final", new Set(), {
      projects: [],
      labels: [],
      users: [],
      preferDayMonthFormat: false,
    })
  })

  it("passes disabled sections to parser", async () => {
    mockAtomValues({ enabled: true })

    const { parseEnhancedNaturalLanguage } = await import(
      "@/lib/utils/enhanced-natural-language-parser"
    )
    vi.mocked(parseEnhancedNaturalLanguage).mockReturnValue({
      title: "test",
      labels: [],
      originalText: "test",
      matches: [],
      rawMatches: [],
    })

    const disabledSections = new Set(["@urgent", "#work"])
    renderHook(() => useDebouncedParse("test @urgent #work", disabledSections), {
      wrapper,
    })

    act(() => {
      vi.runAllTimers()
    })

    expect(parseEnhancedNaturalLanguage).toHaveBeenCalledWith(
      "test @urgent #work",
      disabledSections,
      {
        projects: [],
        labels: [],
        users: [],
        preferDayMonthFormat: false,
      },
    )
  })

  it("updates result when NLP setting changes", async () => {
    // Start with NLP disabled
    let nlpEnabled = false
    vi.mocked(useAtomValue).mockImplementation((atom) => {
      if (atom === nlpEnabledAtom) return nlpEnabled
      if (atom === settingsAtom) return { general: { preferDayMonthFormat: false } }
      if (atom === labelsAtom) return []
      if (atom === visibleProjectsAtom) return []
      if (atom === usersAtom) return []
      return []
    })

    const { result, rerender } = renderHook(() => useDebouncedParse("hello world"), { wrapper })

    act(() => {
      vi.runAllTimers()
    })

    expect(result.current).toBeNull()

    // Enable NLP
    nlpEnabled = true

    const mockParsedResult = {
      title: "hello world",
      labels: [],
      originalText: "hello world",
      matches: [],
      rawMatches: [],
      overlayMatches: [],
    }

    const { parseEnhancedNaturalLanguage } = await import(
      "@/lib/utils/enhanced-natural-language-parser"
    )
    vi.mocked(parseEnhancedNaturalLanguage).mockReturnValue(mockParsedResult)

    rerender()

    act(() => {
      vi.runAllTimers()
    })

    expect(result.current).toEqual(mockParsedResult)
  })

  it("clears result when NLP is disabled after being enabled", async () => {
    // Start with NLP enabled
    let nlpEnabled = true
    vi.mocked(useAtomValue).mockImplementation((atom) => {
      if (atom === nlpEnabledAtom) return nlpEnabled
      if (atom === settingsAtom) return { general: { preferDayMonthFormat: false } }
      if (atom === labelsAtom) return []
      if (atom === visibleProjectsAtom) return []
      if (atom === usersAtom) return []
      return []
    })

    const mockParsedResult = {
      title: "hello world",
      labels: [],
      originalText: "hello world",
      matches: [],
      rawMatches: [],
      overlayMatches: [],
    }

    const { parseEnhancedNaturalLanguage } = await import(
      "@/lib/utils/enhanced-natural-language-parser"
    )
    vi.mocked(parseEnhancedNaturalLanguage).mockReturnValue(mockParsedResult)

    const { result, rerender } = renderHook(() => useDebouncedParse("hello world"), { wrapper })

    act(() => {
      vi.runAllTimers()
    })

    expect(result.current).toEqual(mockParsedResult)

    // Disable NLP
    nlpEnabled = false
    rerender()

    act(() => {
      vi.runAllTimers()
    })

    expect(result.current).toBeNull()
  })
})
