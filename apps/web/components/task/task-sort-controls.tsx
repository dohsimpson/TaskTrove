"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowUpDown, ArrowUpNarrowWide } from "lucide-react"
import { useTranslation } from "@tasktrove/i18n"
import {
  currentViewStateAtom,
  getViewStateAtom,
  setViewOptionsAtom,
  updateViewStateAtom,
} from "@tasktrove/atoms/ui/views"
import type { ViewId } from "@tasktrove/types/id"
import { cn } from "@/lib/utils"

interface TaskSortControlsProps {
  className?: string
  viewId?: ViewId
}

const SORT_OPTIONS: Array<{ value: string; labelKey: string; fallback: string }> = [
  {
    value: "default",
    labelKey: "viewOptions.sort.options.default",
    fallback: "Default (Unsorted)",
  },
  { value: "dueDate", labelKey: "viewOptions.sort.options.dueDate", fallback: "Due Date" },
  { value: "priority", labelKey: "viewOptions.sort.options.priority", fallback: "Priority" },
  { value: "title", labelKey: "viewOptions.sort.options.title", fallback: "Title" },
  { value: "createdAt", labelKey: "viewOptions.sort.options.createdAt", fallback: "Created Date" },
]

/**
 * Sorting controls shared across project views.
 * Renders a compact icon trigger with dropdown options and direction selector.
 */
export function TaskSortControls({ className, viewId }: TaskSortControlsProps) {
  const { t } = useTranslation("layout")
  const viewStateAtom = useMemo(
    () => (viewId ? getViewStateAtom(viewId) : currentViewStateAtom),
    [viewId],
  )
  const viewState = useAtomValue(viewStateAtom)
  const setViewOptions = useSetAtom(setViewOptionsAtom)
  const updateViewState = useSetAtom(updateViewStateAtom)
  const [rotation, setRotation] = useState(0)
  const prevDirection = useRef(viewState.sortDirection)

  useEffect(() => {
    if (prevDirection.current !== viewState.sortDirection) {
      setRotation((value) => value + 180)
      prevDirection.current = viewState.sortDirection
    }
  }, [viewState.sortDirection])

  const hasCustomSort = viewState.sortBy !== "default" || viewState.sortDirection !== "asc"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("relative h-9 w-9 p-0", className)}
          aria-label={t("viewOptions.sort.label", { defaultValue: "Sort" })}
        >
          <ArrowUpDown className="h-4 w-4" />
          {hasCustomSort && (
            <span
              className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-foreground"
              data-testid="sort-indicator-dot"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">
            {t("viewOptions.sort.label", { defaultValue: "Sort" })}
          </DropdownMenuLabel>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center rounded-sm px-1.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label={t("viewOptions.sort.direction.label", { defaultValue: "Sort Direction" })}
              onClick={() => {
                const nextDirection = viewState.sortDirection === "asc" ? "desc" : "asc"
                if (viewId) {
                  updateViewState({ viewId, updates: { sortDirection: nextDirection } })
                  return
                }
                setViewOptions({ sortDirection: nextDirection })
              }}
            >
              <ArrowUpNarrowWide
                className="h-4 w-4 transition-transform duration-200"
                style={{ transform: `rotate(${rotation}deg)` }}
                aria-hidden="true"
              />
            </button>
            <DropdownMenuItem
              className="h-auto px-2 py-1 text-xs underline-offset-2 hover:underline focus:bg-transparent cursor-pointer"
              onClick={() => {
                if (viewId) {
                  updateViewState({
                    viewId,
                    updates: { sortBy: "default", sortDirection: "asc" },
                  })
                  return
                }
                setViewOptions({ sortBy: "default", sortDirection: "asc" })
              }}
            >
              {t("viewOptions.sort.reset", { defaultValue: "Reset" })}
            </DropdownMenuItem>
          </div>
        </div>
        <DropdownMenuRadioGroup
          value={viewState.sortBy}
          onValueChange={(sortBy) =>
            viewId ? updateViewState({ viewId, updates: { sortBy } }) : setViewOptions({ sortBy })
          }
        >
          {SORT_OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="cursor-pointer"
            >
              {t(option.labelKey, { defaultValue: option.fallback })}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
