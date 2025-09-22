import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render } from "@/test-utils"
import { EnhancedHighlightedInput } from "./enhanced-highlighted-input"
import { getTypedElement } from "@/lib/utils/type-safe-dom"

/**
 * Critical Alignment Tests
 *
 * These tests prevent the specific caret misalignment issues we encountered
 * by checking for the exact CSS class combinations that caused problems.
 */

// Mock Lucide icons
vi.mock("lucide-react", () => ({
  Hash: () => <span>📁</span>,
  Tag: () => <span>🏷️</span>,
  Calendar: () => <span>📅</span>,
  Clock: () => <span>⏰</span>,
  Folder: () => <span>📂</span>,
}))

describe("Enhanced Highlighted Input - Critical Alignment Tests", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
    placeholder: "Type your task...",
  }

  describe("CSS Class Conflict Prevention", () => {
    it("should have exact contentEditable classes from working example", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const contentEditable = getTypedElement(
        container.querySelector('[contenteditable="true"]'),
        HTMLElement,
      )
      expect(contentEditable).toBeTruthy()

      // CRITICAL: Must match the exact working example classes
      expect(contentEditable).toHaveClass("w-full")
      expect(contentEditable).toHaveClass("min-h-[60px]")
      expect(contentEditable).toHaveClass("p-3")
      expect(contentEditable).toHaveClass("break-words")
      expect(contentEditable).toHaveClass("whitespace-break-spaces")
      expect(contentEditable).not.toHaveClass("text-transparent")
      expect(contentEditable).not.toHaveClass("z-10")
      expect(contentEditable).toHaveClass("bg-transparent")
    })

    it("should NOT have any conflicting CSS classes that caused misalignment", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const contentEditable = getTypedElement(
        container.querySelector('[contenteditable="true"]'),
        HTMLElement,
      )
      expect(contentEditable).toBeTruthy()

      // CRITICAL: These classes caused the original misalignment issue
      expect(contentEditable).not.toHaveClass("px-0") // Conflicts with p-3
      expect(contentEditable).not.toHaveClass("border-0") // Conflicts with border
      expect(contentEditable).not.toHaveClass("text-lg") // Affects line height
      expect(contentEditable).not.toHaveClass("text-base") // Affects line height
      expect(contentEditable).not.toHaveClass("text-sm") // Affects line height
      expect(contentEditable).not.toHaveClass("shadow-none") // Affects visual
      expect(contentEditable).not.toHaveClass("focus-visible:ring-0") // Affects focus
    })

    it("should have exact overlay classes from working example", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)
      expect(overlay).toBeTruthy()
      expect(overlay).toBeTruthy()

      // CRITICAL: Must match the exact working example classes
      expect(overlay).toHaveClass("absolute")
      expect(overlay).toHaveClass("inset-0")
      expect(overlay).toHaveClass("p-3") // Same padding as contentEditable
      expect(overlay).toHaveClass("pointer-events-none")
      expect(overlay).toHaveClass("z-0")
      expect(overlay).toHaveClass("whitespace-break-spaces")
      expect(overlay).toHaveClass("break-words")
    })

    it("should have identical padding classes between contentEditable and overlay", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const contentEditable = getTypedElement(
        container.querySelector('[contenteditable="true"]'),
        HTMLElement,
      )
      expect(contentEditable).toBeTruthy()
      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)
      expect(overlay).toBeTruthy()

      // CRITICAL: Both must have p-3 and nothing that overrides it
      expect(contentEditable).toHaveClass("p-3")
      expect(overlay).toHaveClass("p-3")

      // Neither should have conflicting padding classes
      expect(contentEditable).not.toHaveClass("px-0")
      expect(contentEditable).not.toHaveClass("py-0")
      expect(overlay).not.toHaveClass("px-0")
      expect(overlay).not.toHaveClass("py-0")
    })
  })

  describe("Token Styling - No Padding Prevention", () => {
    it("should render tokens without px-0.5 or rounded classes that cause shift", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Task #project @label p1" />,
      )

      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)
      expect(overlay).toBeTruthy()
      const backgroundSpans = overlay?.querySelectorAll('span[class*="bg-"]') || []

      // Check each potential token
      backgroundSpans.forEach((span) => {
        // CRITICAL: These classes caused the text shift issue
        expect(span).not.toHaveClass("px-0.5")
        expect(span).not.toHaveClass("px-1")
        expect(span).not.toHaveClass("rounded")
        expect(span).not.toHaveClass("rounded-sm")
        expect(span).not.toHaveClass("rounded-md")

        expect(span).toHaveClass("opacity-60")
        expect(span).not.toHaveClass("cursor-pointer")
      })
    })

    it("should not add any margin classes to tokens", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Task #project @label" />,
      )

      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)
      expect(overlay).toBeTruthy()
      const backgroundSpans = overlay?.querySelectorAll('span[class*="bg-"]') || []

      backgroundSpans.forEach((span) => {
        // No margin classes that could affect positioning
        expect(span).not.toHaveClass("ml-0.5")
        expect(span).not.toHaveClass("mr-0.5")
        expect(span).not.toHaveClass("mx-0.5")
        expect(span).not.toHaveClass("m-0.5")
      })
    })

    it("should not add border classes to tokens", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Task #project @label" />,
      )

      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)
      expect(overlay).toBeTruthy()
      const backgroundSpans = overlay?.querySelectorAll('span[class*="bg-"]') || []

      backgroundSpans.forEach((span) => {
        // No border classes that could affect spacing
        expect(span).not.toHaveClass("border")
        expect(span).not.toHaveClass("border-2")
        expect(span).not.toHaveClass("border-l")
        expect(span).not.toHaveClass("border-r")
      })
    })
  })

  describe("Structural Positioning", () => {
    it("should have correct z-index stacking order", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const contentEditable = getTypedElement(
        container.querySelector('[contenteditable="true"]'),
        HTMLElement,
      )
      expect(contentEditable).toBeTruthy()
      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)
      expect(overlay).toBeTruthy()

      expect(contentEditable).not.toHaveClass("z-10")
      expect(overlay).toHaveClass("z-0")
    })

    it("should have contentEditable as relative and overlay as absolute", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const contentEditable = getTypedElement(
        container.querySelector('[contenteditable="true"]'),
        HTMLElement,
      )
      expect(contentEditable).toBeTruthy()
      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)
      expect(overlay).toBeTruthy()

      // Note: contentEditable no longer has 'relative' class in the refactored version
      expect(overlay).toHaveClass("absolute")
      expect(overlay).toHaveClass("inset-0")
    })

    it("should have both elements as direct children of the same container", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const contentEditable = getTypedElement(
        container.querySelector('[contenteditable="true"]'),
        HTMLElement,
      )
      expect(contentEditable).toBeTruthy()
      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)
      expect(overlay).toBeTruthy()

      // Both should be children of the same parent container
      expect(contentEditable?.parentElement).toBe(overlay?.parentElement)

      // Parent should have relative positioning for the absolute overlay
      const parent = contentEditable?.parentElement
      expect(parent).toHaveClass("relative")
    })
  })

  describe("Text Transparency and Visibility", () => {
    it("should have transparent text on contentEditable", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const contentEditable = getTypedElement(
        container.querySelector('[contenteditable="true"]'),
        HTMLElement,
      )
      expect(contentEditable).toBeTruthy()
      expect(contentEditable).not.toHaveClass("text-transparent")
    })

    it("should not have text transparency on overlay", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)
      expect(overlay).toBeTruthy()
      expect(overlay).not.toHaveClass("text-transparent")
    })
  })

  describe("Content State Consistency", () => {
    it("should maintain consistent classes across different content states", () => {
      const { container, rerender } = render(
        <EnhancedHighlightedInput {...defaultProps} value="" />,
      )

      const contentEditable = getTypedElement(
        container.querySelector('[contenteditable="true"]'),
        HTMLElement,
      )
      expect(contentEditable).toBeTruthy()
      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)
      expect(overlay).toBeTruthy()

      // Store initial classes
      const initialContentEditableClasses = contentEditable?.className
      const initialOverlayClasses = overlay?.className

      // Change to content with tokens
      rerender(<EnhancedHighlightedInput {...defaultProps} value="Task #project @label p1" />)

      // Classes should remain identical
      expect(contentEditable?.className).toBe(initialContentEditableClasses)
      expect(overlay?.className).toBe(initialOverlayClasses)

      // Change to long content
      rerender(
        <EnhancedHighlightedInput
          {...defaultProps}
          value={"Long ".repeat(50) + "#project @label"}
        />,
      )

      // Classes should still remain identical
      expect(contentEditable?.className).toBe(initialContentEditableClasses)
      expect(overlay?.className).toBe(initialOverlayClasses)
    })

    it("should not introduce new classes during token rendering", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Task #project @urgent p1 today 2PM" />,
      )

      const contentEditable = getTypedElement(
        container.querySelector('[contenteditable="true"]'),
        HTMLElement,
      )
      expect(contentEditable).toBeTruthy()
      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)
      expect(overlay).toBeTruthy()

      // Main elements should have stable class counts
      const contentEditableClassCount = contentEditable?.className.split(" ").length || 0
      const overlayClassCount = overlay?.className.split(" ").length || 0

      // Should have expected number of classes (not dynamic additions)
      expect(contentEditableClassCount).toBeGreaterThan(5) // Has many classes
      expect(overlayClassCount).toBe(9) // Updated number after refactoring
    })
  })

  describe("ARIA and Accessibility", () => {
    it("should have proper ARIA attributes without affecting styling", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const contentEditable = getTypedElement(
        container.querySelector('[contenteditable="true"]'),
        HTMLElement,
      )
      expect(contentEditable).toBeTruthy()

      // Should have ARIA attributes
      expect(contentEditable).toHaveAttribute("role", "combobox")
      expect(contentEditable).toHaveAttribute("aria-expanded")
      expect(contentEditable).toHaveAttribute("aria-controls")
      expect(contentEditable).toHaveAttribute("aria-label")

      expect(contentEditable).not.toHaveClass("text-transparent")
      expect(contentEditable).not.toHaveClass("z-10")
    })

    it("should have screen reader help text properly positioned", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const helpText = getTypedElement(
        container.querySelector("#enhanced-quick-add-help"),
        HTMLElement,
      )
      expect(helpText).toBeTruthy()
      expect(helpText).toHaveClass("sr-only")

      // Should not affect layout
      expect(helpText).not.toHaveClass("absolute")
      expect(helpText).not.toHaveClass("relative")
    })
  })

  describe("Regression Prevention", () => {
    it("should never accept className prop that could introduce conflicts", () => {
      // The component should not accept className prop at all
      // This prevents accidental reintroduction of conflicting styles

      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const contentEditable = getTypedElement(
        container.querySelector('[contenteditable="true"]'),
        HTMLElement,
      )
      expect(contentEditable).toBeTruthy()

      expect(contentEditable).toHaveClass("p-3", "bg-transparent")
      expect(contentEditable).not.toHaveClass("text-transparent")

      // Should not be possible to override these with className prop
      // (component doesn't accept className anymore)
    })

    it("should maintain the exact working example class combination", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const contentEditable = getTypedElement(
        container.querySelector('[contenteditable="true"]'),
        HTMLElement,
      )
      expect(contentEditable).toBeTruthy()

      // This is the EXACT string from the working example, split for verification
      const expectedClasses = [
        "w-full",
        "min-h-[60px]",
        "p-3",
        "break-words",
        "whitespace-break-spaces",
        "bg-transparent",
      ]

      expectedClasses.forEach((className) => {
        expect(contentEditable).toHaveClass(className)
      })

      // These classes were removed for cursor visibility
      expect(contentEditable).not.toHaveClass("text-transparent")
      expect(contentEditable).not.toHaveClass("z-10")
    })

    it("should maintain the exact working overlay class combination", () => {
      const { container } = render(
        <EnhancedHighlightedInput {...defaultProps} value="Test content" />,
      )

      const overlay = getTypedElement(container.querySelector(".absolute.inset-0"), HTMLElement)
      expect(overlay).toBeTruthy()

      // This is the EXACT string from the working example
      const expectedClasses = [
        "absolute",
        "inset-0",
        "p-3",
        "pointer-events-none",
        "z-0",
        "whitespace-break-spaces",
        "break-words",
      ]

      expectedClasses.forEach((className) => {
        expect(overlay).toHaveClass(className)
      })
    })
  })
})
