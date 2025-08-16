"use client"

import React, { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface PopoverOption {
  id: string | number
  label: string
  icon?: ReactNode
  iconColor?: string
  iconStyle?: React.CSSProperties
  onClick: () => void
  className?: string
}

export interface PopoverSection {
  heading?: string
  options: PopoverOption[]
}

interface CustomizablePopoverProps {
  children: ReactNode
  sections: PopoverSection[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
  contentClassName?: string
  align?: "start" | "center" | "end"
  side?: "top" | "right" | "bottom" | "left"
}

export function CustomizablePopover({
  children,
  sections,
  open,
  onOpenChange,
  contentClassName = "w-36 p-1",
  align = "start",
  side = "bottom",
}: CustomizablePopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className={contentClassName} align={align} side={side}>
        {sections.map((section, sectionIndex) => (
          <React.Fragment key={sectionIndex}>
            {/* Add divider before non-first sections */}
            {sectionIndex > 0 && <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />}

            {/* Optional section heading */}
            {section.heading && (
              <div className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                {section.heading}
              </div>
            )}

            {/* Section options */}
            {section.options.map((option) => (
              <Button
                key={option.id}
                variant="ghost"
                size="sm"
                className={cn("w-full justify-start h-8", option.className)}
                onClick={option.onClick}
              >
                {option.icon && (
                  <div className="w-3 h-3 mr-2 flex-shrink-0" style={option.iconStyle}>
                    {option.icon}
                  </div>
                )}
                <span>{option.label}</span>
              </Button>
            ))}
          </React.Fragment>
        ))}
      </PopoverContent>
    </Popover>
  )
}
