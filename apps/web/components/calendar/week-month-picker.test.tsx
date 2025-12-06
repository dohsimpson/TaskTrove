import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { getWeek, startOfWeek } from "date-fns"
import { describe, test, expect, vi } from "vitest"

vi.mock("@/components/ui/custom/drawer", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react")
  type DrawerCtx = { open: boolean; setOpen: (value: boolean) => void }
  // @ts-expect-error - Untyped function calls may not accept type arguments in test context
  const DrawerContext = React.createContext<DrawerCtx | null>(null)

  function Drawer({
    open,
    onOpenChange,
    children,
  }: {
    open?: boolean
    onOpenChange?: (v: boolean) => void
    children: React.ReactNode
  }) {
    const [internalOpen, setInternalOpen] = React.useState(open ?? false)
    const actualOpen = open ?? internalOpen
    const setOpen = (value: boolean) => {
      onOpenChange?.(value)
      if (open === undefined) setInternalOpen(value)
    }
    return React.createElement(
      DrawerContext.Provider,
      { value: { open: actualOpen, setOpen } },
      children,
    )
  }

  function DrawerTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactNode }) {
    const ctx = React.useContext(DrawerContext)
    if (!ctx) {
      return React.createElement("button", { type: "button", onClick: () => {} }, children)
    }

    if (asChild && React.isValidElement(children)) {
      // Clone and wrap to add our click handler
      // For testing purposes, we just ensure clicking sets open
      return React.cloneElement(children, {
        onClick: () => {
          ctx.setOpen(true)
        },
      })
    }
    return React.createElement(
      "button",
      { type: "button", onClick: () => ctx.setOpen(true) },
      children,
    )
  }

  function DrawerContent({ children }: { children: React.ReactNode }) {
    const ctx = React.useContext(DrawerContext)
    return ctx?.open
      ? React.createElement("div", { "data-slot": "drawer-content" }, children)
      : null
  }

  const passThrough = (tag: string) => {
    const Component = (props: React.ComponentProps<"div">) => React.createElement(tag, props)
    Component.displayName = tag
    return Component
  }

  const DrawerCloseButton = (props: { children?: React.ReactNode }) => {
    return React.createElement("button", props)
  }
  DrawerCloseButton.displayName = "DrawerClose"

  return {
    Drawer,
    DrawerTrigger,
    DrawerPortal: passThrough("div"),
    DrawerOverlay: passThrough("div"),
    DrawerClose: DrawerCloseButton,
    DrawerContent,
    DrawerHeader: passThrough("div"),
    DrawerFooter: passThrough("div"),
    DrawerTitle: passThrough("div"),
    DrawerDescription: passThrough("div"),
  }
})

import { WeekMonthPicker } from "@/components/calendar/week-month-picker"

