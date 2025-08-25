"use client"

import React from "react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
} from "@/components/ui/sidebar"
import Link from "next/link"
import {
  Inbox,
  Calendar,
  Clock,
  CheckSquare,
  ListCheck,
  Tag,
  Settings,
  Keyboard,
  Folder,
  Plus,
  ChevronDown,
} from "lucide-react"
import { SearchIcon, type SearchIconHandle } from "@/components/ui/search"
import { PlusIcon, type PlusIconHandle } from "@/components/ui/plus"
import { ComingSoonWrapper } from "@/components/ui/coming-soon-wrapper"
import { ProjectContextMenu } from "./project-context-menu"
import { LabelContextMenu } from "./label-context-menu"
import { ProjectGroupItem } from "./project-group-item"
import { useContextMenuVisibility } from "@/hooks/use-context-menu-visibility"
import { EditableDiv } from "@/components/ui/custom/editable-div"
import { useSetAtom, useAtom, useAtomValue } from "jotai"
import {
  taskCounts,
  sortedLabels,
  visibleProjectsAtom,
  projectTaskCountsAtom,
  labelTaskCountsAtom,
  projectActions,
  updateLabel,
} from "@/lib/atoms"
import { rootProjectGroupsAtom, ungroupedProjectsAtom } from "@/lib/atoms/core/groups"
import type { Project, Label } from "@/lib/types"
import {
  openSearchAtom,
  openQuickAddAtom,
  openProjectDialogAtom,
  openLabelDialogAtom,
  pathnameAtom,
  editingProjectIdAtom,
  stopEditingProjectAtom,
  editingLabelIdAtom,
  stopEditingLabelAtom,
} from "@/lib/atoms/ui/navigation"
import { openSettingsDialogAtom } from "@/lib/atoms/ui/dialogs"

