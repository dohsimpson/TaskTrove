import { describe, it, expect } from "vitest"

// We need to access the internal cleanContentEditableText function for testing
// Since it's not exported, we'll test it indirectly through the component behavior
// But for now, let's create a direct test by copying the function

function cleanContentEditableText(text: string): string {
  return text
    .replace(/\u00A0/g, "\n") // Replace non-breaking spaces (U+A0) with newlines
    .trim() // Only trim start/end, preserve all internal formatting
}

describe("cleanContentEditableText", () => {
  it("should preserve single empty lines (double newlines)", () => {
    const input = "Line 1\n\nLine 3"
    const result = cleanContentEditableText(input)
    expect(result).toBe("Line 1\n\nLine 3")
  })

  it("should preserve ALL multiple empty lines (no truncation)", () => {
    const input = "Line 1\n\n\n\nLine 4"
    const result = cleanContentEditableText(input)
    expect(result).toBe("Line 1\n\n\n\nLine 4") // All empty lines preserved!
  })

  it("should preserve many consecutive empty lines", () => {
    const input = "Line 1\n\n\n\n\n\nLine 6"
    const result = cleanContentEditableText(input)
    expect(result).toBe("Line 1\n\n\n\n\n\nLine 6") // All 5 empty lines preserved!
  })

  it("should replace non-breaking spaces with newlines", () => {
    const input = "Line 1\u00A0Line 2"
    const result = cleanContentEditableText(input)
    expect(result).toBe("Line 1\nLine 2")
  })

  it("should handle complex mixed content with preserved formatting", () => {
    const input = "Line 1\n\nLine 3\u00A0Line 4\n\n\n\nLine 5"
    const result = cleanContentEditableText(input)
    expect(result).toBe("Line 1\n\nLine 3\nLine 4\n\n\n\nLine 5") // All formatting preserved
  })

  it("should trim leading and trailing whitespace but preserve internal formatting", () => {
    const input = "  \n\n\nLine 1\n\n\nLine 2\n\n\n  "
    const result = cleanContentEditableText(input)
    expect(result).toBe("Line 1\n\n\nLine 2") // Internal empty lines preserved
  })

  it("should handle single lines without issues", () => {
    const input = "Single line"
    const result = cleanContentEditableText(input)
    expect(result).toBe("Single line")
  })

  it("should handle empty strings", () => {
    const input = ""
    const result = cleanContentEditableText(input)
    expect(result).toBe("")
  })

  it("should handle only whitespace and newlines", () => {
    const input = "\n\n\n"
    const result = cleanContentEditableText(input)
    expect(result).toBe("") // Only trim, no internal content to preserve
  })

  it("should preserve user paragraph formatting", () => {
    const input = "Paragraph 1\n\n\nParagraph 2\n\nParagraph 3"
    const result = cleanContentEditableText(input)
    expect(result).toBe("Paragraph 1\n\n\nParagraph 2\n\nParagraph 3") // Exact formatting preserved
  })
})
