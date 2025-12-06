import React from "react"
import { describe, it, expect } from "vitest"
import { render } from "@/test-utils"
import { TaskScheduleContent } from "./task-schedule-content"
import { settingsAtom, tasksAtom } from "@tasktrove/atoms/data/base/atoms"
import { quickAddTaskAtom } from "@tasktrove/atoms/ui/dialogs"
import { DEFAULT_USER_SETTINGS } from "@tasktrove/types/defaults"
import type { UserSettings } from "@tasktrove/types/settings"

const mondaySettings: UserSettings = {
  ...DEFAULT_USER_SETTINGS,
  uiSettings: { weekStartsOn: 1 },
}

describe("TaskScheduleContent respects weekStartsOn", () => {
  it("renders calendar starting on Monday when weekStartsOn=1", () => {
    const { container } = render(<TaskScheduleContent onClose={() => {}} />, {
      initialAtomValues: [
        [settingsAtom, mondaySettings],
        [tasksAtom, []],
        [quickAddTaskAtom, {}],
      ],
    })

    const weekdayHeaders = Array.from(container.querySelectorAll(".rdp-weekday")).map(
      (node) => node.textContent,
    )

    expect(weekdayHeaders[0]?.toLowerCase()?.startsWith("mo")).toBe(true)
  })
})
