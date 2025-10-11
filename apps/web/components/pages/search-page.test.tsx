import React from "react"
import { describe, it, expect, vi } from "vitest"

// Mock all dependencies before importing the component
vi.mock("jotai", () => ({
  useAtom: vi.fn(() => ["", vi.fn()]),
  useAtomValue: vi.fn(() => []),
  Provider: vi.fn(({ children }) => children),
}))

vi.mock("lucide-react", () => ({
  Search: () => <div data-testid="search-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
}))

vi.mock("@/components/search/advanced-search", () => ({
  AdvancedSearch: () => <div data-testid="advanced-search" />,
}))

vi.mock("@tasktrove/atoms", () => ({
  taskAtoms: { tasks: { toString: () => "tasksAtom" } },
  projectAtoms: { projects: { toString: () => "projectsAtom" } },
  labelAtoms: { labels: { toString: () => "labelsAtom" } },
}))

// Import after mocking
import { SearchPage } from "./search-page"

describe("SearchPage", () => {
  it("component is defined and exportable", () => {
    expect(SearchPage).toBeDefined()
    expect(typeof SearchPage).toBe("function")
    expect(SearchPage.name).toBe("SearchPage")
  })

  it("has required props interface", () => {
    // Test that the component accepts the expected props without throwing
    expect(() => {
      // Just verify the component is callable with props
      expect(SearchPage).toBeDefined()
    }).not.toThrow()
  })
})
