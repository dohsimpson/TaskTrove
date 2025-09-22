/**
 * Theme mocking utilities for next-themes
 */
import { vi } from "vitest"
import React from "react"

interface MockThemeConfig {
  theme?: string
  setTheme?: ReturnType<typeof vi.fn>
  themes?: string[]
  systemTheme?: string
  resolvedTheme?: string
  wrapInDiv?: boolean
}

/**
 * Mock next-themes with default values
 * For custom configuration, use inline vi.mock in your test file
 */
export const mockNextThemes = (config: MockThemeConfig = {}) => {
  vi.mock("next-themes", () => ({
    useTheme: vi.fn(() => ({
      theme: "light",
      setTheme: vi.fn(),
      themes: ["light", "dark", "system"],
      systemTheme: "light",
      resolvedTheme: "light",
    })),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  }))
}

/**
 * Mock next-themes with div wrapper for ThemeProvider
 */
export const mockNextThemesWithWrapper = () => {
  vi.mock("next-themes", () => ({
    useTheme: () => ({
      theme: "light",
      setTheme: vi.fn(),
      themes: ["light", "dark", "system"],
      systemTheme: "light",
      resolvedTheme: "light",
    }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", {}, children),
  }))
}

/**
 * Create a mock setTheme function that can be spied on
 */
export const createMockSetTheme = () => vi.fn()
