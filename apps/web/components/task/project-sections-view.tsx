"use client"

import { useState } from "react"
import { useSetAtom, useAtomValue } from "jotai"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
// TaskItem is now used internally by VirtualizedTaskList
// CompactTaskItem functionality is now integrated into TaskItem with variant="compact"
import { TaskSidePanel } from "./task-side-panel"
import { AddSectionDivider } from "./add-section-divider"
import { SelectionToolbar } from "./selection-toolbar"
import { ProjectViewToolbar } from "./project-view-toolbar"
import { Section } from "./section"
import {
  projectAtoms,
  projectsAtom,
  filteredTasksAtom,
  currentViewStateAtom,
  selectedTaskAtom,
  setViewOptionsAtom,
  sidePanelWidthAtom,
  updateGlobalViewOptionsAtom,
} from "@tasktrove/atoms"
import { SIDE_PANEL_WIDTH_MIN, SIDE_PANEL_WIDTH_MAX } from "@tasktrove/constants"
import { currentRouteContextAtom } from "@tasktrove/atoms"
import type { Task, Project, ProjectSection } from "@/lib/types"
import { createGroupId } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ColorPicker } from "@/components/ui/custom/color-picker"
import { X } from "lucide-react"
import { log } from "@/lib/utils/logger"
import { useIsMobile } from "@/hooks/use-mobile"
import { VirtualizedTaskList } from "./virtualized-task-list"
import { ProjectSectionDebugBadge } from "@/components/debug"

// Constants - removed SIDE_PANEL_WIDTH since it's now handled by ResizablePanel

interface ProjectSectionsViewProps {
  /** Unique identifier for drag-and-drop operations */
  droppableId: string
  /**
   * Controls whether section management UI is shown
   * - true: Full section support (add, rename, delete, drag between sections)
   * - false: Flat list mode (no section UI, behaves like a simple task list)
   *
   * When false, this component renders as a flat task list identical to the
   * previous TaskListWithPanel behavior, ensuring consistent UX across all views.
   */
  supportsSections?: boolean
}

/**
 * Unified task list component that supports both sectioned and flat list views.
 *
 * This component serves as the single task display component for all views in TaskTrove:
 * - Project views: Uses supportsSections=true for full section management
 * - Inbox/Today/Upcoming/Completed views: Uses supportsSections=false for flat lists
 * - Label views: Uses supportsSections=false for simple task organization
 *
 * Key Features:
 * - Drag-and-drop task reordering and cross-section movement
 * - Collapsible sections with task counts (when supportsSections=true)
 * - Inline section creation, renaming, and deletion (when supportsSections=true)
 * - Side panel integration for detailed task editing
 * - Compact and normal view modes
 * - Keyboard shortcuts for section management
 * - Responsive design with mobile gesture support
 *
 * The component automatically adapts its behavior based on the supportsSections prop:
 * - When supportsSections=false: Renders as a clean flat list without any section UI
 * - When supportsSections=true: Shows full section management capabilities
 *
 * This unified approach ensures consistent drag-and-drop behavior, keyboard shortcuts,
 * and task interactions across all views while eliminating code duplication.
 */
