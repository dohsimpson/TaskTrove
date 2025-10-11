"use client"

import React, { useState, useEffect } from "react"
import { useAtomValue } from "jotai"
import { useDebounce } from "@uidotdev/usehooks"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { settingsAtom } from "@tasktrove/atoms"
import { cn } from "@/lib/utils"

interface ContentPopoverProps {
  children: React.ReactNode
  content: React.ReactNode
  className?: string
  triggerClassName?: string
  align?: "start" | "center" | "end"
  side?: "top" | "right" | "bottom" | "left"
  onOpenChange?: (open: boolean) => void
  open?: boolean
  triggerMode?: "click" | "hover"
  debounceDelay?: number
  onOpenAutoFocus?: (event: Event) => void
  disableOutsideInteraction?: boolean
  asChild?: boolean
  // Collision detection and viewport constraints
  avoidCollisions?: boolean
  collisionPadding?: number | { top?: number; right?: number; bottom?: number; left?: number }
  collisionBoundary?: Element | null | Array<Element | null>
  sideOffset?: number
  alignOffset?: number
  sticky?: "partial" | "always"
  hideWhenDetached?: boolean
}

export function ContentPopover({
  children,
  content,
  className,
  triggerClassName,
  align = "start",
  side = "bottom",
  onOpenChange,
  open,
  triggerMode,
  debounceDelay = 200,
  onOpenAutoFocus = (event) => event.preventDefault(),
  disableOutsideInteraction = false,
  asChild = false,
  // Collision detection defaults
  avoidCollisions = true,
  collisionPadding = 8,
  collisionBoundary,
  sideOffset = 4,
  alignOffset = 0,
  sticky = "partial",
  hideWhenDetached = false,
}: ContentPopoverProps) {
  const [internalHoverState, setInternalHoverState] = useState(false)
  const [hasFocusedElement, setHasFocusedElement] = useState(false)
  const settings = useAtomValue(settingsAtom)

  // Enhanced className with viewport constraints
  const enhancedClassName = cn(
    // Viewport constraints using Radix CSS custom properties
    "max-h-[var(--radix-popover-content-available-height)] max-w-[var(--radix-popover-content-available-width)] overflow-auto w-80 p-0",
    className,
  )

  // Determine effective trigger mode: use prop if provided, otherwise use setting
  const effectiveTriggerMode =
    triggerMode ?? (settings.general.popoverHoverOpen ? "hover" : "click")

  // For hover mode, use debounced state; for click mode, use external/internal open state
  const debouncedHoverState = useDebounce(internalHoverState, debounceDelay)

  // Sync debounced hover state to external state when both external state and hover mode are used
  useEffect(() => {
    if (open !== undefined && effectiveTriggerMode === "hover") {
      onOpenChange?.(debouncedHoverState)
    }
  }, [debouncedHoverState, open, effectiveTriggerMode, onOpenChange])

  // Determine the actual open state
  const isOpen =
    open !== undefined
      ? open
      : effectiveTriggerMode === "hover"
        ? debouncedHoverState
        : internalHoverState

  // Reset focus state when popover closes
  useEffect(() => {
    if (!isOpen) {
      setHasFocusedElement(false)
    }
  }, [isOpen])

  const handleOpenChange = (newOpen: boolean) => {
    if (open !== undefined && effectiveTriggerMode === "click") {
      onOpenChange?.(newOpen)
    } else if (open === undefined && effectiveTriggerMode === "click") {
      setInternalHoverState(newOpen)
    }
    // For hover mode with external state: state is synced via useEffect
    // For hover mode with internal state: state is controlled by debounced hover state
  }

  // Click mode (default behavior)
  if (effectiveTriggerMode === "click") {
    return (
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild className={triggerClassName}>
          {children}
        </PopoverTrigger>
        <PopoverContent
          className={enhancedClassName}
          align={align}
          side={side}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          avoidCollisions={avoidCollisions}
          collisionPadding={collisionPadding}
          collisionBoundary={collisionBoundary}
          sticky={sticky}
          hideWhenDetached={hideWhenDetached}
          onOpenAutoFocus={onOpenAutoFocus}
          onInteractOutside={disableOutsideInteraction ? (e) => e.preventDefault() : undefined}
          asChild={asChild}
        >
          {content}
        </PopoverContent>
      </Popover>
    )
  }

  // Hover mode behavior with debounced state
  const handleMouseEnter = () => {
    setInternalHoverState(true)
  }

  const handleMouseLeave = () => {
    setInternalHoverState(false)
  }

  const handleContentMouseEnter = () => {
    setInternalHoverState(true)
  }

  const handleContentMouseLeave = () => {
    // Don't close if an element inside the popover has focus (e.g., open select dropdown)
    if (!hasFocusedElement) {
      setInternalHoverState(false)
    }
  }

  const handleContentFocusIn = () => {
    setHasFocusedElement(true)
  }

  const handleContentFocusOut = (e: React.FocusEvent) => {
    // Only mark as unfocused if focus is moving outside the popover content
    const relatedTarget = e.relatedTarget
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setHasFocusedElement(false)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div
          className={triggerClassName}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className={enhancedClassName}
        align={align}
        side={side}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        avoidCollisions={avoidCollisions}
        collisionPadding={collisionPadding}
        collisionBoundary={collisionBoundary}
        sticky={sticky}
        hideWhenDetached={hideWhenDetached}
        onMouseEnter={handleContentMouseEnter}
        onMouseLeave={handleContentMouseLeave}
        onFocusCapture={handleContentFocusIn}
        onBlurCapture={handleContentFocusOut}
        onOpenAutoFocus={onOpenAutoFocus}
        onInteractOutside={disableOutsideInteraction ? (e) => e.preventDefault() : undefined}
        asChild={asChild}
      >
        {content}
      </PopoverContent>
    </Popover>
  )
}
