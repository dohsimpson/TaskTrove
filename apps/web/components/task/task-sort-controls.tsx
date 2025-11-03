"use client"
import { useAtomValue, useSetAtom } from "jotai"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowUpDown, ArrowUpNarrowWide, ArrowDownWideNarrow } from "lucide-react"
import { useTranslation } from "@tasktrove/i18n"
import { currentViewStateAtom, setViewOptionsAtom } from "@tasktrove/atoms/ui/views"
import { cn } from "@/lib/utils"

interface TaskSortControlsProps {
  className?: string
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
  { value: "status", labelKey: "viewOptions.sort.options.status", fallback: "Status" },
]

/**
 * Sorting controls shared across project views.
 * Renders a compact icon trigger with dropdown options and direction selector.
 */
export function TaskSortControls({ className }: TaskSortControlsProps) {
  const { t } = useTranslation("layout")
  const viewState = useAtomValue(currentViewStateAtom)
  const setViewOptions = useSetAtom(setViewOptionsAtom)

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
        <DropdownMenuLabel>
          {t("viewOptions.sort.label", { defaultValue: "Sort" })}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={viewState.sortBy}
          onValueChange={(sortBy) => setViewOptions({ sortBy })}
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
        <DropdownMenuSeparator />
        <DropdownMenuLabel>
          {t("viewOptions.sort.direction.label", { defaultValue: "Sort Direction" })}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={viewState.sortDirection}
          onValueChange={(sortDirection) =>
            setViewOptions({
              sortDirection: sortDirection === "desc" ? "desc" : "asc",
            })
          }
        >
          <DropdownMenuRadioItem value="asc" className="cursor-pointer">
            <span className="flex items-center gap-2">
              <ArrowUpNarrowWide className="h-3 w-3" aria-hidden="true" />
              <span>{t("viewOptions.sort.direction.asc", { defaultValue: "Ascending" })}</span>
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="desc" className="cursor-pointer">
            <span className="flex items-center gap-2">
              <ArrowDownWideNarrow className="h-3 w-3" aria-hidden="true" />
              <span>{t("viewOptions.sort.direction.desc", { defaultValue: "Descending" })}</span>
            </span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
