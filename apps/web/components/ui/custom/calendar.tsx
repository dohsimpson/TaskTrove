"use client"

import * as React from "react"
import { Calendar as BaseCalendar } from "@/components/ui/calendar"
import type { ComponentProps } from "react"
import type { DateRange, Matcher } from "react-day-picker"

// Wrapper around the shadcn calendar so we don't modify the upstream component.
// It auto-centers the displayed month on the selected date when no explicit
// defaultMonth/month is provided (fixes editing tasks with existing due dates).
type CalendarProps = ComponentProps<typeof BaseCalendar>

export function Calendar(props: CalendarProps) {
  const selected = "selected" in props ? props.selected : undefined
  const { defaultMonth, month } = props
  const derivedDefaultMonth = defaultMonth ?? (month ? undefined : getFirstSelectedMonth(selected))

  return <BaseCalendar {...props} defaultMonth={derivedDefaultMonth} />
}

function getFirstSelectedMonth(selected?: Matcher | Matcher[]): Date | undefined {
  if (!selected) return undefined

  const matchers = Array.isArray(selected) ? selected : [selected]

  for (const matcher of matchers) {
    if (matcher instanceof Date) {
      return matcher
    }

    if (isDateRangeMatcher(matcher)) {
      return matcher.from ?? matcher.to ?? undefined
    }
  }

  return undefined
}

function isDateRangeMatcher(matcher: Matcher): matcher is DateRange {
  return Boolean(
    matcher && typeof matcher === "object" && "from" in matcher && matcher.from instanceof Date,
  )
}

export type { CalendarProps }