describe("WeekMonthPicker", () => {
  test("selects a week and returns the start date for that week (desktop)", async () => {
    const onSelectDate = vi.fn()
    const currentDate = new Date("2024-04-10") // Wednesday in week 15 (ISO)
    const weekStartsOn = 1
    const currentWeekNumber = getWeek(startOfWeek(currentDate, { weekStartsOn }), { weekStartsOn })

    render(
      <WeekMonthPicker
        mode="week"
        currentDate={currentDate}
        weekStartsOn={weekStartsOn}
        onSelectDate={onSelectDate}
      />,
    )

    const triggers = screen.getAllByRole("button", {
      name: new RegExp(`Week ${currentWeekNumber}`),
    })
    expect(triggers.length).toBeGreaterThan(0)
    const trigger = triggers[0]
    if (trigger) {
      await userEvent.click(trigger)
    }

    const targetWeek = screen.getByRole("button", { name: /Week 10.*Mar 4 - Mar 10/i })
    await userEvent.click(targetWeek)

    expect(onSelectDate).toHaveBeenCalledTimes(1)
    expect(onSelectDate.mock.calls[0]).toBeDefined()
    const call = onSelectDate.mock.calls[0]
    expect(call?.[0]).toBeDefined()
    const selectedDate = call?.[0]
    if (!(selectedDate instanceof Date)) {
      throw new Error("Expected Date")
    }
    expect(getWeek(selectedDate, { weekStartsOn })).toBe(10)
    expect(selectedDate.toISOString().slice(0, 10)).toBe("2024-03-04")
  })

  test("updates displayed month when choosing year then month (desktop month mode)", async () => {
    function Wrapper() {
      const [currentDate, setCurrentDate] = React.useState(new Date("2023-07-15"))
      return (
        <WeekMonthPicker
          mode="month"
          currentDate={currentDate}
          weekStartsOn={1}
          onSelectDate={setCurrentDate}
        />
      )
    }

    render(<Wrapper />)

    const trigger = screen.getByRole("button", { name: /july 2023/i })
    await userEvent.click(trigger)

    await userEvent.click(screen.getByRole("button", { name: "2025" }))
    expect(await screen.findByRole("button", { name: /july 2025/i })).toBeInTheDocument()

    const triggerAfterYear = screen.getByRole("button", { name: /july 2025/i })
    await userEvent.click(triggerAfterYear)
    if (!screen.queryByRole("dialog")) {
      await userEvent.click(triggerAfterYear)
    }

    const marchButtons = screen.getAllByRole("button", { name: /March/i })
    expect(marchButtons.length).toBeGreaterThan(0)
    const marchButton = marchButtons[0]
    if (marchButton) {
      await userEvent.click(marchButton)
    }

    expect(await screen.findByRole("button", { name: /march 2025/i })).toBeInTheDocument()
  })

  test("uses staged mobile flow and resets to year stage on reopen (week mode)", async () => {
    const onSelectDate = vi.fn()
    const originalMatchMedia = window.matchMedia
    const originalInnerWidth = window.innerWidth
    // Setup pointer capture methods for testing
    const setupPointerCapture = () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const elementProto = Element.prototype as unknown as {
        setPointerCapture?: (pointerId: number) => void
        releasePointerCapture?: () => void
      }
      if (!elementProto.setPointerCapture) {
        elementProto.setPointerCapture = vi.fn()
      }
      if (!elementProto.releasePointerCapture) {
        elementProto.releasePointerCapture = vi.fn()
      }
    }
    setupPointerCapture()

    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 640 })
    const mobileMatchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    // Type assertion needed because mockMedia has a different signature
    Object.defineProperty(window, "matchMedia", {
      value: mobileMatchMedia,
      writable: true,
      configurable: true,
    })

    try {
      render(
        <WeekMonthPicker
          mode="week"
          currentDate={new Date("2024-02-05")}
          weekStartsOn={0}
          onSelectDate={onSelectDate}
        />,
      )

      const triggers = screen.getAllByRole("button", { name: /Week \d+/ })
      expect(triggers.length).toBeGreaterThan(0)
      const trigger = triggers[0]
      if (trigger) {
        await userEvent.click(trigger)
      }

      expect(screen.getByText(/Step 1 of 2/i)).toBeInTheDocument()

      await userEvent.click(screen.getByRole("button", { name: "2026" }))
      expect(await screen.findByText(/Step 2 of 2/i)).toBeInTheDocument()
      const weekButtons = screen
        .getAllByRole("button", { name: /Week \d+/i })
        .filter((btn) => btn.closest('[data-slot="drawer-content"]'))
      expect(weekButtons.length).toBeGreaterThan(0)

      const firstWeekOption =
        weekButtons.find((btn) => btn.textContent?.includes("-")) ?? weekButtons[0]
      if (firstWeekOption) {
        await userEvent.click(firstWeekOption)
        expect(onSelectDate).toHaveBeenCalledTimes(1)
      }

      const triggersAfterClose = screen.getAllByRole("button", { name: /Week \d+/ })
      if (triggersAfterClose.length > 0) {
        if (triggersAfterClose[0]) {
          await userEvent.click(triggersAfterClose[0])
        }
      }
      expect(screen.getByText(/Step 1 of 2/i)).toBeInTheDocument()
    } finally {
      window.matchMedia = originalMatchMedia
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      })
    }
  })
})
