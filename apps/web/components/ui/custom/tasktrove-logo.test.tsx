import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen } from "@/test-utils"
import { TaskTroveLogo } from "./tasktrove-logo"

describe("TaskTroveLogo", () => {
  it("renders TaskTrove text", () => {
    render(<TaskTroveLogo />)
    expect(screen.getByRole("heading", { name: /tasktrove/i })).toBeInTheDocument()
  })

  it("applies default medium size classes", () => {
    render(<TaskTroveLogo />)
    const heading = screen.getByRole("heading", { name: /tasktrove/i })
    expect(heading).toHaveClass("text-2xl")
    const flickerText = heading.querySelector("span")
    expect(flickerText).toHaveClass("font-semibold")
    expect(flickerText).toHaveClass("text-sidebar-foreground")
    expect(flickerText).toHaveClass("uppercase")
  })

  it("applies small size classes when size is sm", () => {
    render(<TaskTroveLogo size="sm" />)
    const heading = screen.getByRole("heading", { name: /tasktrove/i })
    expect(heading).toHaveClass("text-xl")
    const flickerText = heading.querySelector("span")
    expect(flickerText).toHaveClass("font-semibold")
    expect(flickerText).toHaveClass("text-sidebar-foreground")
    expect(flickerText).toHaveClass("uppercase")
  })

  it("applies large size classes when size is lg", () => {
    render(<TaskTroveLogo size="lg" />)
    const heading = screen.getByRole("heading", { name: /tasktrove/i })
    expect(heading).toHaveClass("text-3xl")
    const flickerText = heading.querySelector("span")
    expect(flickerText).toHaveClass("font-semibold")
    expect(flickerText).toHaveClass("text-sidebar-foreground")
    expect(flickerText).toHaveClass("uppercase")
  })

  it("applies custom className when provided", () => {
    render(<TaskTroveLogo className="custom-class" />)
    const heading = screen.getByRole("heading", { name: /tasktrove/i })
    expect(heading).toHaveClass("custom-class")
    const flickerText = heading.querySelector("span")
    expect(flickerText).toHaveClass("font-semibold")
    expect(flickerText).toHaveClass("text-sidebar-foreground")
    expect(flickerText).toHaveClass("uppercase")
  })

  it("merges custom className with default classes", () => {
    render(<TaskTroveLogo className="text-red-500" size="lg" />)
    const heading = screen.getByRole("heading", { name: /tasktrove/i })
    expect(heading).toHaveClass("text-red-500")
    expect(heading).toHaveClass("text-3xl")
    const flickerText = heading.querySelector("span")
    expect(flickerText).toHaveClass("font-semibold")
    expect(flickerText).toHaveClass("uppercase")
    // text-red-500 overrides text-sidebar-foreground due to CSS specificity, this is expected
  })

  it("renders as h1 element", () => {
    render(<TaskTroveLogo />)
    const heading = screen.getByRole("heading", { name: /tasktrove/i })
    expect(heading.tagName).toBe("H1")
  })

  it("applies hover effects for stronger text and underline", () => {
    render(<TaskTroveLogo />)
    const flickerText = screen.getByText("TaskTrove")
    expect(flickerText.className).toMatch(/hover:\[text-shadow:0\.5px_0_0_currentColor\]/)
    expect(flickerText).toHaveClass("hover:text-primary")
    expect(flickerText).toHaveClass("hover:after:h-[2px]")
    // Dark mode glow effects are now handled by FlickerText component
  })

  it("includes underline styling", () => {
    render(<TaskTroveLogo />)
    const flickerText = screen.getByText("TaskTrove")
    expect(flickerText).toHaveClass("relative", "pb-1")
    expect(flickerText.className).toMatch(/after:content-/)
    expect(flickerText.className).toMatch(/after:right-\[0\.4em\]/)
  })
})
