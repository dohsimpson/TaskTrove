"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface HoverPopoverProps {
  children: React.ReactNode
  content: React.ReactNode
  openDelay?: number
  closeDelay?: number
  contentProps?: React.ComponentProps<typeof PopoverContent>
  disabled?: boolean
  onOpenChange?: (open: boolean) => void
}

export function HoverPopover({
  children,
  content,
  openDelay = 250,
  closeDelay = 100,
  contentProps = {},
  disabled = false,
  onOpenChange,
}: HoverPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    onOpenChange?.(open)
  }

  const handleMouseEnter = () => {
    if (disabled) return

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
    if (disabled) return

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
    if (disabled) return

    // Clear both timeouts when entering popover content
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
    }
  }

  const handleContentMouseLeave = () => {
    if (disabled) return

    // Close when leaving popover content
    handleOpenChange(false)
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

  // If disabled, render a regular popover without hover behavior
  if (disabled) {
    return (
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent {...contentProps}>{content}</PopoverContent>
      </Popover>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent
        {...contentProps}
        onMouseEnter={handleContentMouseEnter}
        onMouseLeave={handleContentMouseLeave}
      >
        {content}
      </PopoverContent>
    </Popover>
  )
}
