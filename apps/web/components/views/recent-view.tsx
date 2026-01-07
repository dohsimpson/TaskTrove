"use client"

import { useMemo } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Settings } from "lucide-react"
import { StandardTaskListView } from "@/components/views/task-list-view"
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
import { globalViewOptionsAtom, updateGlobalViewOptionsAtom } from "@tasktrove/atoms/ui/views"
import { useTranslation } from "@tasktrove/i18n"

const RECENT_VIEW_DAY_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
]

export function RecentView() {
  const { t } = useTranslation("task")
  const globalViewOptions = useAtomValue(globalViewOptionsAtom)
  const updateGlobalViewOptions = useSetAtom(updateGlobalViewOptionsAtom)

  const recentViewDays = globalViewOptions.recentViewDays

  const toolbarExtraActions = useMemo(() => {
    const label = t("recentSettings.title", "Recent activity range")

    return {
      right: (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="shadow-sm shrink-0" aria-label={label}>
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{label}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={String(recentViewDays)}
              onValueChange={(value) => updateGlobalViewOptions({ recentViewDays: Number(value) })}
            >
              {RECENT_VIEW_DAY_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {t(`recentSettings.${option.value}`, option.label)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }
  }, [recentViewDays, t, updateGlobalViewOptions])

  return <StandardTaskListView toolbarExtraActions={toolbarExtraActions} />
}
