import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render } from "@/test-utils"
import { EnhancedHighlightedInput } from "./enhanced-highlighted-input"
import { getTypedElement } from "@/lib/utils/type-safe-dom"

/**
 * Visual Alignment Tests - Simplified Version
 *
 * These tests focus on CSS class verification rather than computed styles
 * to avoid test environment limitations while still preventing alignment issues.
 */

// Mock Lucide icons to avoid dependency issues
vi.mock("lucide-react", () => ({
  Hash: () => <span data-testid="hash-icon">📁</span>,
  Tag: () => <span data-testid="tag-icon">🏷️</span>,
  Calendar: () => <span data-testid="calendar-icon">📅</span>,
  Clock: () => <span data-testid="clock-icon">⏰</span>,
  Folder: () => <span data-testid="folder-icon">📂</span>,
}))

describe("Enhanced Highlighted Input - Visual Alignment Tests", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
    placeholder: "Type your task...",
  }

  describe("CSS Class Alignment Verification", () => {
    it("should have matching padding classes between contentEditable and overlay", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const contentEditable = getTypedElement(
        container.querySelector('[contenteditable="plaintext-only"]'),
        HTMLElement,
      )
      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)

      expect(contentEditable).toBeTruthy()
      expect(overlay).toBeTruthy()

      // Critical: Both must have identical padding classes
      expect(contentEditable).toHaveClass("p-3")
      expect(overlay).toHaveClass("p-3")

      // Neither should have conflicting padding
      expect(contentEditable).not.toHaveClass("px-0", "py-0", "p-0")
      expect(overlay).not.toHaveClass("px-0", "py-0", "p-0")
    })

    it("should have proper z-index stacking classes", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const contentEditable = getTypedElement(
        container.querySelector('[contenteditable="plaintext-only"]'),
        HTMLElement,
      )
      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)

      expect(overlay).toHaveClass("z-0")
      expect(overlay).toHaveClass("absolute")
      expect(contentEditable).not.toHaveClass("z-10")
    })

    it("should have correct transparency classes", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const contentEditable = getTypedElement(
        container.querySelector('[contenteditable="plaintext-only"]'),
        HTMLElement,
      )
      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)

      expect(contentEditable).not.toHaveClass("text-transparent")
      expect(contentEditable).toHaveClass("bg-transparent")
      expect(overlay).not.toHaveClass("text-transparent")
    })
  })

  describe("Token Styling Classes", () => {
    it("should render tokens without padding classes that cause text shift", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Task #project @label p1" />,
      )

      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)
      const tokens = overlay?.querySelectorAll('span[class*="bg-"]') || []

      tokens.forEach((token) => {
        // Critical: No horizontal padding that shifts text position
        expect(token).not.toHaveClass("px-0.5", "px-1", "p-1", "p-0.5")

        expect(token).toHaveClass("opacity-60")
        expect(token).not.toHaveClass("cursor-pointer")
      })
    })

    it("should maintain consistent character spacing classes", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="word #token word" />,
      )

      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)
      const textSpans = overlay?.querySelectorAll("span") || []

      // No spans should have letter-spacing or word-spacing classes
      textSpans.forEach((span) => {
        expect(span).not.toHaveClass("tracking-wide", "tracking-wider", "tracking-widest")
        expect(span).not.toHaveClass("tracking-tight", "tracking-tighter")
      })
    })

    it("should not add border radius classes that affect positioning", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Task #project @label" />,
      )

      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)
      const tokens = overlay?.querySelectorAll('span[class*="bg-"]') || []

      tokens.forEach((token) => {
        // Should not have border radius that could affect text flow
        expect(token).not.toHaveClass("rounded", "rounded-sm", "rounded-md", "rounded-lg")
        expect(token).not.toHaveClass("rounded-l", "rounded-r", "rounded-t", "rounded-b")
      })
    })
  })

  describe("Positioning Relationship Classes", () => {
    it("should have overlay perfectly positioned over contentEditable with classes", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const contentEditable = getTypedElement(
        container.querySelector('[contenteditable="plaintext-only"]'),
        HTMLElement,
      )
      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)

      // Overlay should cover exactly the same area using inset-0
      expect(overlay).toHaveClass("absolute", "inset-0")

      // Both should be in the same container
      expect(contentEditable?.parentElement).toBe(overlay?.parentElement)
    })

    it("should maintain positioning classes when content changes", () => {
      const { container, rerender } = render(
        <EnhancedHighlightedInput {...defaultProps} value="" />,
      )

      const contentEditable = getTypedElement(
        container.querySelector('[contenteditable="plaintext-only"]'),
        HTMLElement,
      )
      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)

      // Store initial classes
      const initialContentEditableClasses = contentEditable?.className
      const initialOverlayClasses = overlay?.className

      // Change content to include tokens
      rerender(
        <EnhancedHighlightedInput
          {...defaultProps}
          value="Long task with #project @label p1 tomorrow"
        />,
      )

      // Classes should remain the same
      expect(contentEditable?.className).toBe(initialContentEditableClasses)
      expect(overlay?.className).toBe(initialOverlayClasses)
    })
  })

  describe("Whitespace and Text Flow Classes", () => {
    it("should handle whitespace with proper classes", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Text   with    multiple   spaces" />,
      )

      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)

      // Should have whitespace handling classes
      expect(overlay).toHaveClass("whitespace-break-spaces")
      expect(overlay).toHaveClass("break-words")
    })

    it("should wrap text consistently with proper classes", () => {
      const longText = "This is a very long task description that should wrap consistently"

      const { container } = render(
        <div style={{ width: "200px" }}>
          <EnhancedHighlightedInput {...defaultProps} value={longText} />
        </div>,
      )

      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)

      // Should have consistent word wrapping classes
      expect(overlay).toHaveClass("break-words")
      expect(overlay).toHaveClass("whitespace-break-spaces")
    })
  })

  describe("Border and Outline Classes", () => {
    it("should have border classes only on contentEditable", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const contentEditable = getTypedElement(
        container.querySelector('[contenteditable="plaintext-only"]'),
        HTMLElement,
      )
      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)

      // ContentEditable should have shared classes
      expect(contentEditable).toHaveClass(
        "w-full",
        "min-h-[60px]",
        "p-3",
        "break-words",
        "whitespace-break-spaces",
      )
      expect(overlay).not.toHaveClass("border", "rounded-md")

      // Overlay positioning accounts for border with inset-0
      expect(overlay).toHaveClass("absolute", "inset-0")
    })

    it("should have proper focus outline classes", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const contentEditable = getTypedElement(
        container.querySelector('[contenteditable="plaintext-only"]'),
        HTMLElement,
      )

      expect(contentEditable).toHaveClass("bg-transparent")
      expect(contentEditable).not.toHaveClass("text-transparent", "z-10")
    })
  })

  describe("Edge Case Class Verification", () => {
    it("should handle empty content with consistent classes", () => {
      const { container } = render(<EnhancedHighlightedInput {...defaultProps} value="" />)

      const contentEditable = getTypedElement(
        container.querySelector('[contenteditable="plaintext-only"]'),
        HTMLElement,
      )
      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)

      // Should maintain consistent classes even when empty
      expect(contentEditable).toHaveClass("min-h-[60px]") // Minimum height
      expect(overlay).toHaveClass("absolute", "inset-0", "p-3")
    })

    it("should handle very long content with proper overflow classes", () => {
      const veryLongText = "A".repeat(1000) + " #project @label"

      const { container } = render(
        <div style={{ width: "200px", overflow: "hidden" }}>
          <EnhancedHighlightedInput {...defaultProps} value={veryLongText} />
        </div>,
      )

      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)

      // Should handle overflow with proper text classes
      expect(overlay).toHaveClass("whitespace-break-spaces", "break-words")
    })

    it("should maintain alignment classes with different font contexts", () => {
      const fontSizes = ["12px", "16px", "20px"]

      fontSizes.forEach((fontSize) => {
        const { container } = render(
          <div style={{ fontSize }}>
            <EnhancedHighlightedInput {...defaultProps} value="Test #token content" />
          </div>,
        )

        const contentEditable = getTypedElement(
          container.querySelector('[contenteditable="plaintext-only"]'),
          HTMLElement,
        )
        const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)

        expect(contentEditable).toHaveClass("p-3", "bg-transparent")
        expect(contentEditable).not.toHaveClass("text-transparent", "z-10")
        expect(overlay).toHaveClass("absolute", "inset-0", "p-3", "z-0")
      })
    })
  })

  describe("Accessibility Class Verification", () => {
    it("should have proper ARIA classes without affecting layout", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const contentEditable = getTypedElement(
        container.querySelector('[contenteditable="plaintext-only"]'),
        HTMLElement,
      )

      // Should have ARIA attributes but maintain visual classes
      expect(contentEditable).toHaveAttribute("role", "combobox")
      expect(contentEditable).toHaveAttribute("aria-expanded")

      expect(contentEditable).toHaveClass("bg-transparent")
      expect(contentEditable).not.toHaveClass("text-transparent", "z-10")
    })

    it("should have screen reader help with proper classes", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const helpText = getTypedElement(
        container.querySelector("#enhanced-quick-add-help"),
        HTMLElement,
      )
      expect(helpText).toBeTruthy()
      expect(helpText).toHaveClass("sr-only")

      // Should not have positioning classes that affect layout
      expect(helpText).not.toHaveClass("absolute", "relative", "fixed")
    })
  })
})
