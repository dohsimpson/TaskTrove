"use client"

import { cn } from "@/lib/utils"

interface CalendarAddButtonProps {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  title: string
  placement?: "top-right" | "bottom-right"
  className?: string
}

export function CalendarAddButton({
  onClick,
  title,
  placement = "bottom-right",
  className,
}: CalendarAddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        "absolute w-6 h-6 rounded-full bg-primary/80 hover:bg-primary text-white text-lg leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-opacity duration-200 shadow-sm hover:shadow-md z-10",
        placement === "top-right" ? "top-1 right-1" : "bottom-1 right-1",
        className,
      )}
    >
      <span className="-translate-y-px select-none">+</span>
    </button>
  )
}
