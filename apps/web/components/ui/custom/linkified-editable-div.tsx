"use client"

import React, { useState, useRef } from "react"
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
  const clickPositionRef = useRef<"start" | "end" | number>(cursorPosition)

  const handleEditingChange = (editing: boolean) => {
    setIsEditing(editing)
    onEditingChange?.(editing)
  }

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    // Capture click position using browser API
    const range = document.caretRangeFromPoint(event.clientX, event.clientY)
    if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
      clickPositionRef.current = range.startOffset
    } else {
      clickPositionRef.current = cursorPosition
    }

    setIsEditing(true)
    onEditingChange?.(true)
  }

  if (isEditing) {
    // Filter out EditableDiv-specific props that shouldn't be spread
    const editableProps = Object.fromEntries(
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
        cursorPosition={clickPositionRef.current}
        {...editableProps}
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
      className={cn("cursor-text hover:bg-accent px-1 py-0.5 transition-colors", className)}
      onClick={handleClick}
      {...linkifiedProps}
    >
      {value || placeholder}
    </LinkifiedText>
  )
}
