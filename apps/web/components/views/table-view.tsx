"use client"

import type { RouteContext } from "@tasktrove/atoms/ui/navigation"
import type { Task, Project, ViewState } from "@tasktrove/types/core"

interface TableViewProps {
  tasks: Task[]
  project?: Project
  routeContext: RouteContext
  viewState: ViewState
}

export function TableView({
  tasks: _tasks,
  project: _project,
  routeContext: _routeContext,
  viewState: _viewState,
}: TableViewProps) {
  void _tasks
  void _project
  void _routeContext
  void _viewState

  return null
}
