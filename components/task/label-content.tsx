"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useAtomValue } from "jotai"
import { Tag, X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { labelsFromIdsAtom, sortedLabelsAtom } from "@/lib/atoms/core/labels"
import type { Task, LabelId } from "@/lib/types"

interface LabelContentProps {
  taskId?: string
  task?: Task // Deprecated - use taskId instead, or provided for quick-add context
  onAddLabel: (labelName?: string) => void
  onRemoveLabel: (labelId: LabelId) => void
  mode?: "inline" | "popover"
  className?: string
  onAddingChange?: (isAdding: boolean) => void
  initialIsAdding?: boolean
}

export function LabelContent({
  taskId,
  task,
  onAddLabel,
  onRemoveLabel,
  mode = "inline",
  className,
  onAddingChange,
  initialIsAdding = false,
}: LabelContentProps) {
  console.log(taskId) // TODO: placeholder to prevent linter complaining about unused var, remove me
  const [isAddingLabel, setIsAddingLabel] = useState(initialIsAdding)
  const [newLabel, setNewLabel] = useState("")
  const commandRef = useRef<HTMLDivElement>(null)

  const getLabelsFromIds = useAtomValue(labelsFromIdsAtom)
  const allLabels = useAtomValue(sortedLabelsAtom)

  // For quick-add mode, task might not be provided, so use empty array as fallback
  const taskLabels = task ? getLabelsFromIds(task.labels) : []
  const taskLabelIds = task?.labels || []

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
    const availableLabels = allLabels.filter((label) => !taskLabelIds.includes(label.id))

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
              {taskLabels.length > 0 ? `Labels (${taskLabels.length})` : "Add Labels"}
            </span>
          </div>
        </div>
      )}

      {/* Current Labels - Only show if we have task data */}
      {task && taskLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {taskLabels.map((label) => (
            <Badge
              key={label.id}
              variant="secondary"
              className="gap-1 px-2 py-1 text-xs group"
              style={{
                backgroundColor: label.color,
                color: "white",
                border: "none",
              }}
            >
              <Tag className="h-3 w-3" />
              {label.name}
              <button
                onClick={() => handleRemoveLabel(label.id)}
                className="ml-1 hover:bg-black/20 rounded-full p-0.5 opacity-70 hover:opacity-100"
              >
                <X className="h-2 w-2" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add Label Interface */}
      <div>
        {!isAddingLabel && (
          <button
            onClick={handleStartAdding}
            className="flex items-center gap-2 p-2 w-full rounded-lg cursor-pointer hover:bg-accent/50 transition-all duration-200 bg-muted/20 text-left"
          >
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Add label</span>
            <Plus className="h-3 w-3 text-muted-foreground ml-auto" />
          </button>
        )}

        {isAddingLabel && (
          <div ref={commandRef}>
            <Command className="border rounded-lg shadow-md bg-background">
              <CommandInput
                placeholder="Search or create labels..."
                value={newLabel}
                onValueChange={setNewLabel}
                onKeyDown={handleKeyDown}
                className="border-0"
                autoFocus
              />
              <CommandList className="max-h-48">
                <CommandEmpty>
                  {newLabel.trim() ? (
                    <div className="p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddLabel()}
                        className="w-full justify-start h-8 px-2 text-left"
                      >
                        <Plus className="h-3 w-3 mr-2" />
                        Create &quot;{newLabel.trim()}&quot;
                      </Button>
                    </div>
                  ) : (
                    "No labels found."
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {getFilteredLabels().map((label) => (
                    <CommandItem
                      key={label.id}
                      onSelect={() => handleAddLabel(label.name)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      <span>{label.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}
      </div>
    </div>
  )
}
