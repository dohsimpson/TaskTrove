import { renderHook, act, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import React from "react"
import { Provider } from "jotai"
import { useDebouncedParse } from "./use-debounced-parse"
import { nlpEnabledAtom } from "@/lib/atoms/ui/dialogs"
import { useAtomValue } from "jotai"

// Mock the natural language parser
vi.mock("@/lib/utils/enhanced-natural-language-parser", () => ({
  parseEnhancedNaturalLanguage: vi.fn(),
}))

// Mock atoms
vi.mock("@/lib/atoms/ui/dialogs", () => ({
  nlpEnabledAtom: vi.fn(),
}))

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

  it("returns null when NLP is disabled", async () => {
    vi.mocked(useAtomValue).mockReturnValue(false) // NLP disabled

    const { result } = renderHook(() => useDebouncedParse("hello world"), { wrapper })

    act(() => {
      vi.runAllTimers()
    })

    expect(result.current).toBeNull()
  })

  it("returns parsed result when NLP is enabled and text is provided", async () => {
    vi.mocked(useAtomValue).mockReturnValue(true) // NLP enabled

    const mockParsedResult = {
      title: "hello",
      labels: [],
      originalText: "hello world",
      dueDate: new Date("2024-01-15"),
      time: "9AM",
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
    expect(parseEnhancedNaturalLanguage).toHaveBeenCalledWith("hello world tomorrow 9AM", new Set())
  })

  it("returns null for empty text", async () => {
    vi.mocked(useAtomValue).mockReturnValue(true) // NLP enabled

    const { result } = renderHook(() => useDebouncedParse(""), { wrapper })

    act(() => {
      vi.runAllTimers()
    })

    expect(result.current).toBeNull()
  })

  it("returns null for whitespace-only text", async () => {
    vi.mocked(useAtomValue).mockReturnValue(true) // NLP enabled

    const { result } = renderHook(() => useDebouncedParse("   "), { wrapper })

    act(() => {
      vi.runAllTimers()
    })

    expect(result.current).toBeNull()
  })

  it("debounces parsing with custom delay", async () => {
    vi.mocked(useAtomValue).mockReturnValue(true) // NLP enabled

    const { parseEnhancedNaturalLanguage } = await import(
      "@/lib/utils/enhanced-natural-language-parser"
    )
    vi.mocked(parseEnhancedNaturalLanguage).mockReturnValue({
      title: "test",
      labels: [],
      originalText: "test",
    })

    const { result, rerender } = renderHook(({ text }) => useDebouncedParse(text, new Set(), 300), {
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
    expect(parseEnhancedNaturalLanguage).toHaveBeenCalledWith("final", new Set())
  })

  it("passes disabled sections to parser", async () => {
    vi.mocked(useAtomValue).mockReturnValue(true) // NLP enabled

    const { parseEnhancedNaturalLanguage } = await import(
      "@/lib/utils/enhanced-natural-language-parser"
    )
    vi.mocked(parseEnhancedNaturalLanguage).mockReturnValue({
      title: "test",
      labels: [],
      originalText: "test",
    })

    const disabledSections = new Set(["@urgent", "#work"])
    const { result } = renderHook(() => useDebouncedParse("test @urgent #work", disabledSections), {
      wrapper,
    })

    act(() => {
      vi.runAllTimers()
    })

    expect(parseEnhancedNaturalLanguage).toHaveBeenCalledWith(
      "test @urgent #work",
      disabledSections,
    )
  })

  it("updates result when NLP setting changes", async () => {
    // Start with NLP disabled
    vi.mocked(useAtomValue).mockReturnValue(false)

    const { result, rerender } = renderHook(() => useDebouncedParse("hello world"), { wrapper })

    act(() => {
      vi.runAllTimers()
    })

    expect(result.current).toBeNull()

    // Enable NLP
    vi.mocked(useAtomValue).mockReturnValue(true)

    const mockParsedResult = {
      title: "hello world",
      labels: [],
      originalText: "hello world",
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
    vi.mocked(useAtomValue).mockReturnValue(true)

    const mockParsedResult = {
      title: "hello world",
      labels: [],
      originalText: "hello world",
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
    vi.mocked(useAtomValue).mockReturnValue(false)
    rerender()

    act(() => {
      vi.runAllTimers()
    })

    expect(result.current).toBeNull()
  })
})
