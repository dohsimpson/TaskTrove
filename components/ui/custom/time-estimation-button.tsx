"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { TimeEstimationPicker } from "./time-estimation-picker"
import { ClockFading } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimeEstimationButtonProps {
  value?: number // Time in seconds
  onChange: (seconds: number) => void
  className?: string
  size?: "sm" | "default" | "lg"
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary"
  disabled?: boolean
}

export function TimeEstimationButton({
  value = 0,
  onChange,
  className,
  variant = "ghost",
  disabled = false,
}: TimeEstimationButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const formatTime = (seconds: number): string => {
    if (seconds === 0) return ""

    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)

    if (h === 0) {
      return `${m}m`
    } else if (m === 0) {
      return `${h}h`
    } else {
      return `${h}h ${m}m`
    }
  }

  const timeText = formatTime(value)
  const hasTime = value > 0

  return (
    <TimeEstimationPicker
      value={value}
      onChange={onChange}
      open={isOpen}
      setOpen={setIsOpen}
      trigger={
        <Button
          variant={variant}
          size="sm"
          disabled={disabled}
          className={cn(
            "h-6 w-auto px-1.5 hover:no-underline flex items-center justify-center",
            hasTime ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            className,
          )}
        >
          {!hasTime && <ClockFading className="h-3 w-3" />}
          {hasTime && <span className="text-xs font-medium leading-none">{timeText}</span>}
        </Button>
      }
    />
  )
}
