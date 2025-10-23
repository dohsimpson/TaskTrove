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
import { labelsAtom } from "@tasktrove/atoms/data/base/atoms"
import { labelsFromIdsAtom } from "@tasktrove/atoms/core/labels"
import { useTranslation } from "@tasktrove/i18n"
import type { Task, LabelId, Label } from "@/lib/types"

interface LabelContentProps {
  // taskId?: string
  task?: Task // Deprecated - use taskId instead, or provided for quick-add context
  onAddLabel: (labelName?: string) => void
  onRemoveLabel: (labelId: LabelId) => void
  mode?: "inline" | "popover"
  className?: string
  onAddingChange?: (isAdding: boolean) => void
  focusInput?: boolean
}

export function LabelContent({
  // taskId,
  task,
  onAddLabel,
  onRemoveLabel,
  mode = "inline",
  className,
  onAddingChange,
  focusInput,
}: LabelContentProps) {
  // Translation setup
  const { t } = useTranslation("task")

  const [inputFocus, setInputFocus] = useState(focusInput)
  const [newLabel, setNewLabel] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const commandRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const getLabelsFromIds = useAtomValue(labelsFromIdsAtom)
  const allLabels = useAtomValue(labelsAtom)

  // For quick-add mode, task might not be provided, so use empty array as fallback
  const taskLabelIds = React.useMemo(() => task?.labels || [], [task?.labels])
  const taskLabels = task ? getLabelsFromIds(task.labels) : []

  const filteredLabels = React.useMemo(() => {
    const searchTerm = newLabel.toLowerCase().trim()

    // First filter out already added labels (now comparing by ID)
    const availableLabels = allLabels.filter((label) => !taskLabelIds.includes(label.id))

    if (!searchTerm) return availableLabels

    return availableLabels.filter((label) => label.name.toLowerCase().includes(searchTerm))
  }, [newLabel, allLabels, taskLabelIds])

  const getAllOptions = () => {
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
    const hasCreateOption =
      newLabel.trim() &&
      !filteredLabels.some((label) => label.name.toLowerCase() === newLabel.trim().toLowerCase())
    const totalOptions = filteredLabels.length + (hasCreateOption ? 1 : 0)
    setSelectedIndex(totalOptions > 0 ? 0 : -1)
  }, [newLabel, allLabels, taskLabelIds, filteredLabels])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const allOptions = getAllOptions()

    if (e.key === "Enter") {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < allOptions.length) {
        const selectedOption = allOptions[selectedIndex]
        if (!selectedOption) return

        if ("isCreate" in selectedOption) {
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
      e.preventDefault()
      handleCancelAdding()
    }
  }

  const handleInputBlur = (e: React.FocusEvent) => {
    // Check if this blur is due to escape key or clicking outside
    // If there's no relatedTarget, it's likely due to escape key or tabbing away
    if (!e.relatedTarget) {
      handleCancelAdding()
    }

    // Always close the popover on blur
    setTimeout(() => {
      setInputFocus(false)
    }, 0)
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
        <Popover open={inputFocus}>
          <PopoverTrigger asChild>
            <div className="flex-1">
              <Input
                ref={inputRef}
                placeholder={t("labels.searchPlaceholder", "Search or create labels...")}
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-sm h-9"
                data-testid="label-input"
                onBlur={handleInputBlur}
                onFocus={() => setInputFocus(true)}
                autoFocus={inputFocus}
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
                    {filteredLabels.map((label, index) => (
                      <CommandItem
                        key={label.id}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          handleAddLabel(label.name)
                        }}
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
                    <CommandItem
                      disabled={!newLabel.trim()}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        handleAddLabel()
                      }}
                      className={cn(
                        "flex items-center gap-2 cursor-pointer",
                        selectedIndex === filteredLabels.length && "bg-accent",
                      )}
                    >
                      <Plus className="h-3 w-3 mr-2" />
                      {t("labels.createLabel", 'Create "{{name}}"', { name: newLabel.trim() })}
                    </CommandItem>
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
