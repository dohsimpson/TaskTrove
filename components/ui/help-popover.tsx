"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { HelpCircle, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"

interface HelpPopoverProps {
  title?: string
  content: string | React.ReactNode
  className?: string
  iconClassName?: string
  align?: "start" | "center" | "end"
  side?: "top" | "right" | "bottom" | "left"
}

export function HelpPopover({
  title,
  content,
  className,
  iconClassName,
  align = "start",
  side = "bottom",
}: HelpPopoverProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 w-6 p-0 rounded-full text-muted-foreground hover:text-foreground",
            "hover:bg-accent transition-colors cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className,
          )}
          title="Show help"
        >
          <HelpCircle className={cn("h-4 w-4", iconClassName)} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 text-sm" align={align} side={side} sideOffset={8}>
        {/* Header with icon and title */}
        {title && (
          <div className="flex items-center gap-3 p-4 pb-3 border-b">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-accent">
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="font-semibold text-base text-foreground">{title}</div>
          </div>
        )}

        {/* Content area */}
        <div className="p-4">
          <div className="text-muted-foreground leading-relaxed">{content}</div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
