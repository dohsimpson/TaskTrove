/**
 * Hook mocking utilities for testing
 */
import { vi } from "vitest"

/**
 * Mock the use-toast hook with a simple toast function
 * Used across multiple test files for consistent toast mocking
 */
export const mockUseToast = () => {
  vi.mock("@/hooks/use-toast", () => ({
    toast: vi.fn(),
  }))
}
