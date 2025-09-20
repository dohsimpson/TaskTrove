"use client"

import React, { useState, useRef, useEffect } from "react"
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
  triggerMode?: "click" | "hover" // New prop for trigger behavior
  openDelay?: number // Hover open delay
  closeDelay?: number // Hover close delay
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
  triggerMode = "hover",
  openDelay = 250,
  closeDelay = 100,
}: ContentPopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Use external open state if provided, otherwise internal state
  const isOpen = open !== undefined ? open : internalOpen

  const handleOpenChange = (newOpen: boolean) => {
    if (open !== undefined) {
      onOpenChange?.(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
  }

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [])

  // Click mode (default behavior)
  if (triggerMode === "click") {
    return (
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild className={triggerClassName}>
          {children}
        </PopoverTrigger>
        <PopoverContent className={className} align={align} side={side}>
          {content}
        </PopoverContent>
      </Popover>
    )
  }

  // Hover mode behavior
  const handleMouseEnter = () => {
    // Clear any existing timeouts
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
    }

    // Set timeout to open after specified delay
    hoverTimeoutRef.current = setTimeout(() => {
      handleOpenChange(true)
    }, openDelay)
  }

  const handleMouseLeave = () => {
    // Clear the timeout if mouse leaves before delay completes
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    // Set a delay before closing to allow mouse to enter popover content
    closeTimeoutRef.current = setTimeout(() => {
      handleOpenChange(false)
    }, closeDelay)
  }

  const handleContentMouseEnter = () => {
    // Clear both timeouts when entering popover content
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
    }
  }

  const handleContentMouseLeave = () => {
    // Close when leaving popover content
    handleOpenChange(false)
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
        className={className}
        align={align}
        side={side}
        onMouseEnter={handleContentMouseEnter}
        onMouseLeave={handleContentMouseLeave}
      >
        {content}
      </PopoverContent>
    </Popover>
  )
}
