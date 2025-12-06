"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSetAtom, useAtomValue } from "jotai"
// TaskItem is now used internally by VirtualizedTaskList
// CompactTaskItem functionality is now integrated into TaskItem with variant="compact"
import { AddSectionDivider } from "./add-section-divider"
import { SelectionToolbar } from "./selection-toolbar"
import { ProjectViewToolbar } from "./project-view-toolbar"
import { Section } from "./section"
import { projectAtoms } from "@tasktrove/atoms/core/projects"
import { projectsAtom, labelsAtom } from "@tasktrove/atoms/data/base/atoms"
import { filteredTasksAtom } from "@tasktrove/atoms/ui/filtered-tasks"
import { currentViewStateAtom } from "@tasktrove/atoms/ui/views"
import { DEFAULT_SECTION_COLOR } from "@tasktrove/constants"
import { currentRouteContextAtom } from "@tasktrove/atoms/ui/navigation"
import type { Task, Project, ProjectSection } from "@tasktrove/types/core"
import { createGroupId } from "@tasktrove/types/id"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ColorPicker } from "@/components/ui/custom/color-picker"
import { X } from "lucide-react"
import { log } from "@/lib/utils/logger"
import { VirtualizedTaskList } from "./virtualized-task-list"
import { ProjectSectionDebugBadge } from "@/components/debug"
import { ViewEmptyState } from "./view-empty-state"
import { TaskViewSidePanelLayout } from "./task-view-side-panel-layout"
import { useProjectGroupVirtualSections } from "./use-project-group-virtual-sections"

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
  /**
   * When true, project-group routes render each child project as a pseudo "section"
   * while keeping the overall view in flat mode. This enables a grouped presentation
   * without enabling full section management features.
   */
  showProjectsAsSections?: boolean
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
  showProjectsAsSections = false,
}: ProjectSectionsViewProps) {
  // Get data from atoms
  const tasks = useAtomValue(filteredTasksAtom)
  const currentViewState = useAtomValue(currentViewStateAtom)
  const routeContext = useAtomValue(currentRouteContextAtom)
  const allProjects = useAtomValue(projectsAtom)
  const allLabels = useAtomValue(labelsAtom)
  const router = useRouter()
  const { shouldShowProjectPseudoSections, currentProjectGroup, virtualProjectSections } =
    useProjectGroupVirtualSections(showProjectsAsSections)

  // Get project from route context
  const project =
    routeContext.routeType === "project"
      ? allProjects.find((p: Project) => p.id === routeContext.viewId)
      : undefined

  // Extract view state
  const { compactView } = currentViewState

  // Get sorted task IDs for flat list view (when supportsSections is false)
  const sortedFlatTaskIds = tasks.map((task: Task) => task.id)

  // Atom actions
  const [isAddingSection, setIsAddingSection] = useState(false)
  const [addingSectionPosition, setAddingSectionPosition] = useState<number | undefined>(undefined)
  const [newSectionName, setNewSectionName] = useState("")
  const [newSectionColor, setNewSectionColor] = useState(DEFAULT_SECTION_COLOR)

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
        setNewSectionColor(DEFAULT_SECTION_COLOR)
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

  // handleTaskClick is now handled directly by TaskItem using atoms

  // Get sections from project
  // Projects are guaranteed to have at least one section after v0.8.0 migration
  const sectionsToShow = project ? [...project.sections] : []

  // Render content component for both sectioned and non-sectioned views
  const renderContent = () => {
    // When supportsSections is false, always render as a flat list
    if (!supportsSections) {
      if (shouldShowProjectPseudoSections) {
        return (
          <div className="px-4">
            <div className="flex justify-center">
              <div className="w-full max-w-screen-2xl">
                <SelectionToolbar />

                <ProjectViewToolbar className="mb-3" />

                {virtualProjectSections.length === 0 ? (
                  <ViewEmptyState
                    viewId={routeContext.viewId}
                    projectName={currentProjectGroup?.name}
                    className="py-16"
                  />
                ) : (
                  <div className="space-y-6" data-testid="project-group-sections">
                    {virtualProjectSections.map((section) => (
                      <div
                        key={section.key}
                        data-testid={`project-section-${section.key}`}
                        className="rounded-xl border border-border bg-card shadow-sm"
                      >
                        <div className="flex items-center justify-between border-b border-border px-4 py-3">
                          {section.projectId ? (
                            <button
                              type="button"
                              className="flex items-center gap-3 text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
                              aria-label={`Open ${section.name}`}
                              onClick={(event) => {
                                event.stopPropagation()
                                router.push(`/projects/${section.projectId}`)
                              }}
                              data-testid="project-section-title"
                            >
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: section.color }}
                                aria-hidden="true"
                              />
                              <span>{section.name}</span>
                            </button>
                          ) : (
                            <div
                              className="flex items-center gap-3"
                              data-testid="project-section-title"
                            >
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: section.color }}
                                aria-hidden="true"
                              />
                              <span className="text-sm font-medium">{section.name}</span>
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {section.tasks.length}
                          </span>
                        </div>

                        <div className="py-3">
                          {section.tasks.length === 0 ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">
                              No tasks visible in this project
                            </div>
                          ) : (
                            <VirtualizedTaskList
                              tasks={section.tasks}
                              variant={compactView ? "compact" : "default"}
                              sortedTaskIds={section.tasks.map((task: Task) => task.id)}
                              enableDropTargets={false}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      const currentLabel =
        routeContext.routeType === "label"
          ? allLabels.find((label) => label.id === routeContext.viewId)
          : undefined

      return (
        <div className="px-4">
          {/* Centered Content Container */}
          <div className="flex justify-center">
            <div className="w-full max-w-screen-2xl">
              {/* Selection Toolbar */}
              <SelectionToolbar />

              {/* Filter Controls, Search Input and Add Task Button */}
              <ProjectViewToolbar className="mb-3" />

              {/* Flat Task List without sections */}
              {tasks.length === 0 ? (
                <ViewEmptyState
                  viewId={routeContext.viewId}
                  projectName={project?.name}
                  labelName={currentLabel?.name}
                  className="py-16"
                />
              ) : (
                <VirtualizedTaskList
                  tasks={tasks}
                  variant={compactView ? "compact" : "default"}
                  sortedTaskIds={sortedFlatTaskIds}
                  enableDropTargets={false}
                />
              )}
            </div>
          </div>
        </div>
      )
    }

    // Sectioned view
    return (
      <div className="px-4">
        {/* Centered Content Container */}
        <div className="flex justify-center">
          <div className="w-full max-w-screen-2xl">
            {/* Selection Toolbar */}
            <SelectionToolbar />

            {/* Filter Controls, Search Input and Add Task Button */}
            <ProjectViewToolbar className="mb-3" />

            {/* Debug Badge */}
            {project && <ProjectSectionDebugBadge project={project} />}
            <div className="space-y-2">
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
            </div>

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

  return (
    <TaskViewSidePanelLayout contentWrapperClassName="overflow-auto">
      {renderContent()}
    </TaskViewSidePanelLayout>
  )
}
