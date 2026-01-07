"use client"

import { useEffect, useRef } from "react"
import { Calendar, Flag, Tag, Folder, Plus, Clock, Repeat, Timer } from "lucide-react"
import { cn } from "@/lib/utils"
import { smoothScrollIntoView } from "@tasktrove/dom-utils"

export interface AutocompleteSuggestion {
  type: "tag" | "project" | "date" | "priority" | "time" | "recurring" | "duration" | "create"
  value: string
  display: string
  icon?: React.ReactNode
  description?: string
}

interface AutocompleteDropdownProps {
  suggestions: AutocompleteSuggestion[]
  selectedIndex: number
  onSelect: (suggestion: AutocompleteSuggestion) => void
  onClose: () => void
  position: { top: number; left: number }
  query: string
}

export function AutocompleteDropdown({
  suggestions,
  selectedIndex,
  onSelect,
  onClose,
  position,
  query,
}: AutocompleteDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        event.target instanceof Node &&
        !dropdownRef.current.contains(event.target)
      ) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  // Auto-scroll selected item into view
  useEffect(() => {
    const selectedElement = dropdownRef.current?.children[selectedIndex]
    if (selectedElement instanceof HTMLElement) {
      smoothScrollIntoView(selectedElement, { block: "nearest" })
    }
  }, [selectedIndex])

  if (suggestions.length === 0) return null

  const getIcon = (type: string) => {
    switch (type) {
      case "tag":
        return <Tag className="w-3 h-3" />
      case "project":
        return <Folder className="w-3 h-3" />
      case "date":
        return <Calendar className="w-3 h-3" />
      case "priority":
        return <Flag className="w-3 h-3" />
      case "time":
        return <Clock className="w-3 h-3" />
      case "recurring":
        return <Repeat className="w-3 h-3" />
      case "duration":
        return <Timer className="w-3 h-3" />
      case "create":
        return <Plus className="w-3 h-3" />
      default:
        return null
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "tag":
        return "text-blue-600"
      case "project":
        return "text-purple-600"
      case "date":
        return "text-green-600"
      case "priority":
        return "text-orange-600"
      case "time":
        return "text-purple-600"
      case "recurring":
        return "text-indigo-600"
      case "duration":
        return "text-amber-600"
      case "create":
        return "text-gray-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 w-64 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={`${suggestion.type}-${suggestion.value}`}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors",
            index === selectedIndex ? "bg-blue-50 text-blue-900" : "hover:bg-gray-50",
            suggestion.type === "create" && "border-t border-gray-100",
          )}
          onClick={() => onSelect(suggestion)}
        >
          <span className={cn("flex-shrink-0", getTypeColor(suggestion.type))}>
            {suggestion.icon || getIcon(suggestion.type)}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="truncate">
                {suggestion.type === "create" ? <>Create "{query}"</> : suggestion.display}
              </span>
            </div>
            {suggestion.description && (
              <div className="text-xs text-gray-500 truncate">{suggestion.description}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
