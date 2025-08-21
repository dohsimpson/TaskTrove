import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { TaskShadow } from "./task-shadow"

describe("TaskShadow", () => {
  it("renders with correct height", () => {
    const { container } = render(<TaskShadow height={100} />)
    const shadow = container.firstChild
    expect(shadow).toBeDefined()
    if (shadow instanceof HTMLElement) {
      expect(shadow.style.height).toBe("100px")
    }
  })

  it("applies custom className", () => {
    const { container } = render(<TaskShadow height={100} className="custom-class" />)
    const shadow = container.firstChild
    if (shadow instanceof HTMLElement) {
      expect(shadow.classList.contains("custom-class")).toBe(true)
    }
  })

  it("has default styling classes", () => {
    const { container } = render(<TaskShadow height={50} />)
    const shadow = container.firstChild
    if (shadow instanceof HTMLElement) {
      expect(shadow.classList.contains("flex-shrink-0")).toBe(true)
      expect(shadow.classList.contains("rounded-md")).toBe(true)
    }
  })
})
