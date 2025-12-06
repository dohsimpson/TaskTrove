"use client"

import type React from "react"
import { useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { VIEW_CONFIG_OPTIONS } from "@tasktrove/constants"
import {
  currentViewAtom,
  currentViewStateAtom,
  setViewOptionsAtom,
} from "@tasktrove/atoms/ui/views"
import { currentRouteContextAtom } from "@tasktrove/atoms/ui/navigation"
import { showTaskPanelAtom } from "@tasktrove/atoms/ui/dialogs"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Settings2,
  Calendar,
  Columns3,
  ListTodo,
  SidebarOpen,
  Minimize2,
  CheckSquare,
  AlertTriangle,
  Table,
  ChartNoAxesCombined,
} from "lucide-react"
import { HelpPopover } from "@/components/ui/help-popover"
import { ButtonGroup } from "@/components/ui/button-group"
import { cn } from "@/lib/utils"
import { useTranslation } from "@tasktrove/i18n"
import { isPro } from "@/lib/utils/env"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
interface ViewOptionsContentProps {
  onAdvancedSearch?: () => void
}

export function ViewOptionsContent({ onAdvancedSearch }: ViewOptionsContentProps) {
  void onAdvancedSearch // Mark as intentionally unused
  // Translation setup
  const { t } = useTranslation("layout")

  const currentView = useAtomValue(currentViewAtom)
  const viewState = useAtomValue(currentViewStateAtom)
  const showTaskPanel = useAtomValue(showTaskPanelAtom)
  const setViewOptions = useSetAtom(setViewOptionsAtom)
  const routeContext = useAtomValue(currentRouteContextAtom)

  // Centralized view option configurations (excluding kanban which is handled by route type)
  const getViewConfig = (view: string) => {
    // Use centralized view configuration with fallback for unknown views
    switch (view) {
      case "today":
        return VIEW_CONFIG_OPTIONS.today
      case "inbox":
        return VIEW_CONFIG_OPTIONS.inbox
      case "upcoming":
        return VIEW_CONFIG_OPTIONS.upcoming
      case "completed":
        return VIEW_CONFIG_OPTIONS.completed
      case "all":
        return VIEW_CONFIG_OPTIONS.all
      case "calendar":
        return VIEW_CONFIG_OPTIONS.calendar
      default:
        return {
          calendarDisabled: false,
          showCompletedDisabled: false,
        }
    }
  }

  const viewConfig = getViewConfig(currentView)

  const [hoveredViewMode, setHoveredViewMode] = useState<
    "list" | "kanban" | "calendar" | "table" | "stats" | null
  >(null)

  const isKanbanDisabled = () => {
    // Kanban is only available for project views
    return routeContext.routeType !== "project"
  }

  const isCalendarDisabled = () => {
    return viewConfig.calendarDisabled
  }

  const isShowCompletedDisabled = () => {
    return viewConfig.showCompletedDisabled
  }

  const getViewModeIcon = (mode: "list" | "kanban" | "calendar" | "table" | "stats") => {
    switch (mode) {
      case "list":
        return <ListTodo className="h-4 w-4" />
      case "kanban":
        return <Columns3 className="h-4 w-4" />
      case "calendar":
        return <Calendar className="h-4 w-4" />
      case "table":
        return <Table className="h-4 w-4" />
      case "stats":
        return <ChartNoAxesCombined className="h-4 w-4" />
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b">
        <Settings2 className="h-5 w-5" />
        <h3 className="text-lg font-semibold text-foreground">
          {t("viewOptions.title", "View Options")}
        </h3>
        <HelpPopover
          title={t("viewOptions.title", "View Options")}
          content={
            <div className="space-y-3">
              <p>
                {t(
                  "viewOptions.help.description",
                  "Customize how you view and organize your tasks:",
                )}
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  <strong>{t("viewOptions.help.viewMode.label", "View Mode:")}</strong>{" "}
                  {t("viewOptions.help.viewMode.description", "Switch between different layouts")}
                </li>
                <li>
                  <strong>{t("viewOptions.help.displayOptions.label", "Display Options:")}</strong>{" "}
                  {t(
                    "viewOptions.help.displayOptions.description",
                    "Toggle completed tasks, side panel, and compact view",
                  )}
                </li>
                <li>
                  <strong>{t("viewOptions.help.sortFilter.label", "Sort & Filter:")}</strong>{" "}
                  {t(
                    "viewOptions.help.sortFilter.description",
                    "Organize tasks by priority, due date, or other criteria",
                  )}
                </li>
                <li>
                  <strong>
                    {t("viewOptions.help.advancedFilters.label", "Advanced Filters:")}
                  </strong>{" "}
                  {t(
                    "viewOptions.help.advancedFilters.description",
                    "Access powerful filtering options for complex queries",
                  )}
                </li>
              </ul>
              <div className="mt-3 p-2 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  <strong>{t("viewOptions.help.tip.label", "Tip:")}</strong>{" "}
                  {t(
                    "viewOptions.help.tip.description",
                    "Your view preferences are saved per route and will persist between sessions.",
                  )}
                </p>
              </div>
            </div>
          }
          align="start"
        />
      </div>
      <div className="space-y-4 pt-4">
        {/* View Mode Section */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {t("viewOptions.viewMode.label", "View Mode")}
          </Label>
          <TooltipProvider delayDuration={150} skipDelayDuration={300}>
            <ButtonGroup className="w-full flex-nowrap overflow-hidden">
              {[
                {
                  mode: "list" as const,
                  label: t("viewOptions.viewMode.list", "List"),
                },
                {
                  mode: "kanban" as const,
                  label: t("viewOptions.viewMode.kanban", "Kanban"),
                },
                {
                  mode: "calendar" as const,
                  label: t("viewOptions.viewMode.calendar", "Calendar"),
                },
                ...(isPro()
                  ? [
                      {
                        mode: "table" as const,
                        label: t("viewOptions.viewMode.table", "Table"),
                      },
                      {
                        mode: "stats" as const,
                        label: t("viewOptions.viewMode.stats", "Stats"),
                      },
                    ]
                  : []),
              ].map(({ mode, label }) => {
                const disabled =
                  (mode === "kanban" && isKanbanDisabled()) ||
                  (mode === "calendar" && isCalendarDisabled())
                const isExpanded = hoveredViewMode === mode
                const flexGrowValue = hoveredViewMode ? (isExpanded ? 2.8 : 0.55) : 1
                const showKanbanTooltip = disabled && mode === "kanban"

                const button = (
                  <Button
                    key={mode}
                    variant={viewState.viewMode === mode ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (disabled) return
                      setViewOptions({ viewMode: mode })
                    }}
                    onMouseEnter={() => setHoveredViewMode(mode)}
                    onMouseLeave={() => setHoveredViewMode(null)}
                    onFocus={() => setHoveredViewMode(mode)}
                    onBlur={() => setHoveredViewMode(null)}
                    aria-disabled={disabled}
                    tabIndex={disabled ? -1 : undefined}
                    aria-label={label}
                    title={label}
                    data-expanded={isExpanded}
                    data-disabled={disabled ? "true" : undefined}
                    className={cn(
                      "group/view-mode relative overflow-hidden px-3 py-1 justify-center capitalize shrink basis-0",
                      "transition-[color,background,box-shadow] duration-200 ease-out",
                      disabled &&
                        "bg-muted text-muted-foreground border border-muted/70 cursor-not-allowed [&_svg]:text-muted-foreground [&_span[data-slot=view-label]]:text-muted-foreground",
                    )}
                    style={{
                      flexGrow: flexGrowValue,
                      flexBasis: 0,
                      transition:
                        "flex-grow 100ms ease, background-color 150ms ease, color 150ms ease",
                    }}
                  >
                    <span className="flex items-center justify-center gap-1.5 overflow-hidden">
                      <span className="inline-flex w-4 shrink-0 justify-center">
                        {getViewModeIcon(mode)}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-medium text-current",
                          "whitespace-nowrap max-w-0 opacity-0 -translate-x-1",
                          "transition-all duration-200 ease-out",
                          "group-hover/view-mode:max-w-[200px] group-hover/view-mode:opacity-100 group-hover/view-mode:translate-x-0 group-hover/view-mode:ml-1",
                          "group-focus-visible/view-mode:max-w-[200px] group-focus-visible/view-mode:opacity-100 group-focus-visible/view-mode:translate-x-0 group-focus-visible/view-mode:ml-1",
                          "group-data-[expanded=true]/view-mode:max-w-[200px] group-data-[expanded=true]/view-mode:opacity-100 group-data-[expanded=true]/view-mode:translate-x-0 group-data-[expanded=true]/view-mode:ml-1",
                          viewState.viewMode === mode && "text-primary-foreground",
                        )}
                        data-slot="view-label"
                      >
                        {label}
                      </span>
                    </span>
                  </Button>
                )

                if (showKanbanTooltip) {
                  return (
                    <Tooltip key={mode} delayDuration={150}>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent side="bottom" align="center">
                        {t("viewOptions.viewMode.kanbanTooltip", "Only available for projects")}
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return button
              })}
            </ButtonGroup>
          </TooltipProvider>
        </div>

        <Separator />

        {/* Display Options Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">
              {t("viewOptions.displayOptions.label", "Display Options")}
            </Label>
            <HelpPopover
              title={t("viewOptions.displayOptions.label", "Display Options")}
              content={
                <div className="space-y-3">
                  <p>
                    {t(
                      "viewOptions.displayOptions.help.description",
                      "Control what's visible in your task view:",
                    )}
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      <strong>
                        {t("viewOptions.displayOptions.completed.label", "Completed Tasks:")}
                      </strong>{" "}
                      {t(
                        "viewOptions.displayOptions.completed.description",
                        "Show or hide tasks that have been completed",
                      )}
                    </li>
                    <li>
                      <strong>
                        {t("viewOptions.displayOptions.overdue.label", "Overdue Tasks:")}
                      </strong>{" "}
                      {t(
                        "viewOptions.displayOptions.overdue.description",
                        "Show or hide tasks that are past their due date",
                      )}
                    </li>
                    <li>
                      <strong>
                        {t("viewOptions.displayOptions.sidePanel.label", "Side Panel:")}
                      </strong>{" "}
                      {t(
                        "viewOptions.displayOptions.sidePanel.description",
                        "Toggle the side panel for additional task details",
                      )}
                    </li>
                    <li>
                      <strong>
                        {t("viewOptions.displayOptions.compact.label", "Compact View:")}
                      </strong>{" "}
                      {t(
                        "viewOptions.displayOptions.compact.description",
                        "Use a more condensed layout to fit more tasks on screen",
                      )}
                    </li>
                  </ul>
                  <div className="mt-3 p-2 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">
                      💡{" "}
                      {t(
                        "viewOptions.displayOptions.help.tip",
                        "Tip: These settings are saved per view and will persist between sessions",
                      )}
                    </p>
                  </div>
                </div>
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-completed" className="text-sm font-medium flex items-center gap-2">
              <CheckSquare className="h-3 w-3" />
              {t("viewOptions.displayOptions.completed.title", "Completed Tasks")}
            </Label>
            <Switch
              id="show-completed"
              checked={viewState.showCompleted}
              onCheckedChange={(checked) => setViewOptions({ showCompleted: checked })}
              disabled={isShowCompletedDisabled()}
              className="cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-overdue" className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-3 w-3" />
              {t("viewOptions.displayOptions.overdue.title", "Overdue Tasks")}
            </Label>
            <Switch
              id="show-overdue"
              checked={viewState.showOverdue}
              onCheckedChange={(checked) => setViewOptions({ showOverdue: checked })}
              className="cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label
              htmlFor="show-side-panel"
              className="text-sm font-medium flex items-center gap-2"
            >
              <SidebarOpen className="h-3 w-3" />
              {t("viewOptions.displayOptions.sidePanel.title", "Side Panel")}
            </Label>
            <Switch
              id="show-side-panel"
              checked={showTaskPanel || viewState.showSidePanel}
              onCheckedChange={(checked) => setViewOptions({ showSidePanel: checked })}
              className="cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="compact-view" className="text-sm font-medium flex items-center gap-2">
              <Minimize2 className="h-3 w-3" />
              {t("viewOptions.displayOptions.compact.title", "Compact View")}
            </Label>
            <Switch
              id="compact-view"
              checked={viewState.compactView}
              onCheckedChange={(checked) => setViewOptions({ compactView: checked })}
              className="cursor-pointer"
            />
          </div>
        </div>
      </div>
    </>
  )
}
