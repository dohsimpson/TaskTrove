"use client"

import React from "react"
import { ClickToEdit } from "./click-to-edit"
import { cn } from "@/lib/utils"

interface ClickToEditDivProps {
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "div" | "span"
  value: string
  onChange: (newValue: string) => void
  onCancel?: () => void
  placeholder?: string
  className?: string
  multiline?: boolean
  allowEmpty?: boolean
  autoFocus?: boolean
  onEditingChange?: (isEditing: boolean) => void
  cursorPosition?: "start" | "end"
  [key: string]: unknown
}

/**
 * Simple click-to-edit component that shows plain text until clicked
 * Once clicked, switches to EditableDiv with cursor position preserved
 */
export function ClickToEditDiv({
  as: Component = "div",
  value,
  placeholder = "",
  className,
  ...props
}: ClickToEditDivProps) {
  return (
    <ClickToEdit
      as={Component}
      value={value}
      placeholder={placeholder}
      className={className}
      {...props}
      renderView={(onClick) => {
        const TextComponent = Component
        return (
          <TextComponent
            className={cn(
              "cursor-text hover:bg-accent px-1 py-0.5 rounded transition-colors",
              className,
            )}
            onClick={onClick}
            data-action="edit"
          >
            {value || placeholder}
          </TextComponent>
        )
      }}
    />
  )
}
