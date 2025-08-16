"use client"

import { COLOR_OPTIONS } from "@/lib/constants/defaults"

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
}: ColorPickerProps) {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-7 h-7",
  }

  const buttonSize = sizeClasses[size]

  return (
    <div className={className}>
      {label && <div className="text-sm font-medium text-foreground mb-2">{label}</div>}
      <div className="flex gap-2 flex-wrap">
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
      </div>
    </div>
  )
}
