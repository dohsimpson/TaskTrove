"use client"

import { useState, useRef } from "react"
import type { JSX } from "react"
import { cn } from "@/lib/utils"
import { MarkdownRenderer } from "./markdown-renderer"
import { EditableDiv } from "./editable-div"
import { getCaretFromPoint } from "@tasktrove/dom-utils"

export interface MarkdownEditableDivProps {
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "div" | "span"
  value: string
  onChange: (newValue: string) => void
  onCancel?: () => void
  placeholder?: string
  className?: string
  previewClassName?: string
  editingClassName?: string
  multiline?: boolean
  allowEmpty?: boolean
  autoFocus?: boolean
  onEditingChange?: (isEditing: boolean) => void
  cursorPosition?: "start" | "end"
  markdownEnabled?: boolean
  style?: React.CSSProperties
  [key: string]: unknown
}

/**
 * Markdown-enabled click-to-edit component that shows rendered markdown when not editing
 * Once clicked, switches to EditableDiv with cursor position preserved
 * Falls back to plain text editing when markdown is disabled
 */
export function MarkdownEditableDiv({
  as: Component = "div",
  value,
  onChange,
  onCancel,
  placeholder = "",
  className,
  previewClassName,
  editingClassName,
  multiline = false,
  allowEmpty = false,
  onEditingChange,
  cursorPosition = "start",
  markdownEnabled = true,
  ...props
}: MarkdownEditableDivProps) {
  const [isEditing, setIsEditing] = useState(false)
  const clickPositionRef = useRef<"start" | "end" | number>(cursorPosition)
  const isInlineComponent = Component === "span"
  const displayContainer: keyof JSX.IntrinsicElements =
    markdownEnabled && !isInlineComponent ? "div" : Component
  const markdownRoot: keyof JSX.IntrinsicElements = isInlineComponent ? "span" : "div"
  const DisplayContainer = displayContainer

  const handleEditingChange = (editing: boolean) => {
    setIsEditing(editing)
    onEditingChange?.(editing)
  }

  const handleTaskToggle = (taskIndex: number) => {
    const toggledValue = toggleTaskItemMarkdown(value, taskIndex)
    onChange(toggledValue)
  }

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (
      event.target instanceof HTMLElement &&
      (event.target.dataset.markdownTaskCheckbox === "true" ||
        event.target.closest('[data-markdown-task-checkbox="true"]'))
    ) {
      return
    }
    if (markdownEnabled) {
      clickPositionRef.current = "end"
    } else {
      const caret = getCaretFromPoint(event.clientX, event.clientY)
      if (caret?.node.nodeType === Node.TEXT_NODE) {
        clickPositionRef.current = caret.offset
      } else {
        clickPositionRef.current = cursorPosition
      }
    }

    setIsEditing(true)
    onEditingChange?.(true)
  }

  if (isEditing) {
    // Create editable props by spreading only allowed properties
    const { style: originalStyle, ...restEditableProps } = props

    return (
      <EditableDiv
        as={Component}
        value={value}
        onChange={onChange}
        onCancel={onCancel}
        placeholder={placeholder}
        className={cn(className, editingClassName)}
        multiline={multiline}
        allowEmpty={allowEmpty}
        autoFocus={true}
        onEditingChange={handleEditingChange}
        cursorPosition={clickPositionRef.current}
        style={{
          ...(originalStyle || {}),
          maxHeight: "none",
          overflow: "visible",
        }}
        {...restEditableProps}
      />
    )
  }

  // When not editing, display markdown or plain text
  // Filter out MarkdownEditableDiv-specific props that shouldn't be passed to MarkdownRenderer
  const displayProps = Object.fromEntries(
    Object.entries(props).filter(
      ([key]) =>
        ![
          "multiline",
          "allowEmpty",
          "onEditingChange",
          "cursorPosition",
          "onCancel",
          "autoFocus",
          "markdownEnabled",
        ].includes(key),
    ),
  )

  const displayContent = value || placeholder

  const previewClasses = cn(
    "cursor-text hover:bg-accent px-1 py-0.5 transition-colors",
    !value && placeholder && "text-muted-foreground italic",
    className,
    previewClassName,
  )

  return (
    <DisplayContainer
      className={previewClasses}
      onClick={handleClick}
      data-action="edit"
      data-value={value}
      data-placeholder={placeholder}
      data-multiline={multiline}
      {...displayProps}
    >
      {markdownEnabled ? (
        <MarkdownRenderer
          as={markdownRoot}
          className={className}
          onTaskItemToggle={handleTaskToggle}
        >
          {displayContent}
        </MarkdownRenderer>
      ) : (
        displayContent
      )}
    </DisplayContainer>
  )
}

function toggleTaskItemMarkdown(markdown: string, targetTaskIndex: number): string {
  if (targetTaskIndex < 0) {
    return markdown
  }

  const normalized = markdown.replace(/\r\n?/g, "\n")
  const lines = normalized.split("\n")
  let currentTaskIndex = 0
  let insideFence = false

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (line === undefined) {
      continue
    }
    const trimmed = line.trim()

    if (trimmed.startsWith("```")) {
      insideFence = !insideFence
      continue
    }

    if (insideFence) {
      continue
    }

    const taskMatch = line.match(/^(\s*(?:>\s*)*)([-*+]|\d+\.)\s+\[( |x|X)\](.*)$/u)

    if (taskMatch === null) {
      continue
    }

    if (currentTaskIndex === targetTaskIndex) {
      const prefix = taskMatch[1] ?? ""
      const marker = taskMatch[2] ?? "-"
      const currentState = taskMatch[3] ?? " "
      const rest = taskMatch[4] ?? ""
      const nextState = currentState.toLowerCase() === "x" ? " " : "x"
      lines[i] = `${prefix}${marker} [${nextState}]${rest}`
      return lines.join("\n")
    }

    currentTaskIndex += 1
  }

  return markdown
}
