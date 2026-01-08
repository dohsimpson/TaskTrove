import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render } from "@/test-utils"
import { waitFor } from "@testing-library/react"
import { tasksAtom } from "@tasktrove/atoms/data/base/atoms"
import { quickAddTaskAtom } from "@tasktrove/atoms/ui/dialogs"

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}))

import { TaskScheduleContent } from "./task-schedule-content"

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

describe("TaskScheduleContent respects weekStartsOn", () => {
  it("renders calendar starting on Monday when weekStartsOn=1", async () => {
    const { container, getByRole } = render(<TaskScheduleContent onClose={() => {}} />, {
      initialAtomValues: [
        [tasksAtom, []],
        [quickAddTaskAtom, {}],
      ],
    })

    getByRole("button", { name: /Date/ }).click()
    await waitFor(() => {
      expect(container.querySelectorAll(".rdp-weekday").length).toBeGreaterThan(0)
    })

    const weekdayHeaders = Array.from(container.querySelectorAll(".rdp-weekday")).map(
      (node) => node.textContent,
    )

    expect(weekdayHeaders[0]?.toLowerCase()?.startsWith("mo")).toBe(true)
  })
})