export function SidebarNav() {
  // Get data from atoms instead of props
  const [projects] = useAtom(visibleProjectsAtom)
  const [labels] = useAtom(sortedLabels)
  const [taskCountsData] = useAtom(taskCounts)
  const pathname = useAtomValue(pathnameAtom)
  const projectGroups = useAtomValue(rootProjectGroupsAtom)
  const ungroupedProjects = useAtomValue(ungroupedProjectsAtom)

  // Get action atoms
  const openSearch = useSetAtom(openSearchAtom)
  const openQuickAdd = useSetAtom(openQuickAddAtom)
  const openProjectDialog = useSetAtom(openProjectDialogAtom)
  const openLabelDialog = useSetAtom(openLabelDialogAtom)
  const openSettingsDialog = useSetAtom(openSettingsDialogAtom)

  // Card button styles for quick actions
  const CARD_BUTTON_STYLES =
    "h-[100px] w-full flex flex-col items-center justify-center gap-1.5 bg-card border-1 border-border hover:border-primary/50 hover:bg-primary/5 hover:scale-105 rounded-lg transition-all duration-200 cursor-pointer"

  // Define main nav items directly
  const mainNavItems = [
    {
      id: "all",
      label: "All Tasks",
      icon: <ListCheck className="h-4 w-4" />,
      count: taskCountsData.all,
      href: "/all",
    },
    {
      id: "inbox",
      label: "Inbox",
      icon: <Inbox className="h-4 w-4" />,
      count: taskCountsData.inbox,
      href: "/inbox",
    },
    {
      id: "today",
      label: "Today",
      icon: <Calendar className="h-4 w-4" />,
      count: taskCountsData.today,
      href: "/today",
    },
    {
      id: "upcoming",
      label: "Upcoming",
      icon: <Clock className="h-4 w-4" />,
      count: taskCountsData.upcoming,
      href: "/upcoming",
    },
    {
      id: "completed",
      label: "Completed",
      icon: <CheckSquare className="h-4 w-4" />,
      href: "/completed",
    },
  ]

  const moreNavItems = [
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="h-4 w-4" />,
      onClick: openSettingsDialog,
    },
    {
      id: "shortcuts",
      label: "Shortcuts",
      icon: <Keyboard className="h-4 w-4" />,
      href: "/shortcuts",
      comingSoon: true,
      featureName: "Keyboard Shortcuts",
    },
  ]

  // Refs for controlling animated icons
  const searchIconRef = useRef<SearchIconHandle>(null)
  const plusIconRef = useRef<PlusIconHandle>(null)

  return (
    <>
      {/* Screen reader live region for drag and drop announcements */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
        id="drag-drop-announcements"
      />

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3 p-4 pt-0">
        <Button
          variant="ghost"
          className={CARD_BUTTON_STYLES}
          onClick={openSearch}
          onMouseEnter={() => searchIconRef.current?.startAnimation()}
          onMouseLeave={() => searchIconRef.current?.stopAnimation()}
        >
          <SearchIcon ref={searchIconRef} size={20} />
          <span className="text-sm font-medium">Search</span>
        </Button>
        <Button
          variant="ghost"
          className={CARD_BUTTON_STYLES}
          onClick={openQuickAdd}
          onMouseEnter={() => plusIconRef.current?.startAnimation()}
          onMouseLeave={() => plusIconRef.current?.stopAnimation()}
        >
          <PlusIcon ref={plusIconRef} size={20} />
          <span className="text-sm font-medium">Add</span>
        </Button>
      </div>

      <Separator />

      {/* Main Navigation */}
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {mainNavItems.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton asChild isActive={pathname === item.href}>
                  <Link href={item.href}>
                    {item.icon}
                    <span>{item.label}</span>
                    {item.count !== undefined && <SidebarMenuBadge>{item.count}</SidebarMenuBadge>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <Separator />

      {/* Projects Section */}
      <Collapsible defaultOpen className="group/collapsible">
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center justify-between w-full">
              <CollapsibleTrigger className="flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground">
                <ChevronDown className="h-3 w-3 mr-2 transition-transform group-data-[state=closed]/collapsible:-rotate-90" />
                Projects
              </CollapsibleTrigger>
              <SidebarGroupAction onClick={() => openProjectDialog()}>
                <Plus className="h-3 w-3" />
              </SidebarGroupAction>
            </div>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Render project groups with simplified single-layer structure */}
                {projectGroups?.map((group) => (
                  <ProjectGroupItem key={group.id} group={group} projects={projects || []} />
                ))}

                {/* Render individual projects not in any group */}
                {ungroupedProjects?.map((project) => (
                  <ProjectMenuItem key={project.id} project={project} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>

      <Separator />

      {/* Labels Section */}
      <Collapsible defaultOpen className="group/collapsible">
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center justify-between w-full">
              <CollapsibleTrigger className="flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground">
                <ChevronDown className="h-3 w-3 mr-2 transition-transform group-data-[state=closed]/collapsible:-rotate-90" />
                Labels
              </CollapsibleTrigger>
              <SidebarGroupAction onClick={() => openLabelDialog()}>
                <Plus className="h-3 w-3" />
              </SidebarGroupAction>
            </div>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                {labels?.map((label) => (
                  <LabelMenuItem key={label.id} label={label} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>

      <Separator />

      {/* More Section */}
      <Collapsible defaultOpen className="group/collapsible">
        <SidebarGroup>
          <SidebarGroupLabel>
            <CollapsibleTrigger className="flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground">
              <ChevronDown className="h-3 w-3 mr-2 transition-transform group-data-[state=closed]/collapsible:-rotate-90" />
              More
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                {moreNavItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild={!item.onClick}
                      disabled={item.comingSoon}
                      onClick={item.onClick}
                      className="cursor-pointer"
                    >
                      {item.comingSoon ? (
                        <ComingSoonWrapper
                          disabled={true}
                          featureName={item.featureName || item.label}
                        >
                          <div className="flex items-center gap-2 w-full">
                            {item.icon}
                            <span>{item.label}</span>
                          </div>
                        </ComingSoonWrapper>
                      ) : item.onClick ? (
                        <div className="flex items-center gap-2 w-full">
                          {item.icon}
                          <span>{item.label}</span>
                        </div>
                      ) : (
                        <Link href={item.href}>
                          {item.icon}
                          <span>{item.label}</span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    </>
  )
}

// Generic sidebar menu item component with context menu
interface SidebarMenuItemWithContextProps {
  href: string
  isActive: boolean
  icon: React.ReactNode
  name: string
  taskCount: number
  contextMenuId: string
  contextMenuType: "project" | "label"
  isEditing: boolean
  onNameChange: (name: string) => void
  onCancelEdit: () => void
}

type ProjectMenuItemProps = Omit<
  SidebarMenuItemWithContextProps,
  "contextMenuId" | "contextMenuType" | "isEditing" | "onNameChange" | "onCancelEdit"
> & {
  contextMenuId: Project["id"]
  contextMenuType: "project"
  isEditing: boolean
  onNameChange: (name: string) => void
  onCancelEdit: () => void
}

type LabelMenuItemProps = Omit<
  SidebarMenuItemWithContextProps,
  "contextMenuId" | "contextMenuType" | "isEditing" | "onNameChange" | "onCancelEdit"
> & {
  contextMenuId: Label["id"]
  contextMenuType: "label"
  isEditing: boolean
  onNameChange: (name: string) => void
  onCancelEdit: () => void
}

function SidebarMenuItemWithContext({
  href,
  isActive,
  icon,
  name,
  taskCount,
  contextMenuId,
  contextMenuType,
  isEditing,
  onNameChange,
  onCancelEdit,
}: ProjectMenuItemProps | LabelMenuItemProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Context menu visibility with flicker prevention
  const {
    isVisible: contextMenuVisible,
    isMenuOpen,
    handleMenuOpenChange,
  } = useContextMenuVisibility(isHovered)

  return (
    <SidebarMenuItem>
      <div
        className="relative group w-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <SidebarMenuButton asChild isActive={isActive}>
          <Link href={href} className="w-full">
            {icon}
            {isEditing ? (
              <EditableDiv
                as="span"
                value={name}
                onChange={onNameChange}
                onCancel={onCancelEdit}
                autoFocus
                className="flex-1"
              />
            ) : (
              <span>{name}</span>
            )}
            <SidebarMenuBadge className={contextMenuVisible ? "opacity-0" : ""}>
              {taskCount}
            </SidebarMenuBadge>
          </Link>
        </SidebarMenuButton>
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {contextMenuType === "project" ? (
            <ProjectContextMenu
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Type narrowing requires assertion
              projectId={contextMenuId as Project["id"]}
              isVisible={contextMenuVisible}
              open={isMenuOpen}
              onOpenChange={handleMenuOpenChange}
            />
          ) : (
            <LabelContextMenu
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Type narrowing requires assertion
              labelId={contextMenuId as Label["id"]}
              isVisible={contextMenuVisible}
              open={isMenuOpen}
              onOpenChange={handleMenuOpenChange}
            />
          )}
        </div>
      </div>
    </SidebarMenuItem>
  )
}

// Project menu item component
function ProjectMenuItem({ project }: { project: Project }) {
  const pathname = useAtomValue(pathnameAtom)
  const projectTaskCounts = useAtomValue(projectTaskCountsAtom)
  const editingProjectId = useAtomValue(editingProjectIdAtom)
  const stopEditing = useSetAtom(stopEditingProjectAtom)
  const updateProject = useSetAtom(projectActions.updateProject)

  const isActive = pathname === `/projects/${project.slug}`
  const taskCount = projectTaskCounts[project.id] || 0
  const isEditing = editingProjectId === project.id

  const handleProjectNameChange = (newName: string) => {
    if (newName.trim() && newName !== project.name) {
      updateProject({ projectId: project.id, updates: { name: newName.trim() } })
    }
    stopEditing()
  }

  const handleCancelEdit = () => {
    stopEditing()
  }

  return (
    <SidebarMenuItemWithContext
      href={`/projects/${project.slug}`}
      isActive={isActive}
      icon={<Folder className="h-4 w-4" style={{ color: project.color }} />}
      name={project.name}
      taskCount={taskCount}
      contextMenuId={project.id}
      contextMenuType="project"
      isEditing={isEditing}
      onNameChange={handleProjectNameChange}
      onCancelEdit={handleCancelEdit}
    />
  )
}

// Label menu item component
function LabelMenuItem({ label }: { label: Label }) {
  const pathname = useAtomValue(pathnameAtom)
  const labelTaskCounts = useAtomValue(labelTaskCountsAtom)
  const editingLabelId = useAtomValue(editingLabelIdAtom)
  const stopEditing = useSetAtom(stopEditingLabelAtom)
  const updateLabelAction = useSetAtom(updateLabel)

  const isActive = pathname === `/labels/${label.slug}`
  const taskCount = labelTaskCounts[label.id] || 0
  const isEditing = editingLabelId === label.id

  const handleLabelNameChange = (newName: string) => {
    if (newName.trim() && newName !== label.name) {
      updateLabelAction({ id: label.id, changes: { name: newName.trim() } })
    }
    stopEditing()
  }

  const handleCancelEdit = () => {
    stopEditing()
  }

  return (
    <SidebarMenuItemWithContext
      href={`/labels/${label.slug}`}
      isActive={isActive}
      icon={<Tag className="h-4 w-4" style={{ color: label.color }} />}
      name={label.name}
      taskCount={taskCount}
      contextMenuId={label.id}
      contextMenuType="label"
      isEditing={isEditing}
      onNameChange={handleLabelNameChange}
      onCancelEdit={handleCancelEdit}
    />
  )
}
