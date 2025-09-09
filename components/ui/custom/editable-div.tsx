"use client"

import React, { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { createKeyboardHandler } from "@/lib/utils/keyboard"

/**
 * Clean contentEditable text by replacing non-breaking spaces with newlines
 * while preserving all empty lines and user formatting.
 * This fixes the common U+A0 issue with contentEditable.
 * @param text - Raw text from contentEditable element
 * @returns Cleaned text with preserved formatting and empty lines
 */
function cleanContentEditableText(text: string): string {
  return text
    .replace(/\u00A0/g, "\n") // Replace non-breaking spaces (U+A0) with newlines
    .trim() // Only trim start/end, preserve all internal formatting
}

/**
 * Move the cursor to the end of a contentEditable element
 * @param element - The contentEditable element to modify
 */
function moveCursorToEnd(element: EditableDivElement): void {
  try {
    const range = document.createRange()
    const selection = window.getSelection()

    if (!selection) return

    if (element.firstChild) {
      range.selectNodeContents(element)
      range.collapse(false) // false = collapse to end
    } else {
      // Handle empty elements by setting range to element itself
      range.setStart(element, 0)
      range.setEnd(element, 0)
    }

    selection.removeAllRanges()
    selection.addRange(range)
  } catch (error) {
    // Fallback for older browsers - just focus without cursor positioning
    console.warn("Cursor positioning not supported:", error)
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
  /**
   * Controls cursor position when autoFocus is enabled
   * @default "start"
   */
  cursorPosition?: "start" | "end"
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
  ...props
}: EditableDivProps) {
  const ref = useRef<EditableDivElement>(null)
  const cancelingRef = useRef(false)

  const handleBlur = () => {
    onEditingChange?.(false)

    // If we're canceling, don't process the blur event
    if (cancelingRef.current) {
      cancelingRef.current = false
      return
    }

    const rawText = ref.current?.textContent || ""
    const cleanText = cleanContentEditableText(rawText)

    // Don't save placeholder text as content
    if (cleanText === placeholder) {
      if (ref.current) {
        ref.current.textContent = value || placeholder
      }
      onCancel?.()
      return
    }

    if (!allowEmpty && !cleanText.trim()) {
      // Revert to original value or placeholder
      if (ref.current) {
        ref.current.textContent = value || placeholder
      }
      onCancel?.()
      return
    }

    if (cleanText !== value) {
      onChange(cleanText)
    } else {
      // Text didn't change, but we still need to signal that editing is done
      onCancel?.()
    }
  }

  const handleKeyDown = createKeyboardHandler<EditableDivElement>({
    multiline,
    onSave: () => ref.current?.blur(),
    onCancel: () => {
      cancelingRef.current = true
      if (ref.current) {
        ref.current.textContent = value || placeholder
      }
      ref.current?.blur()
      onCancel?.()
    },
  })

  const handleFocus = () => {
    onEditingChange?.(true)

    if (ref.current && ref.current.textContent === placeholder) {
      ref.current.textContent = ""
    }
  }

  useEffect(() => {
    if (ref.current) {
      const displayValue = value || placeholder
      if (ref.current.textContent !== displayValue) {
        ref.current.textContent = displayValue
      }
    }
  }, [value, placeholder])

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus()

      // Position cursor after focus
      if (cursorPosition === "end") {
        // Use requestAnimationFrame for more reliable timing
        requestAnimationFrame(() => {
          if (ref.current) {
            moveCursorToEnd(ref.current)
          }
        })
      }
    }
  }, [autoFocus, cursorPosition])

  return React.createElement(Component, {
    ref,
    contentEditable: true,
    suppressContentEditableWarning: true,
    className: cn(
      "outline-none cursor-text",
      // Focus border for visual cue
      "focus:ring-2 focus:ring-primary/20 focus:border-primary px-1 py-0.5 -mx-1 -my-0.5",
      multiline && "whitespace-pre-line",
      // Ensure minimum width when empty to maintain clickable area
      "min-w-[4rem]",
      className,
    ),
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    onFocus: handleFocus,
    ...props,
  })
}
