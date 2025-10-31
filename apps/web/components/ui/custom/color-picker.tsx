"use client"

import { useState, useEffect } from "react"
import { Palette } from "lucide-react"
import { COLOR_OPTIONS, DEFAULT_PROJECT_COLORS } from "@tasktrove/constants"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CustomColorPicker } from "@/components/ui/custom/custom-color-picker"
import { isPro } from "@/lib/utils/env"

interface ColorPickerProps {
  /** The currently selected color */
  selectedColor: string
  /** Callback when a color is selected */
  onColorSelect: (color: string) => void
  /** Optional size variant */
  size?: "sm" | "md" | "lg"
  /** Optional label for the color picker */
  label?: string
  /** Optional className for the container */
  className?: string
  /** Layout variant: "single-row" for flex wrap, "grid" for 2-row 6-column grid */
  layout?: "single-row" | "grid"
}

/**
 * Inline color picker component that displays a grid of color options.
 * Used in forms and dialogs where an inline color selection is needed.
 */
export function ColorPicker({
  selectedColor,
  onColorSelect,
  size = "md",
  label,
  className,
  layout = "single-row",
}: ColorPickerProps) {
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false)
  const [customColor, setCustomColor] = useState(selectedColor || DEFAULT_PROJECT_COLORS[0])

  // Update customColor when popover opens to ensure it's in sync
  useEffect(() => {
    if (customPopoverOpen) {
      setCustomColor(selectedColor || DEFAULT_PROJECT_COLORS[0])
    }
  }, [customPopoverOpen, selectedColor])

  const sizeClasses = {
    sm: "size-5",
    md: "size-6",
    lg: "w-7 h-7",
  }

  const buttonSize = sizeClasses[size]

  // Check if selected color is a custom color (not in preset options)
  const isCustomColor = !COLOR_OPTIONS.some((opt) => opt.value === selectedColor)

  const handleCustomColorChange = (hex: string) => {
    setCustomColor(hex)
    onColorSelect(hex)
    setCustomPopoverOpen(false)
  }

  const handleCustomColorClear = () => {
    // Reset to the first preset color
    const defaultColor = COLOR_OPTIONS[0].value
    setCustomColor(defaultColor)
    onColorSelect(defaultColor)
    setCustomPopoverOpen(false)
  }

  return (
    <div className={className}>
      {label && <div className="text-sm font-medium text-foreground mb-2">{label}</div>}
      <div className={layout === "grid" ? "grid grid-cols-6 gap-2" : "flex gap-2"}>
        {COLOR_OPTIONS.map((color) => (
          <button
            key={color.value}
            type="button"
            className={`${buttonSize} rounded-full border-2 transition-all hover:scale-110 ${
              selectedColor === color.value
                ? "border-foreground ring-2 ring-offset-2 ring-foreground/20"
                : "border-border hover:border-foreground/50"
            }`}
            style={{ backgroundColor: color.value }}
            onClick={() => onColorSelect(color.value)}
            title={color.name}
          />
        ))}

        {/* Custom color picker button */}
        {isPro() && (
          <Popover open={customPopoverOpen} onOpenChange={setCustomPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`${buttonSize} rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center ${
                  isCustomColor
                    ? "border-foreground ring-2 ring-offset-2 ring-foreground/20"
                    : "border-border hover:border-foreground/50"
                }`}
                style={{
                  backgroundColor: isCustomColor ? selectedColor : "transparent",
                }}
                title="Custom Color"
              >
                {!isCustomColor && <Palette className="size-3" />}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <CustomColorPicker
                value={customColor}
                onChange={handleCustomColorChange}
                onClear={handleCustomColorClear}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  )
}
