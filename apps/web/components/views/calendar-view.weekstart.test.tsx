import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render } from "@/test-utils"
import { CalendarView } from "./calendar-view"
import type { UserSettings } from "@tasktrove/types/settings"
import { settingsAtom } from "@tasktrove/atoms/data/base/atoms"
import { DEFAULT_USER_SETTINGS } from "@tasktrove/types/defaults"

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

const mondaySettings: UserSettings = {
  ...DEFAULT_USER_SETTINGS,
  uiSettings: { weekStartsOn: 1 },
}

describe("CalendarView respects weekStartsOn", () => {
  const baseProps = {
    tasks: [],
    onDateClick: () => {},
    viewMode: "month" as const,
    currentDate: new Date(2024, 0, 17), // Wednesday, Jan 17 2024
  }

  it("uses weekStartsOn for month grid start", () => {
    const { container } = render(<CalendarView {...baseProps} />, {
      initialAtomValues: [[settingsAtom, mondaySettings]],
    })

    // First calendar cell should be Monday Jan 1 (not Sunday Dec 31)
    const firstCell = container.querySelectorAll('[data-testid^="droppable-calendar-day-"]')[0]
    expect(firstCell?.getAttribute("data-testid")).toBe("droppable-calendar-day-2024-01-01")
  })

  it("uses weekStartsOn for week view range", () => {
    const { container } = render(<CalendarView {...baseProps} viewMode="week" />, {
      initialAtomValues: [[settingsAtom, mondaySettings]],
    })

    const headerGrid = container.querySelector(".grid.grid-cols-7")
    const firstHeader = headerGrid?.firstElementChild?.textContent?.toLowerCase()
    expect(firstHeader).toContain("mon")
  })
})
