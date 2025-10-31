"use client"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"

interface CalendarNavigationProps {
  currentDate: Date
  viewMode: "month" | "week"
  onViewModeChange: (mode: "month" | "week") => void
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
  onNavigatePrevious: () => void
  onNavigateNext: () => void
  onNavigateToday: () => void
}

export function CalendarNavigation({
  currentDate,
  viewMode,
  onViewModeChange,
  onMonthChange,
  onYearChange,
  onNavigatePrevious,
  onNavigateNext,
  onNavigateToday,
}: CalendarNavigationProps) {
  // Generate month options
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(2000, i, 1), "MMMM"),
  }))

  // Generate year options (current year ± 10)
  const currentYear = currentDate.getFullYear()
  const years = Array.from({ length: 21 }, (_, i) => {
    const year = currentYear - 10 + i
    return {
      value: year.toString(),
      label: year.toString(),
    }
  })

  return (
    <div className="flex items-center justify-between px-3 pt-4 pb-3">
      {/* Calendar View Toggle */}
      <div className="flex items-center gap-1">
        <Button
          variant={viewMode === "month" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewModeChange("month")}
        >
          Month
        </Button>
        <Button
          variant={viewMode === "week" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewModeChange("week")}
        >
          Week
        </Button>
      </div>

      {/* Month/Year Selectors and Navigation Controls */}
      <div className="flex items-center gap-1 lg:gap-2">
        {/* Current Month/Year with Dropdowns */}
        <Select
          value={currentDate.getMonth().toString()}
          onValueChange={(value) => onMonthChange(parseInt(value))}
        >
          <SelectTrigger className="w-auto h-auto border border-input bg-background px-3 py-2 text-lg lg:text-xl font-semibold hover:bg-accent/50 focus:ring-2 focus:ring-ring rounded-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentDate.getFullYear().toString()}
          onValueChange={(value) => onYearChange(parseInt(value))}
        >
          <SelectTrigger className="w-auto h-auto border border-input bg-background px-3 py-2 text-lg lg:text-xl font-semibold hover:bg-accent/50 focus:ring-2 focus:ring-ring rounded-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year.value} value={year.value}>
                {year.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Navigation Controls */}
        <div className="flex items-center gap-1 lg:gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 lg:w-10"
            onClick={onNavigatePrevious}
          >
            <ChevronLeft className="h-3 w-3 lg:h-4 lg:w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs lg:text-sm"
            onClick={onNavigateToday}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 lg:w-10"
            onClick={onNavigateNext}
          >
            <ChevronRight className="h-3 w-3 lg:h-4 lg:w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
