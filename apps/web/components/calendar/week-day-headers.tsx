"use client"

import { format, isSameDay, isToday } from "date-fns"

interface WeekDayHeadersProps {
  weekDays: Date[]
  selectedDate?: Date
  onDateClick: (date: Date) => void
}

export function WeekDayHeaders({ weekDays, selectedDate, onDateClick }: WeekDayHeadersProps) {
  return (
    <div className="border-b border-border">
      <div className="flex">
        {/* Time column header */}
        <div className="w-12 border-border"></div>

        {/* Day headers container */}
        <div className="flex-1 grid grid-cols-7 gap-0.5 lg:gap-1">
          {weekDays.map((day) => {
            const isTodayDate = isToday(day)
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false

            return (
              <div
                key={day.toISOString()}
                className={`
                  p-1.5 lg:p-2 text-center flex flex-col items-center justify-center space-y-0.5 cursor-pointer hover:bg-muted/50 transition-colors
                  ${isSelected ? "ring-2 ring-foreground" : ""}
                  ${isTodayDate ? "bg-primary/10 border-primary/20" : ""}
                `}
                onClick={() => onDateClick(day)}
              >
                {/* Month and Day on same row */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="text-xs">{format(day, "MMM")}</span>
                  <span className="text-sm font-semibold text-primary">{format(day, "d")}</span>
                </div>

                {/* Weekday on its own row */}
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {format(day, "EEE")}
                </div>

                {isTodayDate && (
                  <div className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-sm inline-block">
                    Today
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
