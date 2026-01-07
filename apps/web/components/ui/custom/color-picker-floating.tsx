"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { ColorPicker } from "./color-picker"
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
 * This is a wrapper around the base ColorPicker component that adds floating/portal behavior.
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
      if (!target || !(target instanceof Node)) return

      // Don't close if clicking inside the floating picker
      if (floatingRef.current?.contains(target)) return

      // Don't close if clicking inside a popover (custom color picker)
      if (target instanceof Element) {
        const isInsidePopover = target.closest('[role="dialog"]')
        if (isInsidePopover) return
      }

      // Close if clicking truly outside
      onClose()
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
        // Min width keeps the 6-column grid from squeezing when opened from narrow context menus
        "z-50 bg-popover text-popover-foreground rounded-md border p-3 shadow-md min-w-[208px]",
        "animate-in fade-in-0 zoom-in-95",
        className,
      )}
      style={{ position: "fixed" }}
    >
      <ColorPicker
        selectedColor={selectedColor}
        onColorSelect={handleColorSelect}
        size="sm"
        label="Select Color"
        layout="grid"
      />
    </div>,
    document.body,
  )
}
