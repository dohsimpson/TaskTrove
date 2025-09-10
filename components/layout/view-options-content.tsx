"use client"

import type React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { VIEW_CONFIG_OPTIONS } from "@/lib/constants/defaults"
import { currentViewAtom, currentViewStateAtom, setViewOptionsAtom } from "@/lib/atoms/ui/views"
import { currentRouteContextAtom } from "@/lib/atoms/ui/navigation"
import { showTaskPanelAtom } from "@/lib/atoms/ui/dialogs"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Settings2,
  Calendar,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  Columns3,
  ListTodo,
  SidebarOpen,
  Minimize2,
  CheckSquare,
} from "lucide-react"
import { HelpPopover } from "@/components/ui/help-popover"
import { ComingSoonWrapper } from "@/components/ui/coming-soon-wrapper"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"

interface ViewOptionsContentProps {
  onAdvancedSearch?: () => void
}

export function ViewOptionsContent({}: ViewOptionsContentProps) {
  const currentView = useAtomValue(currentViewAtom)
  const viewState = useAtomValue(currentViewStateAtom)
  const showTaskPanel = useAtomValue(showTaskPanelAtom)
  const setViewOptions = useSetAtom(setViewOptionsAtom)
  const routeContext = useAtomValue(currentRouteContextAtom)

  // Centralized view option configurations (excluding kanban which is handled by route type)
  const getViewConfig = (view: string) => {
    const defaultConfig = {
      calendarDisabled: false,
      showCompletedDisabled: false,
    }

    // Use centralized view configuration or default config
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return VIEW_CONFIG_OPTIONS[view as keyof typeof VIEW_CONFIG_OPTIONS] || defaultConfig
  }

  const viewConfig = getViewConfig(currentView)

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

  const getViewModeIcon = (mode: "list" | "kanban" | "calendar") => {
    switch (mode) {
      case "list":
        return <ListTodo className="h-4 w-4" />
      case "kanban":
        return <Columns3 className="h-4 w-4" />
      case "calendar":
        return <Calendar className="h-4 w-4" />
    }
  }

  return (
    <TooltipProvider delayDuration={0}>
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b">
        <Settings2 className="h-5 w-5" />
        <h3 className="text-lg font-semibold text-foreground">View Options</h3>
        <HelpPopover
          title="View Options"
          content={
            <div className="space-y-3">
              <p>Customize how you view and organize your tasks:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  <strong>View Mode:</strong> Switch between list, kanban board, and calendar
                  layouts
                </li>
                <li>
                  <strong>Display Options:</strong> Toggle completed tasks, side panel, and compact
                  view
                </li>
                <li>
                  <strong>Sort & Filter:</strong> Organize tasks by priority, due date, or other
                  criteria
                </li>
                <li>
                  <strong>Advanced Filters:</strong> Access powerful filtering options for complex
                  queries
                </li>
              </ul>
              <div className="mt-3 p-2 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  <strong>Tip:</strong> Your view preferences are saved per route and will persist
                  between sessions.
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
          <Label className="text-sm font-medium">View Mode</Label>
          <div className="grid grid-cols-3 gap-1">
            {(
              ["list", "kanban", "calendar"] satisfies readonly ("list" | "kanban" | "calendar")[]
            ).map((mode) => {
              const disabled =
                (mode === "kanban" && isKanbanDisabled()) ||
                (mode === "calendar" && isCalendarDisabled())
              const isComingSoon = mode === "calendar"

              const button = (
                <Button
                  key={mode}
                  variant={viewState.viewMode === mode ? "default" : "outline"}
                  size="sm"
                  onClick={() => !isComingSoon && setViewOptions({ viewMode: mode })}
                  disabled={disabled || isComingSoon}
                  className="justify-center capitalize cursor-pointer"
                >
                  {getViewModeIcon(mode)}
                  <span className="ml-1">{mode}</span>
                </Button>
              )

              // Handle coming soon features
              if (isComingSoon) {
                return (
                  <ComingSoonWrapper key={mode} disabled={true} featureName="Calendar View">
                    {button}
                  </ComingSoonWrapper>
                )
              }

              // Handle kanban disabled state with tooltip
              if (mode === "kanban" && isKanbanDisabled()) {
                return (
                  <Tooltip key={mode}>
                    <TooltipTrigger asChild>
                      <div>{button}</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Only available for projects</p>
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return button
            })}
          </div>
        </div>

        <Separator />

        {/* Display Options Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Display Options</Label>
            <HelpPopover
              title="Display Options"
              content={
                <div className="space-y-3">
                  <p>Control what's visible in your task view:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      <strong>Completed Tasks:</strong> Show or hide tasks that have been completed
                    </li>
                    <li>
                      <strong>Side Panel:</strong> Toggle the side panel for additional task details
                    </li>
                    <li>
                      <strong>Compact View:</strong> Use a more condensed layout to fit more tasks
                      on screen
                    </li>
                  </ul>
                  <div className="mt-3 p-2 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">
                      💡 Tip: These settings are saved per view and will persist between sessions
                    </p>
                  </div>
                </div>
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-completed" className="text-sm font-medium flex items-center gap-2">
              <CheckSquare className="h-3 w-3" />
              Completed Tasks
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
            <Label
              htmlFor="show-side-panel"
              className="text-sm font-medium flex items-center gap-2"
            >
              <SidebarOpen className="h-3 w-3" />
              Side Panel
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
              Compact View
            </Label>
            <Switch
              id="compact-view"
              checked={viewState.compactView}
              onCheckedChange={(checked) => setViewOptions({ compactView: checked })}
              className="cursor-pointer"
            />
          </div>
        </div>

        <Separator />

        {/* Sort Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Sort</Label>
            <HelpPopover
              title="Sorting Options"
              content={
                <div className="space-y-3">
                  <p>Choose how to organize your tasks:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      <strong>Default (Unsorted):</strong> Shows tasks in their natural order with
                      completed tasks at the bottom
                    </li>
                    <li>
                      <strong>Due Date:</strong> Sorts all tasks by due date, mixing completed and
                      incomplete
                    </li>
                    <li>
                      <strong>Priority:</strong> Orders by priority level (1=highest, 4=lowest)
                    </li>
                    <li>
                      <strong>Title:</strong> Alphabetical sorting by task name
                    </li>
                    <li>
                      <strong>Created Date:</strong> Orders by when tasks were created
                    </li>
                    <li>
                      <strong>Status:</strong> Groups by completion status, then by kanban column
                    </li>
                  </ul>
                  <div className="mt-3 p-2 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">
                      💡 Tip: Use the arrow button to toggle between ascending and descending order
                    </p>
                  </div>
                </div>
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort-by" className="text-xs text-muted-foreground">
              Sort by
            </Label>
            <div className="flex gap-2">
              <Select
                value={viewState.sortBy}
                onValueChange={(sortBy) => setViewOptions({ sortBy })}
              >
                <SelectTrigger className="h-8 flex-1 cursor-pointer">
                  <SelectValue placeholder="Select sort option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default" className="cursor-pointer">
                    Default (Unsorted)
                  </SelectItem>
                  <SelectItem value="dueDate" className="cursor-pointer">
                    Due Date
                  </SelectItem>
                  <SelectItem value="priority" className="cursor-pointer">
                    Priority
                  </SelectItem>
                  <SelectItem value="title" className="cursor-pointer">
                    Title
                  </SelectItem>
                  <SelectItem value="createdAt" className="cursor-pointer">
                    Created Date
                  </SelectItem>
                  <SelectItem value="status" className="cursor-pointer">
                    Status
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 cursor-pointer"
                onClick={() =>
                  setViewOptions({
                    sortDirection: viewState.sortDirection === "asc" ? "desc" : "asc",
                  })
                }
                title={
                  viewState.sortDirection === "asc" ? "Change to Descending" : "Change to Ascending"
                }
              >
                {viewState.sortDirection === "asc" ? (
                  <ArrowUpNarrowWide className="h-3 w-3" />
                ) : (
                  <ArrowDownWideNarrow className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
