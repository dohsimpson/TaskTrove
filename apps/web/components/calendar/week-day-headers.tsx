"use client"

import { isSameDay, isToday } from "date-fns"
import { cn } from "@/lib/utils"
import { formatDayOfMonthLabel, formatWeekdayLabel } from "@/lib/utils/task-date-formatter"

interface WeekDayHeadersProps {
  weekDays: Date[]
  selectedDate?: Date
  onDateSelect: (date: Date) => void
  onDateClick: (date: Date) => void
  showSelectedBorder?: boolean
}

export function WeekDayHeaders({
  weekDays,
  selectedDate,
  onDateSelect,
  onDateClick,
  showSelectedBorder = true,
}: WeekDayHeadersProps) {
  const columnCount = Math.max(weekDays.length, 1)
  const gridColumnClass = columnCount === 7 ? "grid-cols-7" : columnCount === 1 ? "grid-cols-1" : ""
  const leftPaddingClass = columnCount === 7 && "ml-10 sm:ml-12"

  return (
    <div className="border-b border-border" data-testid="week-day-headers">
      <div className="flex">
        {/* Day headers container - align with time grid using left margin */}
        <div className={`flex-1 ${leftPaddingClass}`}>
          <div
            className={`grid gap-0.5 sm:gap-1 ${gridColumnClass}`}
            style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0,1fr))` }}
          >
            {weekDays.map((day) => {
              const isTodayDate = isToday(day)
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "group text-center flex flex-col items-center justify-center space-y-0.5 transition-colors cursor-pointer hover:bg-muted/50",
                    isSelected && showSelectedBorder && "border-2 border-primary",
                  )}
                  onClick={() => onDateSelect(day)}
                >
                  {/* Day number; today uses filled circle like month view */}
                  <div className="flex items-center justify-center">
                    {isTodayDate ? (
                      <button
                        type="button"
                        className="inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-xs sm:text-sm"
                        aria-label="Today"
                        onClick={(event) => {
                          event.stopPropagation()
                          onDateClick(day)
                        }}
                      >
                        {formatDayOfMonthLabel(day)}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-xs sm:text-sm font-semibold text-primary hover:underline"
                        onClick={(event) => {
                          event.stopPropagation()
                          onDateClick(day)
                        }}
                      >
                        {formatDayOfMonthLabel(day)}
                      </button>
                    )}
                  </div>

                  {/* Weekday on its own row */}
                  <div className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-[0.06em] sm:tracking-wider">
                    {formatWeekdayLabel(day, { short: true })}
                  </div>

                  {/* No extra badge for today; filled circle above is sufficient */}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
