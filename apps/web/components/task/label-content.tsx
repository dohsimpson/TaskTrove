"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useAtomValue } from "jotai"
import { Plus, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { labelsAtom } from "@tasktrove/atoms/data/base/atoms"
import { labelsFromIdsAtom } from "@tasktrove/atoms/core/labels"
import { useTranslation } from "@tasktrove/i18n"
import type { Task } from "@tasktrove/types/core"
import type { LabelId } from "@tasktrove/types/id"

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

  const [open, setOpen] = useState(Boolean(focusInput))
  const [search, setSearch] = useState("")
  const isMobile = useIsMobile()

  const getLabelsFromIds = useAtomValue(labelsFromIdsAtom)
  const allLabels = useAtomValue(labelsAtom)

  // For quick-add mode, task might not be provided, so use empty array as fallback
  const taskLabelIds = useMemo(() => task?.labels || [], [task?.labels])
  const taskLabels = task ? getLabelsFromIds(task.labels) : []

  const availableLabels = useMemo(
    () => allLabels.filter((label) => !taskLabelIds.includes(label.id)),
    [allLabels, taskLabelIds],
  )

  const filteredLabels = useMemo(() => {
    const term = search.toLowerCase().trim()
    if (!term) return availableLabels
    return availableLabels.filter((label) => label.name.toLowerCase().includes(term))
  }, [availableLabels, search])

  const canCreate =
    Boolean(search.trim()) &&
    !availableLabels.some((label) => label.name.toLowerCase() === search.trim().toLowerCase())

  useEffect(() => {
    onAddingChange?.(open)
    if (!open) {
      setSearch("")
    }
  }, [open, onAddingChange])

  useEffect(() => {
    if (focusInput) setOpen(true)
  }, [focusInput])

  const handleAddLabel = (labelName?: string) => {
    const nameToUse = (labelName ?? search).trim()
    if (!nameToUse) return

    onAddLabel(nameToUse)
    setSearch("")
  }

  const handleRemoveLabel = (labelId: LabelId) => {
    onRemoveLabel(labelId)
  }

  return (
    <div className={cn("space-y-2", mode === "popover" && "p-2", className)}>
      <div className="flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5">
        {taskLabels.map((label) => (
          <Badge
            key={label.id}
            variant="secondary"
            className="gap-1 rounded-md px-2 py-1 text-xs font-normal"
            style={{
              backgroundColor: `${label.color}15`,
              color: label.color,
              borderColor: `${label.color}30`,
            }}
          >
            <div className="size-2 rounded-full" style={{ backgroundColor: label.color }} />
            <span>{label.name}</span>
            <button
              onClick={() => handleRemoveLabel(label.id)}
              className="rounded-sm p-0.5 hover:bg-black/10"
              aria-label={t("labels.removeLabel", "Remove label")}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              data-testid="label-submit-button"
            >
              <Plus className="size-3.5" />
              <span>{t("labels.addLabel", "Add label")}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[260px] p-0"
            align="start"
            side="bottom"
            sideOffset={6}
            // Keep the popover pinned to the trigger while surrounding layouts animate
            updatePositionStrategy="always"
            data-testid="popover-content"
          >
            <Command>
              <CommandInput
                placeholder={t("labels.searchPlaceholder", "Search or create labels...")}
                value={search}
                onValueChange={setSearch}
                className="h-10 text-sm"
                data-testid="label-input"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault()
                    setOpen(false)
                  }
                }}
              />
              <CommandList data-testid="command">
                <CommandEmpty className="py-6 text-center text-sm">
                  {t("labels.noMatches", "No labels found")}
                </CommandEmpty>
                <CommandGroup>
                  {filteredLabels.map((label) => (
                    <CommandItem
                      key={label.id}
                      value={label.name}
                      onSelect={() => handleAddLabel(label.name)}
                      className="gap-2"
                      data-testid="command-item"
                    >
                      <div
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="truncate">{label.name}</span>
                    </CommandItem>
                  ))}
                  {canCreate && (
                    <CommandItem
                      value={search.trim()}
                      onSelect={() => handleAddLabel(search)}
                      className="gap-2"
                      data-testid="command-item"
                    >
                      <Plus className="size-3" />
                      <span>
                        {t("labels.createLabel", 'Create "{{name}}"', { name: search.trim() })}
                      </span>
                    </CommandItem>
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      {isMobile && taskLabels.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("labels.mobileHint", "Tap a tag to remove it.")}
        </p>
      )}
    </div>
  )
}
