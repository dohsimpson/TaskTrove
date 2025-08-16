"use client"

import React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface ContentPopoverProps {
  children: React.ReactNode // Trigger element
  content: React.ReactNode // Content to show in popover
  className?: string // Content className
  triggerClassName?: string // Trigger className
  align?: "start" | "center" | "end"
  side?: "top" | "right" | "bottom" | "left"
  onOpenChange?: (open: boolean) => void
  open?: boolean
}

export function ContentPopover({
  children,
  content,
  className = "w-80 p-0",
  triggerClassName,
  align = "start",
  side = "bottom",
  onOpenChange,
  open,
}: ContentPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild className={triggerClassName}>
        {children}
      </PopoverTrigger>
      <PopoverContent className={className} align={align} side={side}>
        {content}
      </PopoverContent>
    </Popover>
  )
}
