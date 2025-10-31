"use client"

import { cn } from "@/lib/utils"

interface CalendarAddButtonProps {
  onClick: () => void
  title: string
  variant?: "time-slot" | "all-day"
  className?: string
}

export function CalendarAddButton({
  onClick,
  title,
  variant = "time-slot",
  className,
}: CalendarAddButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "absolute w-6 h-6 rounded-full bg-primary/80 hover:bg-primary text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm hover:shadow-md z-10",
        variant === "all-day" ? "top-1 right-1" : "bottom-1 right-1",
        className,
      )}
    >
      +
    </button>
  )
}
