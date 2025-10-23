"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useAtomValue } from "jotai"
import { Search, Check, Circle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { tasksAtom } from "@tasktrove/atoms/data/base/atoms"
import { useTranslation } from "@tasktrove/i18n"
import type { TaskId } from "@/lib/types"

interface TaskSearchContentProps {
  onTaskSelect: (taskId: TaskId) => void
  mode?: "single" | "multiple"
  selectedTaskIds?: TaskId[]
  excludeTaskIds?: TaskId[]
  placeholder?: string
  onClose?: () => void
  focusInput?: boolean
}

export function TaskSearchContent({
  onTaskSelect,
  mode = "single",
  selectedTaskIds = [],
  excludeTaskIds = [],
  placeholder,
  onClose,
  focusInput = true,
}: TaskSearchContentProps) {
  const { t } = useTranslation("task")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const commandRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const allTasks = useAtomValue(tasksAtom)

  // Filter tasks based on search term and exclusions
  const filteredTasks = React.useMemo(() => {
    let filtered = allTasks

    // Exclude specified tasks
    if (excludeTaskIds.length > 0) {
      filtered = filtered.filter((task) => !excludeTaskIds.includes(task.id))
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(term) || task.description?.toLowerCase().includes(term),
      )
    }

    return filtered
  }, [allTasks, excludeTaskIds, searchTerm])

  // Reset selected index when search results change
  useEffect(() => {
    setSelectedIndex(filteredTasks.length > 0 ? 0 : -1)
  }, [filteredTasks])

  // Focus input on mount if requested
  useEffect(() => {
    if (focusInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [focusInput])

  const handleTaskSelect = useCallback(
    (taskId: TaskId) => {
      onTaskSelect(taskId)

      if (mode === "single") {
        onClose?.()
      }
    },
    [onTaskSelect, mode, onClose],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < filteredTasks.length) {
        const selectedTask = filteredTasks[selectedIndex]
        if (selectedTask) {
          handleTaskSelect(selectedTask.id)
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, filteredTasks.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, -1))
    } else if (e.key === "Escape") {
      onClose?.()
    }
  }

  const handleTaskClick = (taskId: TaskId) => {
    handleTaskSelect(taskId)
  }

  return (
    <div className="p-2">
      {/* Search Input */}
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder={placeholder || t("task.searchPlaceholder", "Search tasks...")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10 text-sm h-9"
          data-testid="task-search-input"
        />
      </div>

      {/* Task Results */}
      <div ref={commandRef}>
        <Command>
          <CommandList className="max-h-64">
            {filteredTasks.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {searchTerm.trim()
                  ? t("task.noSearchResults", "No tasks found")
                  : t("task.noTasksAvailable", "No tasks available")}
              </div>
            ) : (
              <CommandGroup>
                {filteredTasks.map((task, index) => {
                  const isSelected = selectedTaskIds.includes(task.id)
                  return (
                    <CommandItem
                      key={task.id}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        handleTaskClick(task.id)
                      }}
                      className={cn(
                        "flex items-center gap-3 cursor-pointer py-3 px-2",
                        selectedIndex === index && "bg-accent",
                        isSelected && "bg-muted/50",
                      )}
                    >
                      {/* Selection Indicator */}
                      <div className="flex-shrink-0">
                        {mode === "multiple" ? (
                          <div
                            className={cn(
                              "w-4 h-4 rounded border-2 flex items-center justify-center",
                              isSelected ? "bg-primary border-primary" : "border-muted-foreground",
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                        ) : (
                          <Circle
                            className={cn(
                              "h-4 w-4",
                              isSelected ? "fill-primary text-primary" : "text-muted-foreground",
                            )}
                          />
                        )}
                      </div>

                      {/* Task Content */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
                            {task.description}
                          </div>
                        )}
                      </div>

                      {/* Task Metadata */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full",
                            task.priority === 1 && "bg-red-500",
                            task.priority === 2 && "bg-orange-500",
                            task.priority === 3 && "bg-yellow-500",
                            task.priority === 4 && "bg-green-500",
                          )}
                        />
                        {task.completed && (
                          <div className="text-xs text-green-600 font-medium">✓</div>
                        )}
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </div>

      {/* Footer Actions for Multiple Mode */}
      {mode === "multiple" && selectedTaskIds.length > 0 && (
        <div className="border-t pt-2 mt-2 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {t("task.selectedCount", "{{count}} selected", { count: selectedTaskIds.length })}
          </div>
          <Button size="sm" onClick={() => onClose?.()} data-testid="task-search-confirm">
            {t("common.confirm", "Confirm")}
          </Button>
        </div>
      )}
    </div>
  )
}
