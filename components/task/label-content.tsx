"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useAtomValue } from "jotai"
import { Tag, X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { getContrastColor, cn } from "@/lib/utils"
import { labelsFromIdsAtom, sortedLabelsAtom } from "@/lib/atoms/core/labels"
import type { Task, LabelId } from "@/lib/types"

interface LabelContentProps {
  task: Task
  onAddLabel: (labelName?: string) => void
  onRemoveLabel: (labelId: LabelId) => void
  mode?: "inline" | "popover"
  className?: string
  onAddingChange?: (isAdding: boolean) => void
  initialIsAdding?: boolean
}

export function LabelContent({
  task,
  onAddLabel,
  onRemoveLabel,
  mode = "inline",
  className,
  onAddingChange,
  initialIsAdding = false,
}: LabelContentProps) {
  const [isAddingLabel, setIsAddingLabel] = useState(initialIsAdding)
  const [newLabel, setNewLabel] = useState("")
  const commandRef = useRef<HTMLDivElement>(null)

  const getLabelsFromIds = useAtomValue(labelsFromIdsAtom)
  const allLabels = useAtomValue(sortedLabelsAtom)
  const taskLabels = getLabelsFromIds(task.labels)

  // Sync internal state with external initialIsAdding prop
  useEffect(() => {
    setIsAddingLabel(initialIsAdding)
    if (initialIsAdding) {
      onAddingChange?.(true)
    }
  }, [initialIsAdding, onAddingChange])

  const getFilteredLabels = () => {
    const searchTerm = newLabel.toLowerCase().trim()

    // First filter out already added labels (now comparing by ID)
    const availableLabels = allLabels.filter((label) => !task.labels.includes(label.id))

    if (!searchTerm) return availableLabels.slice(0, 5) // Show first 5 available if no search

    return availableLabels
      .filter((label) => label.name.toLowerCase().includes(searchTerm))
      .slice(0, 5) // Limit to 5 suggestions
  }

  const handleAddLabel = (labelName?: string) => {
    onAddLabel(labelName || newLabel.trim())
    setNewLabel("")
    setIsAddingLabel(false)
    onAddingChange?.(false)
  }

  const handleRemoveLabel = (labelId: LabelId) => {
    onRemoveLabel(labelId)
  }

  const handleStartAdding = () => {
    setIsAddingLabel(true)
    onAddingChange?.(true)
  }

  const handleCancelAdding = useCallback(() => {
    setNewLabel("")
    setIsAddingLabel(false)
    onAddingChange?.(false)
  }, [onAddingChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancelAdding()
    }
  }

  // Handle clicks outside to close the label adding interface
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        commandRef.current &&
        event.target instanceof Node &&
        !commandRef.current.contains(event.target)
      ) {
        if (isAddingLabel) {
          handleCancelAdding()
        }
      }
    }

    if (isAddingLabel) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isAddingLabel, handleCancelAdding])

  return (
    <div className={cn("space-y-3", mode === "popover" && "p-4", className)}>
      {/* Header - Show title for popover header only */}
      {mode !== "inline" && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">
              {taskLabels.length > 0 ? "Labels" : "Add Label"}
            </span>
          </div>
          {taskLabels.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {taskLabels.length} label{taskLabels.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Labels and Add Button */}
      <div className="flex flex-wrap gap-1">
        {taskLabels.map((label) => (
          <div
            key={label.id}
            className="px-2 py-1 rounded text-xs flex items-center gap-1.5 group hover:opacity-80"
            style={{
              backgroundColor: label.color,
              color: getContrastColor(label.color),
            }}
          >
            <Tag className="h-3 w-3" />
            <span>{label.name}</span>
            <button
              className="hover:opacity-75 transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                handleRemoveLabel(label.id)
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {!isAddingLabel && (
          <button
            onClick={handleStartAdding}
            className="px-2 py-1 rounded text-xs flex items-center gap-1.5 hover:bg-accent/50 transition-colors border border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Add Label Interface */}
      {isAddingLabel && (
        <div className="space-y-2">
          <Command className="rounded-lg border" ref={commandRef} onKeyDown={handleKeyDown}>
            <CommandInput
              placeholder="Search or create label..."
              value={newLabel}
              onValueChange={setNewLabel}
              className="h-8"
              autoFocus
            />
            <CommandList className="max-h-32">
              {getFilteredLabels().length > 0 && (
                <CommandGroup heading="Existing Labels">
                  {getFilteredLabels().map((label) => (
                    <CommandItem
                      key={label.id}
                      onSelect={() => handleAddLabel(label.name)}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: label.color }}
                      />
                      <span>{label.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {newLabel.trim() &&
                !allLabels.some((l) => l.name.toLowerCase() === newLabel.toLowerCase()) && (
                  <CommandGroup heading="Create New">
                    <CommandItem
                      onSelect={() => handleAddLabel()}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-3 h-3 text-muted-foreground" />
                      <span>Create "{newLabel.trim()}"</span>
                    </CommandItem>
                  </CommandGroup>
                )}
              <CommandEmpty>No labels found.</CommandEmpty>
            </CommandList>
          </Command>
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelAdding}
              className="h-6 px-2 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
