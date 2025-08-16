"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { COLOR_OPTIONS } from "@/lib/constants/defaults"
import { cn } from "@/lib/utils"

interface ColorPickerFloatingProps {
  /** The currently selected color */
  selectedColor: string
  /** Callback when a color is selected */
  onColorSelect: (color: string) => void
  /** Whether the color picker is open */
  open: boolean
  /** Callback when the color picker should close */
  onClose: () => void
  /** Reference element for positioning */
  anchorRef?: React.RefObject<HTMLElement | null>
  /** Optional className for the container */
  className?: string
}

/**
 * A floating color picker component that can be opened programmatically.
 * Renders in a portal and positions itself relative to an anchor element.
 * Used when color picker needs to be triggered from context menus or other programmatic actions.
 */
export function ColorPickerFloating({
  selectedColor,
  onColorSelect,
  open,
  onClose,
  anchorRef,
  className,
}: ColorPickerFloatingProps) {
  const floatingRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !anchorRef?.current || !floatingRef.current) return

    // Position the floating element relative to the anchor
    const anchor = anchorRef.current
    const floating = floatingRef.current
    const anchorRect = anchor.getBoundingClientRect()

    // Position to the right of the anchor with some offset
    floating.style.position = "fixed"
    floating.style.top = `${anchorRect.top}px`
    floating.style.left = `${anchorRect.right + 8}px`

    // Adjust if it goes off screen
    const floatingRect = floating.getBoundingClientRect()
    if (floatingRect.right > window.innerWidth) {
      floating.style.left = `${anchorRect.left - floatingRect.width - 8}px`
    }
    if (floatingRect.bottom > window.innerHeight) {
      floating.style.top = `${window.innerHeight - floatingRect.height - 8}px`
    }
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return

    // Close on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    // Close on click outside
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target
      if (
        floatingRef.current &&
        target &&
        target instanceof Node &&
        !floatingRef.current.contains(target)
      ) {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    document.addEventListener("mousedown", handleClickOutside)

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open, onClose])

  const handleColorSelect = (color: string) => {
    onColorSelect(color)
    onClose()
  }

  if (!open) return null

  return createPortal(
    <div
      ref={floatingRef}
      className={cn(
        "z-50 bg-popover text-popover-foreground rounded-md border p-3 shadow-md",
        "animate-in fade-in-0 zoom-in-95",
        className,
      )}
      style={{ position: "fixed" }}
    >
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
              aria-label={`Select ${color.name} color`}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
