"use client"

import React, { useState, useRef } from "react"
import { EditableDiv } from "./editable-div"
import { getCaretFromPoint } from "@tasktrove/dom-utils"

interface ClickToEditProps {
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
  /**
   * Render function for the view mode (when not editing)
   * Receives onClick handler to trigger edit mode
   */
  renderView: (onClick: (event: React.MouseEvent<HTMLElement>) => void) => React.ReactNode
  [key: string]: unknown
}

/**
 * Generic wrapper component that manages click-to-edit behavior
 * - View mode: renders custom component via renderView
 * - Edit mode: renders EditableDiv with cursor position preservation
 */
export function ClickToEdit({
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
  renderView,
  ...props
}: ClickToEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const clickPositionRef = useRef<"start" | "end" | number>(cursorPosition)

  const handleEditingChange = (editing: boolean) => {
    setIsEditing(editing)
    onEditingChange?.(editing)
  }

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    const caret = getCaretFromPoint(event.clientX, event.clientY)
    if (caret?.node.nodeType === Node.TEXT_NODE) {
      clickPositionRef.current = caret.offset
    } else {
      clickPositionRef.current = cursorPosition
    }

    setIsEditing(true)
    onEditingChange?.(true)
  }

  if (isEditing) {
    // Filter out ClickToEdit-specific props
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
            "renderView",
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

  return <>{renderView(handleClick)}</>
}
