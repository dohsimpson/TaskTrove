import { render, screen } from "@/test-utils"
import { describe, it, expect, vi } from "vitest"
import { LinkifiedText } from "./linkified-text"

// Note: Atom mocks are now centralized in test-utils/atoms-mocks.ts

// Mock Jotai
vi.mock("jotai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jotai")>()
  return {
    ...actual,
    useAtomValue: vi.fn(() => ({ general: { linkifyEnabled: true } })),
  }
})

import { useAtomValue } from "jotai"
const mockUseAtomValue = vi.mocked(useAtomValue)

// Mock linkify-react
vi.mock("linkify-react", () => ({
  default: ({
    children,
    options,
  }: {
    children: React.ReactNode
    options: Record<string, unknown>
  }) => (
    <span data-testid="linkified" data-options={JSON.stringify(options)}>
      {children}
    </span>
  ),
}))

describe("LinkifiedText", () => {
  it("renders with linkification when enabled", () => {
    mockUseAtomValue.mockReturnValue({ general: { linkifyEnabled: true } })

    render(<LinkifiedText>Visit https://example.com for more info</LinkifiedText>)

    const linkified = screen.getByTestId("linkified")
    expect(linkified).toBeInTheDocument()
    expect(linkified).toHaveTextContent("Visit https://example.com for more info")
  })

  it("renders without linkification when disabled", () => {
    mockUseAtomValue.mockReturnValue({ general: { linkifyEnabled: false } })

    render(<LinkifiedText>Visit https://example.com for more info</LinkifiedText>)

    expect(screen.queryByTestId("linkified")).not.toBeInTheDocument()
    expect(screen.getByText("Visit https://example.com for more info")).toBeInTheDocument()
  })

  it("passes through className and other props", () => {
    mockUseAtomValue.mockReturnValue({ general: { linkifyEnabled: false } })

    render(
      <LinkifiedText className="test-class" data-testid="custom-test">
        Test content
      </LinkifiedText>,
    )

    const element = screen.getByTestId("custom-test")
    expect(element).toHaveClass("test-class")
    expect(element).toHaveTextContent("Test content")
  })

  it("renders as specified component type", () => {
    mockUseAtomValue.mockReturnValue({ general: { linkifyEnabled: false } })

    render(
      <LinkifiedText as="h1" data-testid="heading">
        Heading content
      </LinkifiedText>,
    )

    const element = screen.getByTestId("heading")
    expect(element.tagName).toBe("H1")
  })
})
