"use client"

import React, { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { createKeyboardHandler } from "@/lib/utils/keyboard"

/**
 * Clean contentEditable text by replacing non-breaking spaces with newlines
 */
function cleanText(text: string): string {
  return text.replace(/\u00A0/g, "\n").trim()
}

/**
 * Set cursor position in contentEditable element
 */
function setCursorPosition(element: HTMLElement, position: "start" | "end" | number): void {
  const selection = window.getSelection()
  const range = document.createRange()

  if (!selection || !element.firstChild) return

  try {
    const textNode = element.firstChild
    const textLength = textNode.textContent?.length || 0

    if (position === "start") {
      range.setStart(textNode, 0)
      range.setEnd(textNode, 0)
    } else if (position === "end") {
      range.setStart(textNode, textLength)
      range.setEnd(textNode, textLength)
    } else {
      const pos = Math.min(Math.max(0, position), textLength)
      range.setStart(textNode, pos)
      range.setEnd(textNode, pos)
    }

    selection.removeAllRanges()
    selection.addRange(range)
  } catch {
    // Cursor positioning failed, element will still be focused
  }
}

type EditableDivElement =
  | HTMLHeadingElement
  | HTMLParagraphElement
  | HTMLDivElement
  | HTMLSpanElement

interface EditableDivProps extends Omit<React.HTMLAttributes<EditableDivElement>, "onChange"> {
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "div" | "span"
  value: string
  onChange: (newValue: string) => void
  onCancel?: () => void
  placeholder?: string
  multiline?: boolean
  allowEmpty?: boolean
  autoFocus?: boolean
  onEditingChange?: (isEditing: boolean) => void
  cursorPosition?: "start" | "end" | number
}

export function EditableDiv({
  as: Component = "div",
  value,
  onChange,
  onCancel,
  placeholder = "",
  className,
  multiline = false,
  allowEmpty = false,
  autoFocus = false,
  onEditingChange,
  cursorPosition = "start",
  ...domProps
}: EditableDivProps) {
  const ref = useRef<EditableDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const isCancelingRef = useRef(false)

  // Sync value to DOM when not editing
  useEffect(() => {
    if (!isEditing && ref.current) {
      const displayValue = value || placeholder
      if (ref.current.textContent !== displayValue) {
        ref.current.textContent = displayValue
      }
    }
  }, [value, placeholder, isEditing])

  // Handle autoFocus and cursor positioning
  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus()

      // Only position cursor if we have content (not just placeholder)
      if (value && ref.current.firstChild) {
        requestAnimationFrame(() => {
          if (ref.current) {
            setCursorPosition(ref.current, cursorPosition)
          }
        })
      }
    }
  }, [autoFocus, cursorPosition, value])

  const handleFocus = () => {
    setIsEditing(true)
    onEditingChange?.(true)

    // Clear placeholder text
    if (ref.current?.textContent === placeholder) {
      ref.current.textContent = ""
    }
  }

  const handleBlur = () => {
    setIsEditing(false)
    onEditingChange?.(false)

    if (isCancelingRef.current) {
      isCancelingRef.current = false
      return
    }

    const rawText = ref.current?.textContent || ""
    const cleaned = cleanText(rawText)

    // Don't save placeholder as content
    if (cleaned === placeholder) {
      if (ref.current) ref.current.textContent = value || placeholder
      onCancel?.()
      return
    }

    // Validate empty content
    if (!allowEmpty && !cleaned) {
      if (ref.current) ref.current.textContent = value || placeholder
      onCancel?.()
      return
    }

    // Save if changed
    if (cleaned !== value) {
      onChange(cleaned)
    } else {
      onCancel?.()
    }
  }

  const handleKeyDown = createKeyboardHandler<EditableDivElement>({
    multiline,
    onSave: () => ref.current?.blur(),
    onCancel: () => {
      isCancelingRef.current = true
      if (ref.current) {
        ref.current.textContent = value || placeholder
      }
      ref.current?.blur()
      onCancel?.()
    },
  })

  return React.createElement(Component, {
    ref,
    contentEditable: "plaintext-only",
    suppressContentEditableWarning: true,
    className: cn(
      "outline-none cursor-text",
      "focus:ring-2 focus:ring-primary/20 focus:border-primary px-1 py-0.5 -mx-1 -my-0.5",
      multiline && "whitespace-pre-line",
      "min-w-[4rem]",
      className,
    ),
    onFocus: handleFocus,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    ...domProps,
  })
}
