"use client"

import { format, isSameDay, isToday } from "date-fns"

interface WeekDayHeadersProps {
  weekDays: Date[]
  selectedDate?: Date
  onDateClick: (date: Date) => void
}

export function WeekDayHeaders({ weekDays, selectedDate, onDateClick }: WeekDayHeadersProps) {
  return (
    <div className="border-b border-border mt-1">
      <div className="flex">
        {/* Day headers container - align with time grid using left margin */}
        <div className="flex-1 ml-10 sm:ml-12">
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {weekDays.map((day) => {
              const isTodayDate = isToday(day)
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false

              return (
                <div
                  key={day.toISOString()}
                  className={`
                  p-1 sm:p-1.5 text-center flex flex-col items-center justify-center space-y-0.5 cursor-pointer hover:bg-muted/50 transition-colors
                  ${isSelected ? "ring-2 ring-foreground" : ""}
                  ${isTodayDate ? "bg-primary/10 border-primary/20" : ""}
                `}
                  onClick={() => onDateClick(day)}
                >
                  {/* Day number; today uses filled circle like month view */}
                  <div className="flex items-center justify-center">
                    {isTodayDate ? (
                      <span
                        className="inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-xs sm:text-sm"
                        aria-label="Today"
                      >
                        {format(day, "d")}
                      </span>
                    ) : (
                      <span className="text-xs sm:text-sm font-semibold text-primary">
                        {format(day, "d")}
                      </span>
                    )}
                  </div>

                  {/* Weekday on its own row */}
                  <div className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-[0.06em] sm:tracking-wider">
                    {format(day, "EEE")}
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
