"use client"

import { useState, useRef } from "react"
import { useAtomValue } from "jotai"
import { Button } from "@/components/ui/button"
import {
  ContextMenuDropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/custom/context-menu-dropdown"
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { DeleteConfirmDialog } from "@/components/dialogs/delete-confirm-dialog"
import { ColorPickerFloating } from "@/components/ui/custom/color-picker-floating"
import {
  MoreHorizontal,
  Edit3,
  Trash2,
  Palette,
  FolderPlus,
  Copy,
  ArrowUp,
  ArrowDown,
  Plus,
  Move,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { projectsAtom } from "@/lib/atoms"
import { currentRouteContextAtom } from "@tasktrove/atoms"
import { isValidProjectId } from "@/lib/utils/routing"
import { GroupId, LabelId, ProjectId, SectionId } from "@/lib/types"

interface EntityContextMenuProps {
  id: GroupId | LabelId | ProjectId | SectionId
  entityType: "group" | "section" | "project" | "label"
  entityName: string
  entityColor: string
  isVisible: boolean
  showDeleteOption?: boolean
  onEdit: () => void
  onDelete: (deleteContainedResources?: boolean) => void
  onColorChange: (color: string) => void
  onDuplicate?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onAddAbove?: () => void
  onAddBelow?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function EntityContextMenu({
  id,
  entityType,
  entityName,
  entityColor,
  isVisible,
  showDeleteOption = true,
  onEdit,
  onDelete,
  onColorChange,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddAbove,
  onAddBelow,
  open,
  onOpenChange,
}: EntityContextMenuProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  // Get atoms for position detection
  const projects = useAtomValue(projectsAtom)
  const routeContext = useAtomValue(currentRouteContextAtom)

  // Use controlled or uncontrolled state
  const isOpen = open !== undefined ? open : internalOpen
  const setIsOpen = onOpenChange || setInternalOpen

  // Helper to create position info from index and total
  const createPositionInfo = (index: number, total: number) => ({
    index,
    total,
    canMoveUp: index > 0,
    canMoveDown: index >= 0 && index < total - 1,
    canAddAbove: true,
    canAddBelow: true,
  })

  // Default position info for invalid cases
  const defaultPositionInfo = {
    index: -1,
    total: 0,
    canMoveUp: false,
    canMoveDown: false,
    canAddAbove: false,
    canAddBelow: false,
  }

  // Dynamic position detection
  const getPositionInfo = () => {
    switch (entityType) {
      case "group": {
        return {
          isFirst: false,
          isLast: false,
          canMoveUp: false,
          canMoveDown: false,
          canAddAbove: false,
          canAddBelow: false,
        }
      }
      case "project": {
        return {
          isFirst: false,
          isLast: false,
          canMoveUp: false,
          canMoveDown: false,
          canAddAbove: false,
          canAddBelow: false,
        }
      }
      case "label": {
        return {
          isFirst: false,
          isLast: false,
          canMoveUp: false,
          canMoveDown: false,
          canAddAbove: false,
          canAddBelow: false,
        }
      }
      case "section": {
        // Find the project containing this section
        let currentProject = null

        if (isValidProjectId(routeContext.viewId)) {
          currentProject = projects.find((p) => p.id === routeContext.viewId)
        }

        if (!currentProject) {
          currentProject = projects.find((p) => p.sections.some((s) => s.id === id))
        }

        if (!currentProject) return defaultPositionInfo

        const index = currentProject.sections.findIndex((s) => s.id === id)
        return createPositionInfo(index, currentProject.sections.length)
      }
      default:
        return defaultPositionInfo
    }
  }

  const positionInfo = getPositionInfo()
  const hasReorderingFeatures = onMoveUp || onMoveDown || onAddAbove || onAddBelow

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
    setIsOpen(false)
  }

  const handleConfirmDelete = (deleteContainedResources?: boolean) => {
    onDelete(deleteContainedResources)
    setShowDeleteConfirm(false)
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onEdit()
    setIsOpen(false)
  }

  const handleChangeColor = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowColorPicker(true)
    setIsOpen(false)
  }

  const handleColorSelect = (color: string) => {
    onColorChange(color)
    setShowColorPicker(false)
  }

  const handleDuplicate = () => {
    onDuplicate?.()
    setIsOpen(false)
  }

  const handleMoveUp = () => {
    onMoveUp?.()
    setIsOpen(false)
  }

  const handleMoveDown = () => {
    onMoveDown?.()
    setIsOpen(false)
  }

  const handleAddAbove = () => {
    onAddAbove?.()
    setIsOpen(false)
  }

  const handleAddBelow = () => {
    onAddBelow?.()
    setIsOpen(false)
  }

  const getMenuWidth = () => {
    return entityType === "label" ? "w-36" : "w-40"
  }

  const getVisibilityClass = () => {
    return isVisible ? "opacity-100" : "hidden"
  }

  const getDuplicateIcon = () => {
    return entityType === "project" ? FolderPlus : Copy
  }

  return (
    <>
      <div ref={contextMenuRef}>
        <ContextMenuDropdown open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 w-6 p-0 transition-opacity flex-shrink-0 cursor-pointer flex items-center justify-center",
                entityType === "section" ? "text-muted-foreground hover:text-primary" : "",
                getVisibilityClass(),
              )}
              data-action={entityType !== "section" ? "menu" : undefined}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              title={entityType === "section" ? "Section options" : undefined}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={getMenuWidth()}>
            <DropdownMenuItem onClick={handleEditClick}>
              <Edit3 className="h-3 w-3 mr-2" />
              Edit Name
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleChangeColor}>
              <Palette className="h-3 w-3 mr-2" />
              Change color
            </DropdownMenuItem>
            {onDuplicate && (
              <DropdownMenuItem onClick={handleDuplicate}>
                {getDuplicateIcon()({ className: "h-3 w-3 mr-2" })}
                Duplicate
              </DropdownMenuItem>
            )}

            {/* Reordering submenus */}
            {hasReorderingFeatures && (
              <>
                {/* Only show separator if we have at least one reordering submenu to render */}
                {(((onMoveUp || onMoveDown) &&
                  (positionInfo.canMoveUp || positionInfo.canMoveDown)) ||
                  ((onAddAbove || onAddBelow) &&
                    (positionInfo.canAddAbove || positionInfo.canAddBelow))) && (
                  <DropdownMenuSeparator />
                )}

                {/* Move submenu */}
                {(onMoveUp || onMoveDown) &&
                  (positionInfo.canMoveUp || positionInfo.canMoveDown) && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Move className="h-3 w-3 mr-2" />
                        Move {entityType}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {positionInfo.canMoveUp && onMoveUp && (
                          <DropdownMenuItem onClick={handleMoveUp}>
                            <ArrowUp className="h-3 w-3 mr-2" />
                            Before
                          </DropdownMenuItem>
                        )}
                        {positionInfo.canMoveDown && onMoveDown && (
                          <DropdownMenuItem onClick={handleMoveDown}>
                            <ArrowDown className="h-3 w-3 mr-2" />
                            After
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}

                {/* Add submenu */}
                {(onAddAbove || onAddBelow) &&
                  (positionInfo.canAddAbove || positionInfo.canAddBelow) && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Plus className="h-3 w-3 mr-2" />
                        Add {entityType}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {positionInfo.canAddAbove && onAddAbove && (
                          <DropdownMenuItem onClick={handleAddAbove}>
                            <ArrowUp className="h-3 w-3 mr-2" />
                            Before
                          </DropdownMenuItem>
                        )}
                        {positionInfo.canAddBelow && onAddBelow && (
                          <DropdownMenuItem onClick={handleAddBelow}>
                            <ArrowDown className="h-3 w-3 mr-2" />
                            After
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}
              </>
            )}

            {showDeleteOption && (
              <>
                {/* Only show separator if we have items before the delete option */}
                {(onDuplicate ||
                  (hasReorderingFeatures &&
                    (((onMoveUp || onMoveDown) &&
                      (positionInfo.canMoveUp || positionInfo.canMoveDown)) ||
                      ((onAddAbove || onAddBelow) &&
                        (positionInfo.canAddAbove || positionInfo.canAddBelow))))) && (
                  <DropdownMenuSeparator />
                )}
                <DropdownMenuItem
                  onClick={handleDeleteClick}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete {entityType}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </ContextMenuDropdown>
      </div>

      {/* Color picker floating component */}
      <ColorPickerFloating
        selectedColor={entityColor}
        onColorSelect={handleColorSelect}
        open={showColorPicker}
        onClose={() => setShowColorPicker(false)}
        anchorRef={contextMenuRef}
      />

      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleConfirmDelete}
        entityType={entityType}
        entityName={entityName}
      />
    </>
  )
}
