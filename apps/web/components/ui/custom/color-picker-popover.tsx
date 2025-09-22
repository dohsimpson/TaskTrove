"use client"

import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { COLOR_OPTIONS } from "@tasktrove/constants"

interface ColorPickerPopoverProps {
  /** The currently selected color */
  selectedColor: string
  /** Callback when a color is selected */
  onColorSelect: (color: string) => void
  /** The trigger element */
  children: React.ReactNode
  /** Optional alignment for the popover */
  align?: "start" | "center" | "end"
  /** Optional side for the popover */
  side?: "top" | "right" | "bottom" | "left"
  /** Whether the popover is open (controlled) */
  open?: boolean
  /** Callback when open state changes (controlled) */
  onOpenChange?: (open: boolean) => void
}

/**
 * A reusable color picker popover component that displays a grid of color options.
 * Used for selecting colors for projects, labels, and sections.
 */
export function ColorPickerPopover({
  selectedColor,
  onColorSelect,
  children,
  align = "start",
  side = "bottom",
  open,
  onOpenChange,
}: ColorPickerPopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen

  const handleColorSelect = (color: string) => {
    onColorSelect(color)
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-auto p-3" align={align} side={side}>
        <div className="space-y-2">
          <div className="text-sm font-medium">Select Color</div>
          <div className="grid grid-cols-6 gap-2">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color.value}
                type="button"
                className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                  selectedColor === color.value
                    ? "border-foreground ring-2 ring-offset-2 ring-foreground/20"
                    : "border-border hover:border-foreground/50"
                }`}
                style={{ backgroundColor: color.value }}
                onClick={() => handleColorSelect(color.value)}
                title={color.name}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
