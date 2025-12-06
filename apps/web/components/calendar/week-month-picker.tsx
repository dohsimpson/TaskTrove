"use client"

import { useEffect, useState } from "react"
import {
  addDays,
  endOfWeek,
  endOfYear,
  format,
  getWeek,
  getWeekYear,
  startOfWeek,
  startOfYear,
} from "date-fns"
import type { WeekStartsOn } from "@tasktrove/types/settings"
import { ContentPopover } from "@/components/ui/content-popover"
import { Button } from "@/components/ui/button"

type PickerMode = "week" | "month"
type PickerStage = "year" | "month" | "week"

type WeekMonthPickerProps = {
  mode: PickerMode
  currentDate: Date
  weekStartsOn: WeekStartsOn
  onSelectDate: (date: Date) => void
}

type PickerOption = { value: string; label: string; rangeLabel?: string; start: Date }

export function WeekMonthPicker({
  mode,
  currentDate,
  weekStartsOn,
  onSelectDate,
}: WeekMonthPickerProps) {
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<PickerStage>("year")
  const [isMobile, setIsMobile] = useState(false)
  const [pendingYear, setPendingYear] = useState<number | null>(null)
  const [pendingMonth, setPendingMonth] = useState<number | null>(null)

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)")
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => setIsMobile(event.matches)
    handleChange(mq)
    mq.addEventListener("change", handleChange)
    return () => mq.removeEventListener("change", handleChange)
  }, [])

  // Reset the stage each time the popover opens
  useEffect(() => {
    if (open) {
      setStage("year")
      setPendingYear(null)
      setPendingMonth(null)
    }
  }, [open])
  const weekRangeStart = startOfWeek(currentDate, { weekStartsOn })
  const weekRangeEnd = endOfWeek(currentDate, { weekStartsOn })
  const currentWeekNumber = getWeek(weekRangeStart, { weekStartsOn })

  // Weeks (only for week mode)
  const effectiveYear =
    pendingYear ??
    (mode === "week" ? getWeekYear(currentDate, { weekStartsOn }) : currentDate.getFullYear())
  const effectiveMonth = pendingMonth ?? currentDate.getMonth()

  const weekOptions: PickerOption[] = []
  if (mode === "week") {
    const yearStart = startOfYear(new Date(effectiveYear, 0, 1))
    const yearEnd = endOfYear(new Date(effectiveYear, 0, 1))
    const firstWeekStart = startOfWeek(yearStart, { weekStartsOn })
    let cursor = firstWeekStart
    while (cursor <= yearEnd) {
      const start = cursor
      const end = endOfWeek(start, { weekStartsOn })
      const weekNumber = getWeek(start, { weekStartsOn })
      const key = `week-${weekNumber}-${format(start, "yyyy-MM-dd")}`
      weekOptions.push({
        value: key,
        label: `Week ${weekNumber}`,
        rangeLabel: `${format(start, "MMM d")} - ${format(end, "MMM d")}`,
        start,
      })
      cursor = addDays(cursor, 7)
    }
  }

  // Months column
  const monthOptions: PickerOption[] = Array.from({ length: 12 }, (_, i) => {
    const monthDate = new Date(effectiveYear, i, 1)
    return {
      value: `month-${i}`,
      label: format(monthDate, "MMMM"),
      start: monthDate,
    }
  })

  // Years column (±10 years around current)
  const years: PickerOption[] = Array.from({ length: 16 }, (_, i) => {
    const year = 2020 + i // fixed range 2020-2035
    return {
      value: `year-${year}`,
      label: year.toString(),
      start: new Date(year, effectiveMonth, 1),
    }
  })

  const currentValues = {
    week: (() => {
      const match = weekOptions.find(
        (opt) => getWeek(opt.start, { weekStartsOn }).toString() === currentWeekNumber.toString(),
      )
      return match?.value ?? weekOptions[0]?.value ?? `week-${currentWeekNumber}`
    })(),
    month: `month-${effectiveMonth}`,
    year: `year-${effectiveYear}`,
  }

  const stageOrder: PickerStage[] = mode === "week" ? ["year", "week"] : ["year", "month"]

  const advanceStage = (current: PickerStage) => {
    const index = stageOrder.indexOf(current)
    const next = stageOrder[index + 1]
    if (next) {
      setStage(next)
      return true
    }
    return false
  }

  const handleSelect = (value: string) => {
    if (value.startsWith("week-")) {
      const selected = weekOptions.find((opt) => opt.value === value)
      if (selected) onSelectDate(selected.start)
      // Close only for smallest granularity in week mode
      setOpen(false)
      return
    }
    if (value.startsWith("month-")) {
      const monthIndex = Number(value.replace("month-", ""))
      if (Number.isNaN(monthIndex)) return

      if (mode === "week") {
        setPendingMonth(monthIndex)
        return
      }

      onSelectDate(new Date(effectiveYear, monthIndex, 1))
      setOpen(false)
      return
    }
    if (value.startsWith("year-")) {
      const yr = Number(value.replace("year-", ""))
      if (Number.isNaN(yr)) return

      if (mode === "week") {
        setPendingYear(yr)
        return
      }

      onSelectDate(new Date(yr, effectiveMonth, 1))
      // Keep open so user can choose month after selecting year
      return
    }
  }

  const showWeeks = mode === "week"

  const handleMobileSelect = (currentStage: PickerStage, value: string) => {
    if (currentStage === "year" && value.startsWith("year-")) {
      const yr = Number(value.replace("year-", ""))
      if (Number.isNaN(yr)) return
      if (mode === "week") {
        setPendingYear(yr)
      } else {
        onSelectDate(new Date(yr, effectiveMonth, 1))
      }
      if (!advanceStage("year")) setOpen(false)
      return
    }

    if (currentStage === "month" && value.startsWith("month-")) {
      const monthIndex = Number(value.replace("month-", ""))
      if (Number.isNaN(monthIndex)) return
      if (mode === "week") {
        setPendingMonth(monthIndex)
      } else {
        onSelectDate(new Date(effectiveYear, monthIndex, 1))
      }
      if (!advanceStage("month")) setOpen(false)
      return
    }

    if (currentStage === "week" && value.startsWith("week-")) {
      const selected = weekOptions.find((opt) => opt.value === value)
      if (selected) onSelectDate(selected.start)
      setOpen(false)
    }
  }

  const renderMobileColumn = () => {
    const columns: Record<PickerStage, PickerOption[]> = {
      year: years,
      month: monthOptions,
      week: weekOptions,
    }
    const titles: Record<PickerStage, string> = {
      year: "Year",
      month: "Month",
      week: "Week",
    }
    const currentValue: Record<PickerStage, string> = {
      year: `year-${effectiveYear}`,
      month: `month-${effectiveMonth}`,
      week: currentValues.week,
    }

    const options = columns[stage].filter(Boolean)

    return (
      <div className="w-[min(420px,90vw)] p-2 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">{titles[stage]}</div>
          <div className="text-xs text-muted-foreground">
            Step {stageOrder.indexOf(stage) + 1} of {stageOrder.length}
          </div>
        </div>
        <div className="space-y-1 max-h-[60vh] overflow-auto pr-1">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleMobileSelect(stage, option.value)}
              className={`w-full text-left rounded-md px-3 py-2 transition-colors border border-transparent hover:border-border hover:bg-muted/60 ${currentValue[stage] === option.value ? "bg-primary/10 border-primary/30" : ""}`}
            >
              <div className="flex flex-col items-start gap-0.5">
                <span className="font-semibold">{option.label}</span>
                {option.rangeLabel && (
                  <span className="text-xs text-muted-foreground">{option.rangeLabel}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <ContentPopover
      open={open}
      onOpenChange={setOpen}
      align="center"
      content={
        isMobile ? (
          renderMobileColumn()
        ) : (
          <div
            className={`grid gap-3 p-2 ${showWeeks ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2"}`}
          >
            <PickerColumn
              title={showWeeks ? "Year" : "Year"}
              options={years}
              currentValue={currentValues.year}
              onSelect={(v) => handleSelect(v)}
            />

            {showWeeks && (
              <PickerColumn
                title="Week"
                options={weekOptions}
                currentValue={currentValues.week}
                onSelect={(v) => handleSelect(v)}
              />
            )}

            {!showWeeks && (
              <PickerColumn
                title="Month"
                options={monthOptions}
                currentValue={currentValues.month}
                onSelect={(v) => handleSelect(v)}
              />
            )}
          </div>
        )
      }
      className={`max-h-[70vh] ${isMobile ? "w-[min(440px,95vw)]" : "w-[680px]"}`}
      mobileAsDrawer
      drawerTitle="Select date"
      drawerDirection="bottom"
    >
      <Button
        variant="outline"
        className="h-10 px-4 rounded-full border border-input/60 bg-muted/40 font-semibold"
      >
        {showWeeks ? (
          <span className="flex items-center gap-2">
            <span>Week {currentWeekNumber}</span>
            <span className="hidden sm:inline text-xs text-muted-foreground">
              {`${format(weekRangeStart, "MMM d, yyyy")} - ${format(weekRangeEnd, "MMM d, yyyy")}`}
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span>{format(currentDate, "MMMM yyyy")}</span>
          </span>
        )}
      </Button>
    </ContentPopover>
  )
}

type PickerColumnProps = {
  title: string
  options: PickerOption[]
  currentValue: string
  onSelect: (value: string) => void
}

function PickerColumn({ title, options, currentValue, onSelect }: PickerColumnProps) {
  return (
    <div>
      <div className="px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="space-y-1 max-h-[60vh] overflow-auto pr-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`w-full text-left rounded-md px-3 py-2 transition-colors border border-transparent hover:border-border hover:bg-muted/60 ${currentValue === option.value ? "bg-primary/10 border-primary/30" : ""}`}
          >
            <div className="flex flex-col items-start gap-0.5">
              <span className="font-semibold">{option.label}</span>
              {option.rangeLabel && (
                <span className="text-xs text-muted-foreground">{option.rangeLabel}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
