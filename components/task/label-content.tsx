"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useAtomValue } from "jotai"
import { Tag, X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { labelsFromIdsAtom, labelsAtom } from "@/lib/atoms/core/labels"
import type { Task, LabelId, Label } from "@/lib/types"

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
  const [newLabel, setNewLabel] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const commandRef = useRef<HTMLDivElement>(null)

  const getLabelsFromIds = useAtomValue(labelsFromIdsAtom)
  const allLabels = useAtomValue(labelsAtom)

  // For quick-add mode, task might not be provided, so use empty array as fallback
  const taskLabelIds = React.useMemo(() => task?.labels || [], [task?.labels])
  const taskLabels = task ? getLabelsFromIds(task.labels) : []

  // Sync internal state with external initialIsAdding prop
  useEffect(() => {
    if (initialIsAdding) {
      onAddingChange?.(true)
    }
  }, [initialIsAdding, onAddingChange])

  const getFilteredLabels = useCallback(() => {
    const searchTerm = newLabel.toLowerCase().trim()

    // First filter out already added labels (now comparing by ID)
    const availableLabels = allLabels.filter((label) => !taskLabelIds.includes(label.id))

    if (!searchTerm) return availableLabels.slice(0, 5) // Show first 5 available if no search

    return availableLabels
      .filter((label) => label.name.toLowerCase().includes(searchTerm))
      .slice(0, 5) // Limit to 5 suggestions
  }, [newLabel, allLabels, taskLabelIds])

  const getAllOptions = () => {
    const filteredLabels = getFilteredLabels()
    const options: Array<Label | { id: string; name: string; isCreate: true }> = [...filteredLabels]

    // Add create option if it should be shown
    if (
      newLabel.trim() &&
      !filteredLabels.some((label) => label.name.toLowerCase() === newLabel.trim().toLowerCase())
    ) {
      options.push({ id: "create", name: newLabel.trim(), isCreate: true })
    }

    return options
  }

  const handleAddLabel = (labelName?: string) => {
    if (!labelName && !newLabel.trim()) return
    onAddLabel(labelName || newLabel.trim())
    setNewLabel("")
    onAddingChange?.(false)
  }

  const handleRemoveLabel = (labelId: LabelId) => {
    onRemoveLabel(labelId)
  }

  const handleCancelAdding = useCallback(() => {
    setNewLabel("")
    setSelectedIndex(-1)
    onAddingChange?.(false)
  }, [onAddingChange])

  // Reset selected index when search term changes and set to first option if available
  useEffect(() => {
    const filteredLabels = getFilteredLabels()
    const hasCreateOption =
      newLabel.trim() &&
      !filteredLabels.some((label) => label.name.toLowerCase() === newLabel.trim().toLowerCase())
    const totalOptions = filteredLabels.length + (hasCreateOption ? 1 : 0)
    setSelectedIndex(totalOptions > 0 ? 0 : -1)
  }, [newLabel, allLabels, taskLabelIds, getFilteredLabels])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const allOptions = getAllOptions()

    if (e.key === "Enter") {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < allOptions.length) {
        const selectedOption = allOptions[selectedIndex]
        if ("isCreate" in selectedOption && selectedOption.isCreate) {
          handleAddLabel()
        } else {
          handleAddLabel(selectedOption.name)
        }
      } else {
        handleAddLabel()
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, allOptions.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, -1))
    } else if (e.key === "Escape") {
      handleCancelAdding()
    }
  }

  // The Popover component handles click outside automatically

  return (
    <div className={cn("space-y-3", mode === "popover" && "p-2", className)}>
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

      {/* Add Label Interface - Similar to comment input */}
      <div className="flex gap-2">
        <Popover open={!!newLabel.trim()}>
          <PopoverTrigger asChild>
            <div className="flex-1">
              <Input
                placeholder="Search or create labels..."
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-sm h-9"
                data-testid="label-input"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 p-0"
            align="start"
            side="bottom"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div ref={commandRef}>
              <Command>
                <CommandList className="max-h-48">
                  <CommandGroup>
                    {getFilteredLabels().map((label, index) => (
                      <CommandItem
                        key={label.id}
                        onSelect={() => handleAddLabel(label.name)}
                        className={cn(
                          "flex items-center gap-2 cursor-pointer",
                          selectedIndex === index && "bg-accent",
                        )}
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        <span>{label.name}</span>
                      </CommandItem>
                    ))}
                    {newLabel.trim() &&
                      !getFilteredLabels().some(
                        (label) => label.name.toLowerCase() === newLabel.trim().toLowerCase(),
                      ) && (
                        <CommandItem
                          onSelect={() => handleAddLabel()}
                          className={cn(
                            "flex items-center gap-2 cursor-pointer",
                            selectedIndex === getFilteredLabels().length && "bg-accent",
                          )}
                        >
                          <Plus className="h-3 w-3 mr-2" />
                          Create &quot;{newLabel.trim()}&quot;
                        </CommandItem>
                      )}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          </PopoverContent>
        </Popover>
        <Button
          onClick={() => handleAddLabel()}
          disabled={!newLabel.trim()}
          size="sm"
          className="h-9 px-3"
          data-testid="label-submit-button"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
