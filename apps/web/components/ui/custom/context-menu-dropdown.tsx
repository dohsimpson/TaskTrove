"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Context Menu Dropdown Component
 *
 * A specialized dropdown menu for context menus that disables modal mode
 * to prevent focus conflicts with EditableDiv and ColorPickerPopover components.
 *
 * This component wraps the standard DropdownMenu with modal={false} to ensure
 * that when users click actions like "Edit" or "Change Color", the resulting
 * focused components (input fields, popovers) don't get immediately blurred
 * by Radix's modal behavior.
 */

interface ContextMenuDropdownProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function ContextMenuDropdown({ children, open, onOpenChange }: ContextMenuDropdownProps) {
  return (
    <DropdownMenu modal={false} open={open} onOpenChange={onOpenChange}>
      {children}
    </DropdownMenu>
  )
}

// Re-export the other dropdown components for convenience
export {
  ContextMenuDropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
}
