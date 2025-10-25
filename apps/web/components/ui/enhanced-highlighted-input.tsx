"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { useAtomValue } from "jotai"
import { cn } from "@/lib/utils"
import { generateHighlightingPatterns } from "@/lib/utils/shared-patterns"
import { nlpEnabledAtom } from "@tasktrove/atoms/ui/dialogs"
import { labelsAtom } from "@tasktrove/atoms/data/base/atoms"
import { visibleProjectsAtom } from "@tasktrove/atoms/core/projects"
import {
  getAutocompletePrefix,
  TOKEN_STYLES,
  DISABLED_TOKEN_STYLES,
} from "@/components/ui/enhanced-highlighted-input-helpers"
import type { ExtractionType, AutocompleteType } from "@tasktrove/parser/types"

interface ParsedToken {
  type: ExtractionType | "text"
  value: string
  start: number
  end: number
}

interface AutocompleteItem {
  id: string
  label: string // Display text (name)
  icon: React.ReactNode
  type: AutocompleteType
  value?: string
}

interface AutocompleteState {
  show: boolean
  type: AutocompleteType | null
  query: string
  items: AutocompleteItem[]
  selectedIndex: number
  position: { x: number; y: number }
  startPos: number
}

interface EnhancedHighlightedInputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  placeholder: string
  autoFocus?: boolean
  disabledSections?: Set<string>
  onToggleSection?: (section: string) => void
  onAutocompleteSelect?: (item: AutocompleteItem) => void
  autocompleteItems?: {
    projects: AutocompleteItem[]
    labels: AutocompleteItem[]
    dates: AutocompleteItem[]
    estimations: AutocompleteItem[]
    assignees?: AutocompleteItem[]
  }
  users?: Array<{ username: string; id: string; avatar?: string }>
}

// Create a function that constructs a proper React change event
const createReactChangeEvent = (value: string): React.ChangeEvent<HTMLInputElement> => {
  const inputElement = document.createElement("input")
  inputElement.value = value

  const nativeEvent = new Event("change", { bubbles: true, cancelable: true })

  // Build the React synthetic event structure with proper typing
  const syntheticEvent: React.ChangeEvent<HTMLInputElement> = {
    target: inputElement,
    currentTarget: inputElement,
    type: "change",
    bubbles: true,
    cancelable: true,
    defaultPrevented: false,
    eventPhase: 2,
    isTrusted: false,
    nativeEvent: nativeEvent,
    preventDefault: (): void => {
      nativeEvent.preventDefault()
    },
    isDefaultPrevented: (): boolean => nativeEvent.defaultPrevented,
    stopPropagation: (): void => {
      nativeEvent.stopPropagation()
    },
    isPropagationStopped: (): boolean => false,
    persist: (): void => {},
    timeStamp: nativeEvent.timeStamp,
  }

  return syntheticEvent
}

// Shared classes for contentEditable and overlay to ensure perfect alignment
const SHARED_TEXT_CLASSES =
  "w-full min-h-[60px] p-3 whitespace-pre-wrap break-words whitespace-break-spaces"

// Helper to safely lookup token styles (handles Pro-only types like 'assignee' in base)
function getStyleForToken<T extends Record<string, string>>(styles: T, tokenType: string): string {
  const key = tokenType
  if (key in styles) {
    // Safe: we verified key exists in styles, use nullish coalescing for type safety
    return styles[key] ?? ""
  }
  return ""
}

