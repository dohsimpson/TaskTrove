import { describe, it, expect, vi } from "vitest"
import { render, screen, within, fireEvent } from "@testing-library/react"
import { MarkdownRenderer } from "./markdown-renderer"

describe("MarkdownRenderer", () => {
  it("renders emphasis, strong, strike, and inline code", () => {
    render(<MarkdownRenderer>{"This **bold** *italic* ~~strike~~ `code` text"}</MarkdownRenderer>)

    expect(screen.getByText("bold").tagName).toBe("STRONG")
    expect(screen.getByText("italic").tagName).toBe("EM")
    expect(screen.getByText("strike").tagName).toBe("DEL")
    const codeElement = screen.getByText("code")
    expect(codeElement.tagName).toBe("CODE")
    expect(codeElement).toHaveClass("font-mono")
  })

  it("renders nested formatting correctly", () => {
    render(<MarkdownRenderer>{"**bold and *nested italic*** text"}</MarkdownRenderer>)
    const strongElement = screen.getByText(
      (_content, element) => element !== null && element.tagName === "STRONG",
    )
    expect(strongElement).toBeInstanceOf(HTMLElement)
    expect(strongElement.textContent).toContain("bold and")
    const italicNode = screen.getByText("nested italic")
    expect(italicNode.tagName).toBe("EM")
  })

  it("renders headings with appropriate styles", () => {
    render(<MarkdownRenderer>{"# Title\n\n## Subtitle"}</MarkdownRenderer>)

    const [title, subtitle] = screen.getAllByRole("heading")
    expect(title).toHaveClass("text-xl")
    expect(subtitle).toHaveClass("text-lg")
  })

  it("renders ordered and unordered lists", () => {
    render(<MarkdownRenderer>{"- Item one\n- Item two\n\n1. First\n2. Second"}</MarkdownRenderer>)

    const lists = screen.getAllByRole("list")
    expect(lists).toHaveLength(2)
    const [unordered, ordered] = lists
    expect(unordered).toBeDefined()
    expect(ordered).toBeDefined()
    if (!unordered || !ordered) {
      throw new Error("Expected two list elements")
    }
    expect(unordered.tagName).toBe("UL")
    expect(within(unordered).getAllByRole("listitem")).toHaveLength(2)

    expect(ordered.tagName).toBe("OL")
    expect(within(ordered).getAllByRole("listitem")).toHaveLength(2)
  })

  it("renders task list checkboxes", () => {
    render(<MarkdownRenderer>{"- [ ] Todo item\n- [x] Completed item"}</MarkdownRenderer>)

    const list = screen.getByRole("list")
    expect(list).toHaveClass("list-none")

    const checkboxes = screen.getAllByRole("checkbox")
    expect(checkboxes).toHaveLength(2)
    expect(checkboxes[0]).toHaveAttribute("aria-checked", "false")
    expect(checkboxes[1]).toHaveAttribute("aria-checked", "true")
    expect(checkboxes[0]).toHaveClass("cursor-pointer")

    const completed = screen.getByText("Completed item").closest("div")
    expect(completed).toHaveClass("line-through")
  })

  it("invokes onTaskItemToggle with sequential indexes", () => {
    const handleToggle = vi.fn()
    render(
      <MarkdownRenderer onTaskItemToggle={handleToggle}>
        {"- [ ] First\n- [x] Second"}
      </MarkdownRenderer>,
    )

    const checkboxes = screen.getAllByRole("checkbox")
    expect(checkboxes).toHaveLength(2)
    const secondCheckbox = checkboxes[1]
    if (!secondCheckbox) {
      throw new Error("Expected second checkbox")
    }
    fireEvent.click(secondCheckbox)
    expect(handleToggle).toHaveBeenCalledTimes(1)
    expect(handleToggle).toHaveBeenCalledWith(1)
  })

  it("renders blockquotes and fenced code blocks", () => {
    render(<MarkdownRenderer>{"> Quote line\n\n```ts\nconst value = 1\n```"}</MarkdownRenderer>)

    expect(screen.getByText("Quote line").closest("blockquote")).toBeInTheDocument()
    const code = screen.getByText("const value = 1")
    expect(code.closest("pre")).toBeInTheDocument()
  })

  it("auto linkifies plain URLs and emails", () => {
    render(
      <MarkdownRenderer>{"Visit https://example.com or email team@example.com"}</MarkdownRenderer>,
    )

    expect(screen.getByText("https://example.com")).toHaveAttribute("href", "https://example.com")
    expect(screen.getByText("team@example.com")).toHaveAttribute("href", "mailto:team@example.com")
  })

  it("linkifies URLs containing underscores without italicizing", () => {
    render(<MarkdownRenderer>{"https://example.org/How_to_log_in_to_DSM"}</MarkdownRenderer>)

    const link = screen.getByText("https://example.org/How_to_log_in_to_DSM")
    expect(link.tagName).toBe("A")
    expect(link).toHaveAttribute("href", "https://example.org/How_to_log_in_to_DSM")
  })

  it("does not nest anchors when rendering markdown links that look like URLs", () => {
    render(
      <MarkdownRenderer>
        {"[Docs](https://example.org/How_to_log_in_to_DSM) visit https://example.org"}
      </MarkdownRenderer>,
    )

    const anchors = screen.getAllByRole("link")
    expect(anchors).toHaveLength(2)
    expect(anchors[0]).toBeInTheDocument()
    expect(anchors[0]?.textContent).toBe("Docs")
    expect(anchors[0]).toHaveAttribute("href", "https://example.org/How_to_log_in_to_DSM")
  })

  it("renders a single anchor when the markdown link text is itself a URL", () => {
    render(
      <MarkdownRenderer>
        {"[https://example.org/How_to_log_in_to_DSM](https://example.org/How_to_log_in_to_DSM)"}
      </MarkdownRenderer>,
    )

    const anchors = screen.getAllByRole("link")
    expect(anchors).toHaveLength(1)
    expect(anchors[0]).toBeInTheDocument()
    expect(anchors[0]?.textContent).toBe("https://example.org/How_to_log_in_to_DSM")
    expect(anchors[0]).toHaveAttribute("href", "https://example.org/How_to_log_in_to_DSM")
  })

  it("sanitizes unsafe markdown links", () => {
    render(<MarkdownRenderer>{"[Bad](javascript:alert('xss')) text"}</MarkdownRenderer>)

    expect(screen.queryByRole("link", { name: "Bad" })).not.toBeInTheDocument()
    expect(screen.getByText("Bad")).toBeInTheDocument()
  })

  it("respects custom className on container", () => {
    render(<MarkdownRenderer className="custom-style">Content</MarkdownRenderer>)
    const container = screen.getByText("Content").closest("div")
    expect(container).toHaveClass("custom-style")
    expect(container).toHaveClass("markdown-renderer")
  })

  it("renders inline variant when using span host", () => {
    render(<MarkdownRenderer as="span">Inline text</MarkdownRenderer>)
    const span = screen.getByText("Inline text")
    expect(span.tagName).toBe("SPAN")
    expect(span.className).toBe("")
  })

  it("keeps link text with underscores intact even when different from href", () => {
    render(
      <MarkdownRenderer>
        {"[https://example.org/How_to_win](https://example.org/How_to_log_in_to_DSM)"}
      </MarkdownRenderer>,
    )

    const anchors = screen.getAllByRole("link")
    expect(anchors).toHaveLength(1)
    expect(anchors[0]).toBeInTheDocument()
    expect(anchors[0]?.textContent).toBe("https://example.org/How_to_win")
    expect(anchors[0]).toHaveAttribute("href", "https://example.org/How_to_log_in_to_DSM")
  })
})
