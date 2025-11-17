import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, cleanup } from "@testing-library/react"
import { FloatingDock } from "./floating-dock"

describe("FloatingDock", () => {
  beforeEach(() => {
    cleanup()
  })

  it("renders the trigger and opens the panel", () => {
    const onOpenChange = vi.fn()
    render(
      <FloatingDock triggerLabel="Queue" isOpen={false} onOpenChange={onOpenChange}>
        <div>Content</div>
      </FloatingDock>,
    )

    const trigger = screen.getByRole("button", { name: /queue/i })
    fireEvent.click(trigger)
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it("hides the trigger when open if hideTriggerWhenOpen is true", () => {
    render(
      <FloatingDock triggerLabel="Queue" isOpen hideTriggerWhenOpen onOpenChange={() => {}}>
        <div data-testid="panel-content">Content</div>
      </FloatingDock>,
    )

    expect(screen.queryByRole("button", { name: /queue/i })).toBeNull()
    expect(screen.getByTestId("panel-content")).toBeInTheDocument()
  })

  it("closes on Escape when closeOnEscape is enabled", () => {
    const onOpenChange = vi.fn()
    render(
      <FloatingDock triggerLabel="Queue" isOpen onOpenChange={onOpenChange}>
        <div>Content</div>
      </FloatingDock>,
    )

    fireEvent.keyDown(document, { key: "Escape" })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
