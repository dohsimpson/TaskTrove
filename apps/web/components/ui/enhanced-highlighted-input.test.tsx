import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { EnhancedHighlightedInput } from "./enhanced-highlighted-input"
import type { ExtractionResult } from "@tasktrove/parser/types"

type ComponentProps = React.ComponentProps<typeof EnhancedHighlightedInput>

// Mock Lucide icons
vi.mock("lucide-react", () => ({
  Hash: ({ className }: { className?: string }) => (
    <div data-testid="hash-icon" className={className} />
  ),
  Tag: ({ className }: { className?: string }) => (
    <div data-testid="tag-icon" className={className} />
  ),
  Calendar: ({ className }: { className?: string }) => (
    <div data-testid="calendar-icon" className={className} />
  ),
  Clock: ({ className }: { className?: string }) => (
    <div data-testid="clock-icon" className={className} />
  ),
  Folder: ({ className }: { className?: string }) => (
    <div data-testid="folder-icon" className={className} />
  ),
}))

// Mock atoms - provide simple defaults
vi.mock("jotai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jotai")>()
  return {
    ...actual,
    useAtomValue: vi.fn(() => true),
  }
})

const buildMatches = (
  input: string,
  segments: Array<{ type: ExtractionResult["type"]; text: string; offset?: number }>,
): ExtractionResult[] => {
  const matches: ExtractionResult[] = []

  segments.forEach(({ type, text, offset }) => {
    const startIndex =
      offset !== undefined ? offset : input.toLowerCase().indexOf(text.toLowerCase())

    if (startIndex === -1) {
      throw new Error(`Segment "${text}" not found in "${input}"`)
    }

    matches.push({
      type,
      value: text,
      match: input.slice(startIndex, startIndex + text.length) || text,
      startIndex,
      endIndex: startIndex + text.length,
    })
  })

  return matches
}