export function EnhancedHighlightedInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  autoFocus,
  disabledSections = new Set(),
  onToggleSection,
  onAutocompleteSelect,
  autocompleteItems = { projects: [], labels: [], dates: [], estimations: [] },
  users = [],
}: EnhancedHighlightedInputProps) {
  const inputRef = useRef<HTMLDivElement>(null)
  const autocompleteRef = useRef<HTMLDivElement>(null)

  // Get data from atoms with fallbacks
  const nlpEnabled = useAtomValue(nlpEnabledAtom)
  const labelsFromAtom = useAtomValue(labelsAtom)
  const projectsFromAtom = useAtomValue(visibleProjectsAtom)

  const labels = useMemo(() => labelsFromAtom, [labelsFromAtom])
  const projects = useMemo(() => projectsFromAtom, [projectsFromAtom])

  const [cursorPosition, setCursorPosition] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const [autocomplete, setAutocomplete] = useState<AutocompleteState>({
    show: false,
    type: null,
    query: "",
    items: [],
    selectedIndex: 0,
    position: { x: 0, y: 0 },
    startPos: 0,
  })

  // Parse text into tokens
  const parseText = useCallback(
    (input: string): ParsedToken[] => {
      const tokens: ParsedToken[] = []

      // Generate dynamic patterns based on available projects, labels, and users
      const dynamicPatterns = generateHighlightingPatterns({
        projects: projects.map((p) => ({ name: p.name })),
        labels: labels.map((l) => ({ name: l.name })),
        ...(users.length > 0 ? { users: users.map((u) => ({ username: u.username })) } : {}),
      })

      dynamicPatterns.forEach(({ type, regex }) => {
        let match
        const regexCopy = new RegExp(regex.source, regex.flags)
        while ((match = regexCopy.exec(input)) !== null) {
          tokens.push({
            type,
            value: match[0],
            start: match.index,
            end: match.index + match[0].length,
          })
        }
      })

      // Sort tokens by start position
      tokens.sort((a, b) => a.start - b.start)

      // Remove overlapping tokens (keep the first one)
      const nonOverlapping: ParsedToken[] = []
      for (const token of tokens) {
        if (
          !nonOverlapping.some(
            (existing) =>
              (token.start >= existing.start && token.start < existing.end) ||
              (token.end > existing.start && token.end <= existing.end),
          )
        ) {
          nonOverlapping.push(token)
        }
      }

      // Fill in text tokens
      const result: ParsedToken[] = []
      let lastEnd = 0

      nonOverlapping.forEach((token) => {
        if (token.start > lastEnd) {
          result.push({
            type: "text",
            value: input.slice(lastEnd, token.start),
            start: lastEnd,
            end: token.start,
          })
        }
        result.push(token)
        lastEnd = token.end
      })

      if (lastEnd < input.length) {
        result.push({
          type: "text",
          value: input.slice(lastEnd),
          start: lastEnd,
          end: input.length,
        })
      }

      return result
    },
    [projects, labels, users],
  )

  // Detect autocomplete triggers
  const detectAutocomplete = useCallback(
    (text: string, cursorPos: number): AutocompleteState | null => {
      // Don't show autocomplete when NLP is disabled
      if (!nlpEnabled) {
        return null
      }

      const textBeforeCursor = text.slice(0, cursorPos)
      const lastChar = textBeforeCursor[textBeforeCursor.length - 1] || ""
      const lastWord = textBeforeCursor.split(/\s/).pop() || ""

      // Project autocomplete (#)
      if (lastChar === "#" || (lastWord.startsWith("#") && lastWord.length > 1)) {
        const query = lastWord.slice(1)
        const filteredProjects = autocompleteItems.projects.filter((p) =>
          p.label.toLowerCase().includes(query.toLowerCase()),
        )

        if (filteredProjects.length > 0) {
          return {
            show: true,
            type: "project",
            query,
            items: filteredProjects.slice(0, 8),
            selectedIndex: 0,
            position: { x: 0, y: 0 },
            startPos: textBeforeCursor.lastIndexOf("#"),
          }
        }
      }

      // Label + Assignee autocomplete (@)
      if (lastChar === "@" || (lastWord.startsWith("@") && lastWord.length > 1)) {
        const query = lastWord.slice(1)

        // Get filtered assignees (if available)
        const filteredAssignees =
          autocompleteItems.assignees?.filter((a) =>
            a.label.toLowerCase().includes(query.toLowerCase()),
          ) || []

        // Get filtered labels
        const filteredLabels = autocompleteItems.labels.filter((l) =>
          l.label.toLowerCase().includes(query.toLowerCase()),
        )

        // Combine: assignees first, then labels (total max 8 items)
        const combinedItems = [...filteredAssignees, ...filteredLabels].slice(0, 8)

        if (combinedItems.length > 0) {
          return {
            show: true,
            type: "label",
            query,
            items: combinedItems,
            selectedIndex: 0,
            position: { x: 0, y: 0 },
            startPos: textBeforeCursor.lastIndexOf("@"),
          }
        }
      }

      // Estimation autocomplete (~)
      if (lastChar === "~" || (lastWord.startsWith("~") && lastWord.length > 1)) {
        const query = lastWord.slice(1)
        const filteredEstimations = autocompleteItems.estimations.filter((e) =>
          e.label.toLowerCase().includes(query.toLowerCase()),
        )

        if (filteredEstimations.length > 0) {
          return {
            show: true,
            type: "estimation",
            query,
            items: filteredEstimations.slice(0, 8),
            selectedIndex: 0,
            position: { x: 0, y: 0 },
            startPos: textBeforeCursor.lastIndexOf("~"),
          }
        }
      }

      // Date autocomplete
      const dateKeywords = ["today", "tomorrow", "next", "every", "daily", "weekly", "monthly"]
      if (
        dateKeywords.some((kw) =>
          lastWord.toLowerCase().startsWith(kw.slice(0, Math.min(3, lastWord.length))),
        )
      ) {
        const filteredDates = autocompleteItems.dates.filter((d) =>
          d.label.toLowerCase().includes(lastWord.toLowerCase()),
        )

        if (filteredDates.length > 0) {
          return {
            show: true,
            type: "date",
            query: lastWord,
            items: filteredDates.slice(0, 8),
            selectedIndex: 0,
            position: { x: 0, y: 0 },
            startPos: textBeforeCursor.lastIndexOf(lastWord),
          }
        }
      }

      return null
    },
    [autocompleteItems, nlpEnabled],
  )

  // Calculate autocomplete position relative to cursor
  const calculateAutocompletePosition = useCallback((cursorPos: number) => {
    if (!inputRef.current) return { x: 0, y: 0 }

    try {
      const range = document.createRange()
      const textNode = inputRef.current.firstChild

      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        range.setStart(textNode, Math.min(cursorPos, textNode.textContent?.length || 0))
        range.collapse(true)

        const rect = range.getBoundingClientRect()
        const inputRect = inputRef.current.getBoundingClientRect()

        return {
          x: rect.left - inputRect.left,
          y: rect.top - inputRect.top + rect.height + 4,
        }
      }
    } catch {
      // Fallback for test environments or browsers without full Range API support
      console.warn("Range.getBoundingClientRect not available, using fallback positioning")
    }

    return { x: 0, y: 24 }
  }, [])

  // Handle autocomplete selection
  const handleAutocompleteSelect = useCallback(
    (item: AutocompleteItem) => {
      if (!inputRef.current) return

      // Get prefix based on the item's type (not autocomplete.type)
      // This allows mixing assignees and labels in the same dropdown
      const prefix = getAutocompletePrefix(item.type)

      // Use the actual label/name for insertion
      const insertText = item.label

      const newText =
        value.slice(0, autocomplete.startPos) +
        prefix +
        insertText +
        " " +
        value.slice(cursorPosition)

      // Update DOM directly first
      inputRef.current.textContent = newText

      // Set cursor position
      const newPosition = autocomplete.startPos + prefix.length + insertText.length + 1
      const selection = window.getSelection()
      const range = document.createRange()

      if (inputRef.current.firstChild) {
        range.setStart(inputRef.current.firstChild, newPosition)
        range.collapse(true)
        selection?.removeAllRanges()
        selection?.addRange(range)
      }

      // Update React state
      onChange(createReactChangeEvent(newText))

      setAutocomplete((prev) => ({ ...prev, show: false }))
      setCursorPosition(newPosition)

      // Trigger callback
      onAutocompleteSelect?.(item)

      // Ensure focus remains on input
      inputRef.current.focus()
    },
    [value, cursorPosition, autocomplete, onChange, onAutocompleteSelect],
  )

  // Handle contentEditable input
  const handleInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const newText = e.currentTarget.textContent || ""

      // Trigger onChange event
      onChange(createReactChangeEvent(newText))

      // Track cursor position
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const newCursorPos = range.startOffset
        setCursorPosition(newCursorPos)

        // Check for autocomplete
        const autocompleteState = detectAutocomplete(newText, newCursorPos)
        if (autocompleteState) {
          const position = calculateAutocompletePosition(newCursorPos)
          setAutocomplete({ ...autocompleteState, position })
        } else {
          setAutocomplete((prev) => ({ ...prev, show: false }))
        }
      }
    },
    [onChange, detectAutocomplete, calculateAutocompletePosition],
  )

  // Handle paste events to strip newlines
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData("text/plain")
    // Replace all newlines with spaces
    const cleanedText = text.replace(/\r?\n/g, " ")

    // Insert the cleaned text
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      selection.deleteFromDocument()
      const range = selection.getRangeAt(0)
      const textNode = document.createTextNode(cleanedText)
      range.insertNode(textNode)
      range.setStartAfter(textNode)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)

      // Trigger input event to update state
      if (inputRef.current) {
        const event = new Event("input", { bubbles: true })
        inputRef.current.dispatchEvent(event)
      }
    }
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Prevent newlines from Enter or Shift+Enter
      if (e.key === "Enter") {
        e.preventDefault()

        if (autocomplete.show) {
          // If autocomplete is showing, select the current item
          const selectedItem = autocomplete.items[autocomplete.selectedIndex]
          if (selectedItem) {
            handleAutocompleteSelect(selectedItem)
          }
        } else {
          // Pass through to parent handler for form submission
          onKeyDown?.(e)
        }
        return
      }

      if (autocomplete.show) {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault()
            setAutocomplete((prev) => ({
              ...prev,
              selectedIndex: Math.min(prev.selectedIndex + 1, prev.items.length - 1),
            }))
            break

          case "ArrowUp":
            e.preventDefault()
            setAutocomplete((prev) => ({
              ...prev,
              selectedIndex: Math.max(prev.selectedIndex - 1, 0),
            }))
            break

          case "Tab": {
            e.preventDefault()
            const selectedItem = autocomplete.items[autocomplete.selectedIndex]
            if (selectedItem) {
              handleAutocompleteSelect(selectedItem)
            }
            break
          }

          case "Escape":
            e.preventDefault()
            setAutocomplete((prev) => ({ ...prev, show: false }))
            break
        }
      } else {
        // Pass through to parent handler
        onKeyDown?.(e)
      }
    },
    [autocomplete, onKeyDown, handleAutocompleteSelect],
  )

  // Render highlighted content
  const renderHighlightedContent = useMemo(() => {
    const tokens = parseText(value)

    return tokens.map((token, index) => {
      if (token.type === "text") {
        return <span key={index}>{token.value}</span>
      }

      // Don't apply highlighting when NLP is disabled
      if (!nlpEnabled) {
        return <span key={index}>{token.value}</span>
      }

      const isDisabled = disabledSections.has(token.value.toLowerCase())
      const styles = isDisabled ? DISABLED_TOKEN_STYLES : TOKEN_STYLES
      const tokenStyle = getStyleForToken(styles, token.type)

      return (
        <span
          key={index}
          className={cn(tokenStyle, "opacity-60")} // Apply opacity to show blinking cursor behind it
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleSection?.(token.value.toLowerCase())
          }}
          title={isDisabled ? "Click to enable parsing" : "Click to disable parsing"}
        >
          {token.value}
        </span>
      )
    })
  }, [value, parseText, disabledSections, onToggleSection, nlpEnabled])

  // Focus management
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  return (
    <div className="relative">
      {/* ContentEditable input */}
      <div
        ref={inputRef}
        contentEditable="plaintext-only"
        role="combobox"
        aria-expanded={autocomplete.show}
        aria-haspopup="listbox"
        aria-controls="enhanced-quick-add-autocomplete"
        aria-owns="enhanced-quick-add-autocomplete"
        aria-label="Quick add task input with natural language parsing"
        aria-describedby="enhanced-quick-add-help"
        className={cn(SHARED_TEXT_CLASSES, "bg-transparent")}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        suppressContentEditableWarning
        style={{ caretColor: "hsl(var(--foreground))" }}
        tabIndex={0}
      />

      {/* Screen reader help text */}
      <div id="enhanced-quick-add-help" className="sr-only">
        Type your task. Use # for projects, @ for labels, ~ for time estimates like "~30min",
        "~2hours", or "~1hour30mins", or type times like "5PM" or "today". Use arrow keys to
        navigate autocomplete suggestions when they appear.
      </div>

      {/* Highlighted overlay */}
      <div
        className={cn(
          SHARED_TEXT_CLASSES,
          "z-0 absolute inset-0 pointer-events-none",
          // "absolute inset-0 pointer-events-none z-0"
        )}
      >
        {value
          ? renderHighlightedContent
          : !isFocused && (
              <span className="text-muted-foreground pointer-events-none">{placeholder}</span>
            )}
      </div>

      {/* Autocomplete dropdown */}
      {autocomplete.show && autocomplete.items.length > 0 && (
        <div
          ref={autocompleteRef}
          id="enhanced-quick-add-autocomplete"
          role="listbox"
          aria-label={`${autocomplete.type} suggestions`}
          className="absolute z-20 w-64 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto"
          style={{
            left: autocomplete.position.x,
            top: autocomplete.position.y,
          }}
        >
          {autocomplete.items.map((item, index) => (
            <div
              key={item.id}
              role="option"
              aria-selected={index === autocomplete.selectedIndex}
              className={cn(
                "px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors",
                index === autocomplete.selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted",
              )}
              onClick={() => handleAutocompleteSelect(item)}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
