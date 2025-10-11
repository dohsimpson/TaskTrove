"use client"

import { useState, useEffect, useCallback } from "react"
import { useSetAtom, useAtomValue } from "jotai"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { type ElementDropTargetEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { extractDropPayload, calculateInsertIndex } from "@tasktrove/dom-utils"
import { TaskItem } from "./task-item"
// CompactTaskItem functionality is now integrated into TaskItem with variant="compact"
import { TaskSidePanel } from "./task-side-panel"
import { TaskShadow } from "@/components/ui/custom/task-shadow"
import { AddSectionDivider } from "./add-section-divider"
import { SelectionToolbar } from "./selection-toolbar"
import { ProjectViewToolbar } from "./project-view-toolbar"
import { useAddTaskToSection } from "@/hooks/use-add-task-to-section"
import {
  projectAtoms,
  projectsAtom,
  filteredTasksAtom,
  currentViewStateAtom,
  selectedTaskAtom,
  setViewOptionsAtom,
  collapsedSectionsAtom,
  toggleSectionCollapseAtom,
  sidePanelWidthAtom,
  updateGlobalViewOptionsAtom,
  updateProjectsAtom,
  updateTasksAtom,
} from "@tasktrove/atoms"
import { SIDE_PANEL_WIDTH_MIN, SIDE_PANEL_WIDTH_MAX } from "@tasktrove/constants"
import {
  currentRouteContextAtom,
  editingSectionIdAtom,
  stopEditingSectionAtom,
} from "@tasktrove/atoms"
import { taskAtoms } from "@tasktrove/atoms"
import type { Task, Project, ProjectSection, TaskId, ProjectId } from "@/lib/types"
import { createGroupId, createTaskId } from "@/lib/types"
import { applyViewStateFilters, sortTasksByViewState } from "@tasktrove/atoms"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EditableDiv } from "@/components/ui/custom/editable-div"
import { ColorPicker } from "@/components/ui/custom/color-picker"
import { SectionContextMenu } from "./section-context-menu"
import { ChevronDown, ChevronRight, X, Plus } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/custom/animated-collapsible"
import { log } from "@/lib/utils/logger"
import { useIsMobile } from "@/hooks/use-mobile"
import { DEFAULT_UUID } from "@tasktrove/constants"
import { DropTargetElement } from "./project-sections-view-helper"
import { DraggableTaskElement } from "./draggable-task-element"

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
  const toggleSectionCollapse = useSetAtom(toggleSectionCollapseAtom)
  const collapsedSections = useAtomValue(collapsedSectionsAtom)
  const [isAddingSection, setIsAddingSection] = useState(false)
  const [addingSectionPosition, setAddingSectionPosition] = useState<number | undefined>(undefined)
  const [newSectionName, setNewSectionName] = useState("")
  const [newSectionColor, setNewSectionColor] = useState("#3b82f6")
  const [editingSectionColor, setEditingSectionColor] = useState("")

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

  // Track drag state for shadow rendering per section
  const [sectionDragStates] = useState<
    Map<
      string,
      {
        isDraggingOver: boolean
        draggedTaskRect?: { height: number }
        closestEdge?: "top" | "bottom"
        targetTaskId?: string
        isOverChildTask?: boolean
      }
    >
  >(new Map())

  // Get section state from atoms
  const editingSectionId = useAtomValue(editingSectionIdAtom)
  const stopEditingSection = useSetAtom(stopEditingSectionAtom)

  // Initialize editing state when section editing starts
  useEffect(() => {
    if (editingSectionId && project) {
      const section = project.sections.find((s: ProjectSection) => s.id === editingSectionId)
      if (section) {
        setEditingSectionColor(section.color || "#808080")
      }
    }
  }, [editingSectionId, project])

  // Jotai actions
  const addSection = useSetAtom(projectAtoms.actions.addSection)
  const renameSection = useSetAtom(projectAtoms.actions.renameSection)
  const updateProjects = useSetAtom(updateProjectsAtom)
  const updateTasks = useSetAtom(updateTasksAtom)
  const taskById = useAtomValue(taskAtoms.derived.taskById)
  const getProjectById = useAtomValue(projectAtoms.derived.projectById)
  const addTaskToSection = useAddTaskToSection()
  const getOrderedTasksForSection = useAtomValue(taskAtoms.derived.orderedTasksBySection)

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

  const handleSaveEditSection = (newName: string) => {
    if (editingSectionId !== null && project) {
      const trimmedName = newName.trim()
      const sectionId = editingSectionId

      // Find the current section being edited
      const currentSection = project.sections.find((s: ProjectSection) => s.id === sectionId)
      if (!currentSection) {
        return
      }

      // Only proceed with rename if name is valid and different
      if (trimmedName && trimmedName !== currentSection.name) {
        // Check if the new name already exists
        if (project.sections.some((s: ProjectSection) => s.name === trimmedName)) {
          return
        }

        try {
          // Update the section in the project (name and color)
          renameSection({
            projectId: project.id,
            sectionId: sectionId,
            newSectionName: trimmedName,
            newSectionColor: editingSectionColor,
          })
        } catch (error) {
          log.error(
            {
              module: "projects",
              projectId: project.id,
              sectionId,
              newName: trimmedName,
              error: error instanceof Error ? error.message : String(error),
            },
            "Failed to rename section",
          )
        }
      }
    }

    // Always exit edit mode after processing
    stopEditingSection()
  }

  const handleCancelEditSection = () => {
    stopEditingSection()
    setEditingSectionColor("")
  }

  // Handler for dropping tasks onto a section (group drop target)
  const handleDropTaskToSection = useCallback(
    async (args: ElementDropTargetEventBasePayload) => {
      if (!project) return

      // Extract task IDs from drag source
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const taskIds = (Array.isArray(args.source.data.ids) ? args.source.data.ids : []) as TaskId[]
      if (taskIds.length === 0) return

      // Extract section ID from drop target ID (format: "droppableId-section-sectionId")
      const targetSectionDroppableId = String(args.self.data.id ?? "")
      const targetSectionId = targetSectionDroppableId.split("-section-")[1]
      if (!targetSectionId) return

      const tasksToMove = taskIds
        .map((id) => taskById.get(id))
        .filter((t): t is Task => t !== undefined)
      const tasksNeedingProjectUpdate = tasksToMove.filter((t) => t.projectId !== project.id)
      if (tasksNeedingProjectUpdate.length > 0) {
        await updateTasks(
          tasksNeedingProjectUpdate.map((task) => ({
            id: task.id,
            projectId: project.id,
            sectionId: createGroupId(targetSectionId),
          })),
        )
      }

      // Get unique project IDs that need updating (source projects + target project)
      const affectedProjectIds = new Set<ProjectId>([project.id])
      for (const task of tasksToMove) {
        if (task.projectId) {
          affectedProjectIds.add(task.projectId)
        }
      }

      // Step 1: Remove taskIds from affected projects' sections only
      const projectsMap = new Map<ProjectId, Project>()
      for (const projectId of affectedProjectIds) {
        const proj = getProjectById(projectId)
        if (proj) {
          projectsMap.set(projectId, {
            ...proj,
            sections: proj.sections.map((section) => ({
              ...section,
              items: section.items.filter((id) => !taskIds.includes(id)),
            })),
          })
        }
      }

      // Step 2: Add taskIds to the target section (at the end)
      const targetProject = projectsMap.get(project.id)
      if (!targetProject) return

      const targetSectionIndex = targetProject.sections.findIndex((s) => s.id === targetSectionId)
      if (targetSectionIndex < 0) return

      const targetSection = targetProject.sections[targetSectionIndex]
      if (!targetSection) return

      targetProject.sections[targetSectionIndex] = {
        ...targetSection,
        items: [...targetSection.items, ...taskIds],
      }

      // Step 3: Batch update all projects
      await updateProjects(
        Array.from(projectsMap.values()).map((proj) => ({
          id: proj.id,
          sections: proj.sections,
        })),
      )
    },
    [project, updateProjects, updateTasks, taskById, getProjectById],
  )

  // Handler for dropping tasks onto a list item (task)
  const handleDropTaskToListItem = useCallback(
    async (args: ElementDropTargetEventBasePayload) => {
      if (!project) return

      // Extract and validate drop payload
      const payload = extractDropPayload(args)
      if (!payload) return

      const taskIds = payload.draggedIds.map((id) => createTaskId(id))
      const { instruction } = payload
      const targetTaskId = createTaskId(payload.targetId)

      // Find which section contains the target task in the current project
      let targetSectionIndex = -1
      let targetSectionId = ""
      for (let i = 0; i < project.sections.length; i++) {
        const section = project.sections[i]
        if (section) {
          const taskIndex = section.items.indexOf(targetTaskId)
          if (taskIndex >= 0) {
            targetSectionIndex = i
            targetSectionId = section.id
            break
          }
        }
      }

      if (targetSectionIndex < 0) return

      const tasksToMove = taskIds
        .map((id) => taskById.get(id))
        .filter((t): t is Task => t !== undefined)
      const tasksNeedingProjectUpdate = tasksToMove.filter((t) => t.projectId !== project.id)
      if (tasksNeedingProjectUpdate.length > 0) {
        await updateTasks(
          tasksNeedingProjectUpdate.map((task) => ({
            id: task.id,
            projectId: project.id,
            sectionId: createGroupId(targetSectionId),
          })),
        )
      }

      // Get unique project IDs that need updating (source projects + target project)
      const affectedProjectIds = new Set<ProjectId>([project.id])
      for (const task of tasksToMove) {
        if (task.projectId) {
          affectedProjectIds.add(task.projectId)
        }
      }

      // Step 1: Remove taskIds from affected projects' sections only
      const projectsMap = new Map<ProjectId, Project>()
      for (const projectId of affectedProjectIds) {
        const proj = getProjectById(projectId)
        if (proj) {
          projectsMap.set(projectId, {
            ...proj,
            sections: proj.sections.map((section) => ({
              ...section,
              items: section.items.filter((id) => !taskIds.includes(id)),
            })),
          })
        }
      }

      // Step 2: Add taskIds to the target section at the correct position
      const targetProject = projectsMap.get(project.id)
      if (!targetProject) return

      const targetSection = targetProject.sections[targetSectionIndex]
      if (!targetSection) return

      // Calculate insert index using the utility function
      const insertIndex = calculateInsertIndex(
        targetSection.items,
        targetTaskId,
        instruction,
        (id) => id,
      )

      if (insertIndex === -1) return

      targetProject.sections[targetSectionIndex] = {
        ...targetSection,
        items: [
          ...targetSection.items.slice(0, insertIndex),
          ...taskIds,
          ...targetSection.items.slice(insertIndex),
        ],
      }

      // Step 3: Batch update all projects
      await updateProjects(
        Array.from(projectsMap.values()).map((proj) => ({
          id: proj.id,
          sections: proj.sections,
        })),
      )
    },
    [project, updateProjects, updateTasks, taskById, getProjectById],
  )

  // Side panel view state is the single source of truth for panel visibility
  const isPanelOpen = showSidePanel && Boolean(selectedTask)

  // handleTaskClick is now handled directly by TaskItem using atoms

  const handleClosePanel = () => {
    // Simply disable the side panel view option - this will sync everything
    setViewOptions({ showSidePanel: false })
  }

  const handleToggleSectionCollapse = (sectionId: string) => {
    toggleSectionCollapse(sectionId)
  }

  // Get sections from project and ensure default section is always present
  const sectionsToShow = project ? [...project.sections] : []

  // Always ensure default section is present
  const hasDefaultSection = sectionsToShow.some((section) => section.id === DEFAULT_UUID)
  if (!hasDefaultSection) {
    // Create default section if it doesn't exist
    const defaultSection: ProjectSection = {
      id: createGroupId(DEFAULT_UUID),
      name: "(no section)",
      slug: "",
      type: "section",
      color: "#6b7280", // Gray color for default section
      items: [],
    }
    // Add default section at the beginning
    sectionsToShow.unshift(defaultSection)
  }

  const renderSection = (section: { id: string; name: string; color?: string }) => {
    const displayName = section.name
    const sectionId = section.id
    const baseSectionTasks = getOrderedTasksForSection(
      project?.id || "inbox",
      createGroupId(section.id),
    )

    // Apply view state filters and sorting to sectioned tasks
    const filteredSectionTasks = applyViewStateFilters(
      baseSectionTasks,
      currentViewState,
      routeContext.viewId,
    )
    const sectionTasks = sortTasksByViewState([...filteredSectionTasks], currentViewState)

    // Get sorted task IDs for range selection
    const sortedSectionTaskIds = sectionTasks.map((task: Task) => task.id)

    const sectionDroppableId = `${droppableId}-section-${sectionId}`
    const isCollapsed = collapsedSections.includes(sectionId)
    const isEditing = editingSectionId === section.id

    // Render the section header (always visible)
    const sectionHeader = (
      <div className="flex items-center py-2 px-1 mb-3">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 p-0 h-auto hover:bg-transparent cursor-pointer"
            onClick={(e) => {
              if (isEditing) {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: section.color }} />
            <div className="flex items-center gap-2">
              {isEditing ? (
                <EditableDiv
                  as="h2"
                  value={section.name}
                  onChange={handleSaveEditSection}
                  onCancel={handleCancelEditSection}
                  className="text-base font-medium text-foreground"
                  autoFocus={true}
                  cursorPosition="end"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <h2 className="text-base font-medium text-foreground">{displayName}</h2>
              )}

              {/* Task count badge */}
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0.5 h-auto bg-transparent border-none text-muted-foreground font-medium"
              >
                {sectionTasks.length}
              </Badge>
            </div>
          </Button>
        </CollapsibleTrigger>

        <div className="flex items-center gap-2 ml-auto">
          {/* Add Task Button - always show (remove hidden class) */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 flex items-center justify-center"
            onClick={() => addTaskToSection(project?.id, sectionId)}
            title="Add task to this section"
          >
            <Plus className="h-3 w-3" />
          </Button>

          {/* Section context menu for non-unsectioned sections - only show if sections are supported */}
          {section.name !== "Unsectioned" && supportsSections && project?.id && (
            <SectionContextMenu sectionId={createGroupId(section.id)} isVisible={true} />
          )}
        </div>
      </div>
    )

    return (
      <div key={sectionId} className="mb-4">
        <DropTargetElement
          key={sectionDroppableId}
          id={sectionDroppableId}
          options={{ type: "group", indicator: {}, testId: sectionDroppableId }}
          onDrop={handleDropTaskToSection}
        >
          <Collapsible
            open={!isCollapsed}
            onOpenChange={() => handleToggleSectionCollapse(sectionId)}
          >
            {/* When collapsed or when not collapsed but has no tasks, wrap the header in a drop target */}
            {isCollapsed || sectionTasks.length === 0 ? (
              <>
                {sectionHeader}
                {/* Show shadow when dragging over section */}
                {(() => {
                  const dragState = sectionDragStates.get(section.id)
                  return dragState && dragState.isDraggingOver && dragState.draggedTaskRect ? (
                    <TaskShadow height={dragState.draggedTaskRect.height} className="mb-2" />
                  ) : null
                })()}
              </>
            ) : (
              sectionHeader
            )}

            <CollapsibleContent className="py-2">
              <div className="space-y-0">
                <>
                  <div>
                    {sectionTasks.map((task: Task) => (
                      <DropTargetElement
                        key={task.id}
                        id={task.id}
                        options={{ type: "list-item", indicator: { lineGap: "8px" } }}
                        onDrop={handleDropTaskToListItem}
                      >
                        <DraggableTaskElement key={task.id} taskId={task.id}>
                          <TaskItem
                            taskId={task.id}
                            variant={compactView ? "compact" : "default"}
                            className="cursor-pointer mb-2 mx-2"
                            showProjectBadge={true}
                            sortedTaskIds={sortedSectionTaskIds}
                          />
                        </DraggableTaskElement>
                      </DropTargetElement>
                    ))}
                  </div>
                </>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </DropTargetElement>
      </div>
    )
  }

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
              <div className="space-y-0">
                <div>
                  {tasks.map((task: Task) => (
                    <DraggableTaskElement key={task.id} taskId={task.id}>
                      <TaskItem
                        key={task.id}
                        taskId={task.id}
                        variant={compactView ? "compact" : "default"}
                        className="cursor-pointer mb-2"
                        showProjectBadge={true}
                        sortedTaskIds={sortedFlatTaskIds}
                      />
                    </DraggableTaskElement>
                  ))}
                </div>
              </div>
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

                {renderSection(section)}

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
