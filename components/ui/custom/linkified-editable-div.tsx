"use client"

import React, { useState } from "react"
import { EditableDiv } from "./editable-div"
import { LinkifiedText } from "./linkified-text"
import { cn } from "@/lib/utils"

interface LinkifiedEditableDivProps {
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
  [key: string]: unknown // Allow other props to be passed through
}

export function LinkifiedEditableDiv({
  as: Component = "div",
  value,
  onChange,
  onCancel,
  placeholder = "",
  className,
  multiline = false,
  allowEmpty = false,
  onEditingChange,
  cursorPosition = "start",
  ...props
}: LinkifiedEditableDivProps) {
  const [isEditing, setIsEditing] = useState(false)

  const handleEditingChange = (editing: boolean) => {
    setIsEditing(editing)
    onEditingChange?.(editing)
  }

  const handleClick = () => {
    setIsEditing(true)
    onEditingChange?.(true)
  }

  if (isEditing) {
    return (
      <EditableDiv
        as={Component}
        value={value}
        onChange={onChange}
        onCancel={onCancel}
        placeholder={placeholder}
        className={className}
        multiline={multiline}
        allowEmpty={allowEmpty}
        autoFocus={true}
        onEditingChange={handleEditingChange}
        cursorPosition={cursorPosition}
        {...props}
      />
    )
  }

  // When not editing, display linkified text
  // Filter out EditableDiv-specific props that shouldn't be passed to LinkifiedText
  const linkifiedProps = Object.fromEntries(
    Object.entries(props).filter(
      ([key]) =>
        ![
          "multiline",
          "allowEmpty",
          "onEditingChange",
          "cursorPosition",
          "onCancel",
          "autoFocus",
        ].includes(key),
    ),
  )

  return (
    <LinkifiedText
      as={Component}
      className={cn("cursor-text hover:bg-accent px-1 py-0.5 rounded transition-colors", className)}
      onClick={handleClick}
      {...linkifiedProps}
    >
      {value || placeholder}
    </LinkifiedText>
  )
}