export function ProjectSectionsView({
  droppableId,
  supportsSections = true,
}: ProjectSectionsViewProps) {
  // Get data from atoms
  const tasks = useAtomValue(filteredTasksAtom)
  const currentViewState = useAtomValue(currentViewStateAtom)
  const routeContext = useAtomValue(currentRouteContextAtom)
  const allProjects = useAtomValue(projectsAtom)
  const selectedTask = useAtomValue(selectedTaskAtom)

  // Get project from route context
  const project =
    routeContext.routeType === "project"
      ? allProjects.find((p: Project) => p.id === routeContext.viewId)
      : undefined

  // Extract view state
  const { showSidePanel, compactView } = currentViewState
  const isMobile = useIsMobile()

  // Get sorted task IDs for flat list view (when supportsSections is false)
  const sortedFlatTaskIds = tasks.map((task: Task) => task.id)

  // Atom actions
  const setViewOptions = useSetAtom(setViewOptionsAtom)
  const [isAddingSection, setIsAddingSection] = useState(false)
  const [addingSectionPosition, setAddingSectionPosition] = useState<number | undefined>(undefined)
  const [newSectionName, setNewSectionName] = useState("")
  const [newSectionColor, setNewSectionColor] = useState("#3b82f6")
  // Panel width state (global, persisted in localStorage)
  const sidePanelWidth = useAtomValue(sidePanelWidthAtom)
  const updateGlobalViewOptions = useSetAtom(updateGlobalViewOptionsAtom)

  // Update panel width when resized
  const handlePanelResize = (sizes: number[]) => {
    if (sizes.length >= 2 && sizes[1] !== undefined) {
      const panelWidth = sizes[1] // Second panel is the side panel
      updateGlobalViewOptions({ sidePanelWidth: panelWidth })
    }
  }

  // Jotai actions
  const addSection = useSetAtom(projectAtoms.actions.addSection)

  const handleAddSection = () => {
    if (newSectionName.trim() && project && supportsSections) {
      try {
        const sectionName = newSectionName.trim()

        // Check if section already exists
        if (project.sections.some((s: ProjectSection) => s.name === sectionName)) {
          log.error(
            { module: "projects", projectId: project.id, sectionName },
            `Section "${sectionName}" already exists`,
          )
          return
        }

        addSection({
          projectId: project.id,
          sectionName,
          color: newSectionColor,
          position: addingSectionPosition,
        })
        setNewSectionName("")
        setNewSectionColor("#3b82f6")
        setIsAddingSection(false)
        setAddingSectionPosition(undefined)
      } catch (error) {
        log.error(
          {
            module: "projects",
            projectId: project.id,
            sectionName: newSectionName,
            error: error instanceof Error ? error.message : String(error),
          },
          "Failed to add section",
        )
        // TODO: Add error handling/toast notification
      }
    }
  }

  const handleCancelAddSection = () => {
    setNewSectionName("")
    setNewSectionColor("#3b82f6")
    setIsAddingSection(false)
    setAddingSectionPosition(undefined)
  }

  const handleStartAddSection = (position?: number) => {
    if (!supportsSections) return
    setIsAddingSection(true)
    setAddingSectionPosition(position)
  }

  // Side panel view state is the single source of truth for panel visibility
  const isPanelOpen = showSidePanel && Boolean(selectedTask)

  // handleTaskClick is now handled directly by TaskItem using atoms

  const handleClosePanel = () => {
    // Simply disable the side panel view option - this will sync everything
    setViewOptions({ showSidePanel: false })
  }

  // Get sections from project
  // Projects are guaranteed to have at least one section after v0.8.0 migration
  const sectionsToShow = project ? [...project.sections] : []

  // Render content component for both sectioned and non-sectioned views
  const renderContent = () => {
    // When supportsSections is false, always render as a flat list
    if (!supportsSections) {
      return (
        <div className="px-4 py-3">
          {/* Selection Toolbar - Full Width */}
          <SelectionToolbar />

          {/* Filter Controls, Search Input and Add Task Button - Full Width */}
          <ProjectViewToolbar className="mb-3" />

          {/* Centered Task Content */}
          <div className="flex justify-center">
            <div className="w-full max-w-screen-2xl">
              {/* Flat Task List without sections */}
              <VirtualizedTaskList
                tasks={tasks}
                variant={compactView ? "compact" : "default"}
                sortedTaskIds={sortedFlatTaskIds}
                enableDropTargets={false}
              />
            </div>
          </div>
        </div>
      )
    }

    // Sectioned view
    return (
      <div className="px-4 py-3">
        {/* Selection Toolbar - Full Width */}
        <SelectionToolbar />

        {/* Filter Controls, Search Input and Add Task Button - Full Width */}
        <ProjectViewToolbar className="mb-3" />

        {/* Debug Badge */}
        {project && <ProjectSectionDebugBadge project={project} />}

        {/* Centered Task Content */}
        <div className="flex justify-center">
          <div className="w-full max-w-screen-2xl">
            {sectionsToShow.map((section, index) => (
              <div key={section.id}>
                {/* Show add section input if this is the position being added */}
                {isAddingSection && addingSectionPosition === index && (
                  <div className="border border-border rounded-lg p-3 bg-card shadow-sm mb-4">
                    <div className="space-y-3">
                      <Input
                        value={newSectionName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewSectionName(e.target.value)
                        }
                        placeholder="Section name..."
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === "Enter") {
                            handleAddSection()
                          } else if (e.key === "Escape") {
                            handleCancelAddSection()
                          }
                        }}
                        className="text-sm"
                        autoFocus
                      />
                      <ColorPicker
                        selectedColor={newSectionColor}
                        onColorSelect={setNewSectionColor}
                        size="sm"
                        label="Color"
                        className="text-xs"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleAddSection}
                          size="sm"
                          variant="default"
                          disabled={!newSectionName.trim()}
                          className="px-3"
                        >
                          Add
                        </Button>
                        <Button
                          onClick={handleCancelAddSection}
                          variant="ghost"
                          size="sm"
                          className="px-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {project && (
                  <Section
                    sectionId={createGroupId(section.id)}
                    projectId={project.id}
                    droppableId={droppableId}
                  />
                )}

                {/* Add section divider after each section */}
                {/* {supportsSections && ( */}
                {/*   <AddSectionDivider */}
                {/*     onAddSection={handleStartAddSection} */}
                {/*     position={index + 1} */}
                {/*     className="mt-2" */}
                {/*   /> */}
                {/* )} */}
              </div>
            ))}

            {/* Show add section input if this is the position being added (at the end) */}
            {isAddingSection && addingSectionPosition === sectionsToShow.length && (
              <div className="border border-border rounded-lg p-3 bg-card shadow-sm">
                <div className="space-y-3">
                  <Input
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="Section name..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddSection()
                      } else if (e.key === "Escape") {
                        handleCancelAddSection()
                      }
                    }}
                    className="text-sm"
                    autoFocus
                  />
                  <ColorPicker
                    selectedColor={newSectionColor}
                    onColorSelect={setNewSectionColor}
                    size="sm"
                    label="Color"
                    className="text-xs"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddSection}
                      size="sm"
                      variant="default"
                      disabled={!newSectionName.trim()}
                      className="px-3"
                    >
                      Add
                    </Button>
                    <Button
                      onClick={handleCancelAddSection}
                      variant="ghost"
                      size="sm"
                      className="px-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {sectionsToShow.length === 0 && !isAddingSection && (
              <div>
                <AddSectionDivider
                  onAddSection={handleStartAddSection}
                  position={0}
                  className="mt-2"
                />

                <div className="border border-border rounded-lg p-8 bg-card">
                  <div className="text-center text-muted-foreground">
                    <p className="text-lg font-medium mb-2">No sections in this project</p>
                    <p className="text-sm">All tasks will appear in the main project view</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Mobile always uses the original layout with drawer
  if (isMobile) {
    return (
      <div className="flex flex-1 relative">
        {/* Main Content */}
        <div className="flex-1">{renderContent()}</div>

        {/* Task Side Panel (mobile drawer) */}
        <TaskSidePanel isOpen={isPanelOpen} onClose={handleClosePanel} />
      </div>
    )
  }

  // Desktop: Use ResizablePanel layout when side panel is open, fallback to original when closed
  if (isPanelOpen) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <ResizablePanelGroup
          direction="horizontal"
          className="flex-1 min-h-0"
          onLayout={handlePanelResize}
        >
          {/* Main Content Panel */}
          <ResizablePanel
            defaultSize={100 - sidePanelWidth}
            minSize={SIDE_PANEL_WIDTH_MIN}
            maxSize={SIDE_PANEL_WIDTH_MAX}
          >
            <div className="h-full overflow-auto">{renderContent()}</div>
          </ResizablePanel>

          {/* Resizable Handle */}
          <ResizableHandle withHandle={false} />

          {/* Side Panel */}
          <ResizablePanel
            defaultSize={sidePanelWidth}
            minSize={SIDE_PANEL_WIDTH_MIN}
            maxSize={SIDE_PANEL_WIDTH_MAX}
          >
            <div className="h-full">
              <TaskSidePanel isOpen={isPanelOpen} onClose={handleClosePanel} variant="resizable" />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    )
  }

  // Desktop: Original layout when panel is closed
  return (
    <div className="flex flex-1 relative h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">{renderContent()}</div>

      {/* Task Side Panel (will not render when closed) */}
      <TaskSidePanel isOpen={isPanelOpen} onClose={handleClosePanel} />
    </div>
  )
}
