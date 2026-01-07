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

type ThemeState = Required<MockThemeConfig>

const themeState: ThemeState = {
  theme: "light",
  setTheme: vi.fn(),
  themes: ["light", "dark", "system"],
  systemTheme: "light",
  resolvedTheme: "light",
  wrapInDiv: false,
}

vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => ({
    theme: themeState.theme,
    setTheme: themeState.setTheme,
    themes: themeState.themes,
    systemTheme: themeState.systemTheme,
    resolvedTheme: themeState.resolvedTheme,
  })),
  ThemeProvider: ({ children }: { children: React.ReactNode }) =>
    themeState.wrapInDiv ? React.createElement("div", {}, children) : children,
}))

/**
 * Mock next-themes with default values.
 * Safe for hoisting because it only mutates shared state used by the mocked module.
 */
export const mockNextThemes = (config: MockThemeConfig = {}) => {
  themeState.theme = config.theme ?? "light"
  themeState.setTheme = config.setTheme ?? vi.fn()
  themeState.themes = config.themes ?? ["light", "dark", "system"]
  themeState.systemTheme = config.systemTheme ?? "light"
  themeState.resolvedTheme = config.resolvedTheme ?? "light"
  themeState.wrapInDiv = config.wrapInDiv ?? false
}

/**
 * Mock next-themes with div wrapper for ThemeProvider
 */
export const mockNextThemesWithWrapper = () => mockNextThemes({ wrapInDiv: true })

/**
 * Create a mock setTheme function that can be spied on
 */
export const createMockSetTheme = () => vi.fn()