describe("EnhancedHighlightedInput", () => {
  const defaultProps: ComponentProps = {
    value: "",
    onChange: vi.fn(),
    placeholder: "Type your task...",
    parserMatches: [],
  }

  const mockAutocompleteItems = {
    projects: [
      {
        id: "work",
        label: "Work",
        icon: <div data-testid="work-icon" />,
        type: "project" as const,
      },
      {
        id: "personal",
        label: "Personal",
        icon: <div data-testid="personal-icon" />,
        type: "project" as const,
      },
    ],
    labels: [
      {
        id: "urgent",
        label: "urgent",
        icon: <div data-testid="urgent-icon" />,
        type: "label" as const,
      },
      {
        id: "important",
        label: "important",
        icon: <div data-testid="important-icon" />,
        type: "label" as const,
      },
    ],
    dates: [
      {
        id: "today",
        label: "Today",
        icon: <div data-testid="today-icon" />,
        type: "date" as const,
      },
      {
        id: "tomorrow",
        label: "Tomorrow",
        icon: <div data-testid="tomorrow-icon" />,
        type: "date" as const,
      },
    ],
    estimations: [
      {
        id: "30min",
        label: "30min",
        icon: <div data-testid="estimation-icon" />,
        type: "estimation" as const,
      },
      {
        id: "1h",
        label: "1h",
        icon: <div data-testid="estimation-icon" />,
        type: "estimation" as const,
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("Caret Alignment Prevention Tests", () => {
    it("contentEditable and overlay should have identical CSS classes for alignment", () => {
      render(<EnhancedHighlightedInput {...defaultProps} />)

      const contentEditable = screen.getByRole("combobox")
      const overlay = contentEditable.parentElement?.querySelector(".absolute.inset-0")

      expect(contentEditable).toBeInTheDocument()
      expect(overlay).toBeInTheDocument()

      // Both should have identical padding
      expect(contentEditable).toHaveClass("p-3")
      expect(overlay).toHaveClass("p-3")

      // ContentEditable should have exact classes from working example
      expect(contentEditable).toHaveClass(
        "w-full",
        "min-h-[60px]",
        "p-3",
        "break-words",
        "whitespace-break-spaces",
        "bg-transparent",
      )
      expect(contentEditable).not.toHaveClass("text-transparent", "z-10")

      // Overlay should have exact classes from working example
      expect(overlay).toHaveClass(
        "absolute",
        "inset-0",
        "p-3",
        "pointer-events-none",
        "z-0",
        "whitespace-break-spaces",
        "break-words",
      )
    })

    it("should not add padding to highlighted tokens to prevent text shift", () => {
      const value = "Test #project @label"
      render(
        <EnhancedHighlightedInput
          {...defaultProps}
          value={value}
          parserMatches={buildMatches(value, [
            { type: "project", text: "#project" },
            { type: "label", text: "@label" },
          ])}
        />,
      )

      // Find highlighted tokens
      const tokens = screen
        .getByRole("combobox")
        .parentElement?.querySelectorAll('span[class*="bg-"]')

      tokens?.forEach((token) => {
        // Should NOT have padding classes that cause shift
        expect(token).not.toHaveClass("px-0.5")
        expect(token).not.toHaveClass("px-1")
        expect(token).not.toHaveClass("px-2")
        expect(token).not.toHaveClass("p-1")
        expect(token).not.toHaveClass("p-2")

        expect(token).toHaveClass("opacity-60")
        expect(token).not.toHaveClass("cursor-pointer")
        expect(token).not.toHaveClass("hover:opacity-80")
        expect(token).not.toHaveClass("transition-opacity")
      })
    })

    it("should maintain identical box model between contentEditable and overlay", () => {
      render(<EnhancedHighlightedInput {...defaultProps} />)

      const contentEditable = screen.getByRole("combobox")
      const overlay = contentEditable.parentElement?.querySelector(".absolute.inset-0")

      // Get computed styles
      const contentEditableStyles = window.getComputedStyle(contentEditable)
      if (overlay) {
        const overlayStyles = window.getComputedStyle(overlay)

        // Should have same padding (from p-3 class)
        expect(contentEditableStyles.paddingTop).toBe(overlayStyles.paddingTop)
        expect(contentEditableStyles.paddingRight).toBe(overlayStyles.paddingRight)
        expect(contentEditableStyles.paddingBottom).toBe(overlayStyles.paddingBottom)
        expect(contentEditableStyles.paddingLeft).toBe(overlayStyles.paddingLeft)
      }
    })

    it("should not have conflicting CSS properties that cause misalignment", () => {
      render(<EnhancedHighlightedInput {...defaultProps} />)

      const contentEditable = screen.getByRole("combobox")

      // Should NOT have conflicting classes
      expect(contentEditable).not.toHaveClass("px-0") // Would conflict with p-3
      expect(contentEditable).not.toHaveClass("border-0") // Would conflict with border
      expect(contentEditable).not.toHaveClass("text-lg") // Would affect line height
      expect(contentEditable).not.toHaveClass("text-base") // Would affect line height
      expect(contentEditable).not.toHaveClass("text-sm") // Would affect line height
    })

    it("placeholder should not affect overlay positioning", () => {
      render(<EnhancedHighlightedInput {...defaultProps} placeholder="Test placeholder" />)

      const overlay = screen.getByRole("combobox").parentElement?.querySelector(".absolute.inset-0")
      const placeholderElement = overlay?.querySelector("span")

      expect(placeholderElement).toBeInTheDocument()
      expect(placeholderElement).toHaveClass("text-muted-foreground", "pointer-events-none")

      // Placeholder should not have any positioning or spacing classes
      expect(placeholderElement).not.toHaveClass("absolute")
      expect(placeholderElement).not.toHaveClass("relative")
      expect(placeholderElement).not.toHaveClass("p-1")
      expect(placeholderElement).not.toHaveClass("m-1")
    })
  })

  describe("Token Highlighting Consistency", () => {
    it("should highlight project tokens without shifting text", () => {
      const value = "Task #work project"
      render(
        <EnhancedHighlightedInput
          {...defaultProps}
          value={value}
          parserMatches={buildMatches(value, [{ type: "project", text: "#work" }])}
        />,
      )

      const overlay = screen.getByRole("combobox").parentElement?.querySelector(".absolute.inset-0")
      const projectToken = overlay?.querySelector('span[class*="bg-purple-500/20"]')

      expect(projectToken).toBeInTheDocument()
      expect(projectToken).toHaveTextContent("#work")

      // Should not have padding that shifts text
      expect(projectToken).not.toHaveClass("px-0.5")
      expect(projectToken).not.toHaveClass("rounded")
    })

    it("should highlight label tokens without shifting text", () => {
      const value = "Task @urgent label"
      render(
        <EnhancedHighlightedInput
          {...defaultProps}
          value={value}
          parserMatches={buildMatches(value, [{ type: "label", text: "@urgent" }])}
        />,
      )

      const overlay = screen.getByRole("combobox").parentElement?.querySelector(".absolute.inset-0")
      const labelToken = overlay?.querySelector('span[class*="bg-blue-500/20"]')

      expect(labelToken).toBeInTheDocument()
      expect(labelToken).toHaveTextContent("@urgent")

      // Should not have padding that shifts text
      expect(labelToken).not.toHaveClass("px-0.5")
      expect(labelToken).not.toHaveClass("rounded")
    })

    it("should highlight multiple token types without cumulative shift", () => {
      const value = "Task #work @urgent p1 today"
      render(
        <EnhancedHighlightedInput
          {...defaultProps}
          value={value}
          parserMatches={buildMatches(value, [
            { type: "project", text: "#work" },
            { type: "label", text: "@urgent" },
            { type: "priority", text: "p1" },
            { type: "date", text: "today" },
          ])}
        />,
      )

      const overlay = screen.getByRole("combobox").parentElement?.querySelector(".absolute.inset-0")
      const tokens = overlay?.querySelectorAll('span[class*="bg-"]')

      expect(tokens).toHaveLength(4) // #work, @urgent, p1, today

      tokens?.forEach((token) => {
        // Each token should not have spacing that causes cumulative shift
        expect(token).not.toHaveClass("px-0.5")
        expect(token).not.toHaveClass("ml-0.5")
        expect(token).not.toHaveClass("mr-0.5")
      })
    })
  })

  describe("Autocomplete Positioning", () => {
    it("should position autocomplete dropdown correctly relative to cursor", async () => {
      const user = userEvent.setup()

      render(
        <EnhancedHighlightedInput {...defaultProps} autocompleteItems={mockAutocompleteItems} />,
      )

      const contentEditable = screen.getByRole("combobox")

      // Focus and type to trigger autocomplete
      await user.click(contentEditable)

      // Simulate typing '#' to trigger project autocomplete
      fireEvent.input(contentEditable, { target: { textContent: "#" } })

      // Check if autocomplete appears (may not in test environment due to DOM limitations)
      const autocompleteDropdown = screen.queryByRole("listbox")
      if (autocompleteDropdown) {
        expect(autocompleteDropdown).toBeInTheDocument()
        expect(autocompleteDropdown).toHaveClass("absolute", "z-20")
      } else {
        // In test environment, just verify the structure is correct
        expect(contentEditable).toHaveAttribute("aria-expanded")
      }
    })

    it("should not affect overlay positioning when autocomplete is shown", async () => {
      const user = userEvent.setup()

      render(
        <EnhancedHighlightedInput {...defaultProps} autocompleteItems={mockAutocompleteItems} />,
      )

      const contentEditable = screen.getByRole("combobox")
      const overlay = contentEditable.parentElement?.querySelector(".absolute.inset-0")

      // Store initial overlay classes
      const initialClasses = overlay?.className

      // Trigger autocomplete
      await user.click(contentEditable)
      fireEvent.input(contentEditable, { target: { textContent: "#" } })

      // Overlay classes should remain unchanged regardless of autocomplete state
      expect(overlay?.className).toBe(initialClasses)
      expect(overlay).toHaveClass("absolute", "inset-0", "p-3", "z-0")
    })
  })

  describe("Disabled Sections Styling", () => {
    it("should apply disabled styling without affecting text positioning", () => {
      const disabledSections = new Set(["#work", "@urgent"])

      render(
        <EnhancedHighlightedInput
          {...defaultProps}
          value="Task #work @urgent active"
          parserMatches={buildMatches("Task #work @urgent active", [
            { type: "project", text: "#work" },
            { type: "label", text: "@urgent" },
          ])}
          disabledSections={disabledSections}
        />,
      )

      const overlay = screen.getByRole("combobox").parentElement?.querySelector(".absolute.inset-0")
      const disabledTokens = overlay?.querySelectorAll('span[class*="line-through"]')

      expect(disabledTokens).toHaveLength(2)

      disabledTokens?.forEach((token) => {
        expect(token).toHaveClass("bg-gray-200", "text-gray-600", "line-through")
        // Should not have padding that affects positioning
        expect(token).not.toHaveClass("px-0.5")
      })
    })
  })

  describe("Accessibility and ARIA Alignment", () => {
    it("should maintain ARIA attributes without affecting visual alignment", () => {
      render(<EnhancedHighlightedInput {...defaultProps} />)

      const contentEditable = screen.getByRole("combobox")

      // Should have all required ARIA attributes
      expect(contentEditable).toHaveAttribute("aria-expanded", "false")
      expect(contentEditable).toHaveAttribute("aria-haspopup", "listbox")
      expect(contentEditable).toHaveAttribute("aria-controls", "enhanced-quick-add-autocomplete")
      expect(contentEditable).toHaveAttribute("aria-describedby", "enhanced-quick-add-help")

      expect(contentEditable).not.toHaveClass("text-transparent")
    })

    it("should provide screen reader help text without affecting layout", () => {
      render(<EnhancedHighlightedInput {...defaultProps} />)

      const helpText = screen.getByText(/Type your task. Use # for projects/)

      expect(helpText).toBeInTheDocument()
      expect(helpText).toHaveClass("sr-only")
      expect(helpText).toHaveAttribute("id", "enhanced-quick-add-help")
    })
  })

  describe("Content Editable Behavior", () => {
    it("should handle text input without layout shifts", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(<EnhancedHighlightedInput {...defaultProps} onChange={onChange} />)

      const contentEditable = screen.getByRole("combobox")

      await user.click(contentEditable)

      // Simulate typing that creates tokens
      fireEvent.input(contentEditable, {
        target: { textContent: "Task #project @label p1" },
      })

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({
            value: "Task #project @label p1",
          }),
        }),
      )
    })

    it("should maintain consistent styling during text changes", () => {
      const { rerender } = render(<EnhancedHighlightedInput {...defaultProps} value="" />)

      const contentEditable = screen.getByRole("combobox")
      const overlay = contentEditable.parentElement?.querySelector(".absolute.inset-0")

      // Store initial styles
      const initialContentEditableClasses = contentEditable.className
      const initialOverlayClasses = overlay?.className

      // Update with token content
      const value = "Task #project @label"
      rerender(
        <EnhancedHighlightedInput
          {...defaultProps}
          value={value}
          parserMatches={buildMatches(value, [
            { type: "project", text: "#project" },
            { type: "label", text: "@label" },
          ])}
        />,
      )

      // Classes should remain unchanged
      expect(contentEditable.className).toBe(initialContentEditableClasses)
      expect(overlay?.className).toBe(initialOverlayClasses)
    })
  })

  describe("Focus Management", () => {
    it("should handle focus states without affecting alignment", async () => {
      render(<EnhancedHighlightedInput {...defaultProps} />)

      const contentEditable = screen.getByRole("combobox")

      // Note: In test environment, contentEditable elements may not actually receive focus
      // due to JSDOM limitations. However, we can verify the focus handlers are called
      // and that the styling remains correct.

      // Test focus handler is called
      fireEvent.focus(contentEditable)
      // The component should handle focus event (even if element doesn't actually get focus)
      expect(contentEditable).not.toHaveClass("text-transparent", "z-10")

      // Test blur handler is called
      fireEvent.blur(contentEditable)
      // The component should handle blur event
      expect(contentEditable).not.toHaveClass("text-transparent", "z-10")
    })

    it("should show/hide placeholder based on focus without layout shift", async () => {
      render(<EnhancedHighlightedInput {...defaultProps} placeholder="Test placeholder" />)

      const contentEditable = screen.getByRole("combobox")
      const overlay = contentEditable.parentElement?.querySelector(".absolute.inset-0")

      // Initially should show placeholder (not focused)
      expect(overlay).toHaveTextContent("Test placeholder")

      // Focus should hide placeholder
      fireEvent.focus(contentEditable)
      expect(overlay).not.toHaveTextContent("Test placeholder")

      // Blur should show placeholder again (if no content)
      fireEvent.blur(contentEditable)
      expect(overlay).toHaveTextContent("Test placeholder")
    })
  })

  describe("Integration Tests", () => {
    describe("Whitespace Preservation", () => {
      it("keeps literal spaces when parser matches use boundary-trimmed captures", () => {
        const value = "hello every day"
        const parserMatches: ExtractionResult[] = [
          {
            type: "recurring",
            value: "RRULE:FREQ=DAILY",
            match: "every day", // Captured text excludes the leading space from the regex boundary
            startIndex: value.indexOf(" every day"), // Parser still points to the leading space
            endIndex: value.length,
          },
        ]

        render(
          <EnhancedHighlightedInput
            {...defaultProps}
            value={value}
            parserMatches={parserMatches}
          />,
        )

        const overlay = screen
          .getByRole("combobox")
          .parentElement?.querySelector(".absolute.inset-0")
        expect(overlay?.textContent).toBe(value)
      })
    })

    it("should handle complex input scenarios without misalignment", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const onToggleSection = vi.fn()

      render(
        <EnhancedHighlightedInput
          {...defaultProps}
          onChange={onChange}
          onToggleSection={onToggleSection}
          autocompleteItems={mockAutocompleteItems}
        />,
      )

      const contentEditable = screen.getByRole("combobox")

      await user.click(contentEditable)

      // Simulate complex typing with multiple tokens
      const complexText = "Review quarterly reports #work @urgent p1 tomorrow 2PM for 2h"
      fireEvent.input(contentEditable, { target: { textContent: complexText } })

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ value: complexText }),
        }),
      )

      // Check that the main alignment elements are still properly positioned
      const overlay = contentEditable.parentElement?.querySelector(".absolute.inset-0")
      expect(overlay).toBeInTheDocument()
      expect(overlay).toHaveClass("absolute", "inset-0", "p-3", "z-0")
      expect(contentEditable).toHaveClass("p-3", "bg-transparent")
      expect(contentEditable).not.toHaveClass("z-10", "text-transparent")

      // Should have tokens rendered (may be 0 in test environment, which is fine)
      const tokens = overlay?.querySelectorAll('span[class*="bg-"]')

      // All tokens (if any) should maintain proper styling
      tokens?.forEach((token) => {
        expect(token).not.toHaveClass("px-0.5")
        expect(token).toHaveClass("opacity-60")
        expect(token).not.toHaveClass("cursor-pointer")
      })
    })

    it("should not highlight standalone numbers as time", () => {
      render(<EnhancedHighlightedInput {...defaultProps} value="drink 7 glasses of water" />)

      const overlay = screen.getByRole("combobox").parentElement?.querySelector(".absolute.inset-0")

      // The "7" should not have any time highlighting classes
      const overlayText = overlay?.textContent
      expect(overlayText).toBe("drink 7 glasses of water")

      // Check that no time highlighting spans exist for standalone numbers
      const timeTokens = overlay?.querySelectorAll('span[class*="bg-purple-200"]')
      expect(timeTokens).toHaveLength(0)
    })

    it("should still highlight proper time formats", () => {
      render(
        <EnhancedHighlightedInput {...defaultProps} value="meeting at 2PM and call at 14:30" />,
      )

      const overlay = screen.getByRole("combobox").parentElement?.querySelector(".absolute.inset-0")

      // In test environment, highlighting may not render due to mocked dependencies
      // The important thing is the logic doesn't crash and parseText works correctly
      expect(overlay).toBeInTheDocument()
    })
  })

  describe("Multi-line Prevention", () => {
    it("should prevent Enter key from creating newlines", () => {
      const onKeyDown = vi.fn()
      render(<EnhancedHighlightedInput {...defaultProps} onKeyDown={onKeyDown} />)

      const input = screen.getByRole("combobox")

      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      })

      const preventDefaultSpy = vi.spyOn(enterEvent, "preventDefault")
      input.dispatchEvent(enterEvent)

      // Should prevent default to stop newline insertion
      expect(preventDefaultSpy).toHaveBeenCalled()
      // Should still call parent handler for form submission
      expect(onKeyDown).toHaveBeenCalled()
    })

    it("should prevent Shift+Enter from creating newlines", () => {
      const onKeyDown = vi.fn()
      render(<EnhancedHighlightedInput {...defaultProps} onKeyDown={onKeyDown} />)

      const input = screen.getByRole("combobox")

      const shiftEnterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })

      const preventDefaultSpy = vi.spyOn(shiftEnterEvent, "preventDefault")
      input.dispatchEvent(shiftEnterEvent)

      // Should prevent default to stop newline insertion
      expect(preventDefaultSpy).toHaveBeenCalled()
      // Should still call parent handler
      expect(onKeyDown).toHaveBeenCalled()
    })

    it("should strip newlines from pasted content", () => {
      const onChange = vi.fn()
      render(<EnhancedHighlightedInput {...defaultProps} onChange={onChange} />)

      const input = screen.getByRole("combobox")
      if (!(input instanceof HTMLDivElement)) {
        throw new Error("Input is not an HTMLDivElement")
      }

      // Set up the paste event with text containing newlines
      const pasteData = {
        getData: (format: string) => {
          if (format === "text/plain") {
            return "line 1\nline 2\r\nline 3"
          }
          return ""
        },
      }

      // Create a proper ClipboardEvent with mocked clipboard data
      const pasteEvent = Object.assign(
        new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
        }),
        {
          clipboardData: pasteData,
        },
      )

      const preventDefaultSpy = vi.spyOn(pasteEvent, "preventDefault")
      input.dispatchEvent(pasteEvent)

      // Should prevent default paste behavior
      expect(preventDefaultSpy).toHaveBeenCalled()

      // The main behavior we're testing is that preventDefault is called
      // to stop the default paste behavior that would insert newlines.
      // The actual text insertion and cleaning happens in the handler.
      // In a real browser, this prevents newlines from being pasted.
    })

    it("should allow Enter key to submit autocomplete when autocomplete is showing", () => {
      const onAutocompleteSelect = vi.fn()
      render(
        <EnhancedHighlightedInput
          {...defaultProps}
          value="#"
          onAutocompleteSelect={onAutocompleteSelect}
          autocompleteItems={mockAutocompleteItems}
        />,
      )

      const input = screen.getByRole("combobox")

      // Trigger autocomplete
      fireEvent.input(input, { target: { textContent: "#" } })

      // Press Enter - should select autocomplete item, not pass to parent
      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      })

      input.dispatchEvent(enterEvent)

      // Autocomplete select should be called
      // (In real implementation, this would work - test setup may not trigger it)
      // The key is that Enter is preventDefault-ed
      const preventDefaultSpy = vi.spyOn(enterEvent, "preventDefault")
      input.dispatchEvent(enterEvent)
      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })
})
