"use client"

import { useState, useCallback } from "react"
import { addDays, addMonths, startOfMonth, format } from "date-fns"

export interface CalendarNavigationHookResult {
  currentDate: Date
  selectedDate: Date | undefined
  setCurrentDate: (date: Date) => void
  setSelectedDate: (date: Date | undefined) => void
  navigatePrevious: () => void
  navigateNext: () => void
  navigateToday: () => void
  navigateToMonth: (month: number) => void
  navigateToYear: (year: number) => void
}

export function useCalendarNavigation(initialDate?: Date): CalendarNavigationHookResult {
  const [currentDate, setCurrentDate] = useState(initialDate || new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate || new Date())

  const navigatePrevious = useCallback(() => {
    setCurrentDate((prev) => addDays(prev, -7))
  }, [])

  const navigateNext = useCallback(() => {
    setCurrentDate((prev) => addDays(prev, 7))
  }, [])

  const navigateToday = useCallback(() => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }, [])

  const navigateToMonth = useCallback((month: number) => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), month, 1))
  }, [])

  const navigateToYear = useCallback((year: number) => {
    setCurrentDate((prev) => new Date(year, prev.getMonth(), 1))
  }, [])

  return {
    currentDate,
    selectedDate,
    setCurrentDate,
    setSelectedDate,
    navigatePrevious,
    navigateNext,
    navigateToday,
    navigateToMonth,
    navigateToYear,
  }
}
