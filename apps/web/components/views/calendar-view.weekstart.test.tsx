import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render } from "@/test-utils"
import { CalendarView } from "./calendar-view"

vi.mock("@/components/ui/drop-target-wrapper", () => ({
  DropTargetWrapper: ({
    children,
    dropTargetId,
    className,
  }: {
    children: React.ReactNode
    dropTargetId?: string
    className?: string
  }) => (
    <div data-testid={`droppable-${dropTargetId}`} className={className}>
      {children}
    </div>
  ),
}))

vi.mock("@tasktrove/atoms/data/base/atoms", async () => {
  const actual = await vi.importActual<typeof import("@tasktrove/atoms/data/base/atoms")>(
    "@tasktrove/atoms/data/base/atoms",
  )
  const { atom } = await import("jotai")
  const { DEFAULT_USER_SETTINGS } = await import("@tasktrove/types/defaults")
  return {
    ...actual,
    settingsAtom: atom({
      ...DEFAULT_USER_SETTINGS,
      uiSettings: { weekStartsOn: 1 },
    }),
  }
})

describe("CalendarView respects weekStartsOn", () => {
  const baseProps = {
    tasks: [],
    onDateClick: () => {},
    viewMode: "month" as const,
    currentDate: new Date(2024, 0, 17), // Wednesday, Jan 17 2024
  }

  it("uses weekStartsOn for month grid start", () => {
    const { container } = render(<CalendarView {...baseProps} />, {})

    // First calendar cell should be Monday Jan 1 (not Sunday Dec 31)
    const firstCell = container.querySelectorAll('[data-testid^="droppable-calendar-day-"]')[0]
    expect(firstCell?.getAttribute("data-testid")).toBe("droppable-calendar-day-2024-01-01")
  })

  it("uses weekStartsOn for week view range", () => {
    const { container } = render(<CalendarView {...baseProps} viewMode="week" />, {})

    const headerGrid = container.querySelector(".grid.grid-cols-7")
    const firstHeader = headerGrid?.firstElementChild?.textContent?.toLowerCase()
    expect(firstHeader).toContain("mon")
  })
})
