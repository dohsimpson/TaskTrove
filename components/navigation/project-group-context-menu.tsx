"use client"

import { useState, useRef } from "react"
import { useSetAtom, useAtomValue } from "jotai"
import { Button } from "@/components/ui/button"
import {
  ContextMenuDropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/custom/context-menu-dropdown"
import { DeleteConfirmDialog } from "@/components/dialogs/delete-confirm-dialog"
import { ColorPickerFloating } from "@/components/ui/custom/color-picker-floating"
import { MoreHorizontal, Edit3, Trash2, Palette, FolderPlus, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  allGroupsAtom,
  updateProjectGroupAtom,
  deleteProjectGroupAtom,
} from "@/lib/atoms/core/groups"
import { openProjectGroupDialogAtom } from "@/lib/atoms/ui/navigation"
import type { GroupId } from "@/lib/types"

interface ProjectGroupContextMenuProps {
  groupId: GroupId
  isVisible: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ProjectGroupContextMenu({
  groupId,
  isVisible,
  open,
  onOpenChange,
}: ProjectGroupContextMenuProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  // Get group data and actions from atoms
  const allGroups = useAtomValue(allGroupsAtom)
  const updateProjectGroup = useSetAtom(updateProjectGroupAtom)
  const deleteProjectGroup = useSetAtom(deleteProjectGroupAtom)
  const openProjectGroupDialog = useSetAtom(openProjectGroupDialogAtom)

  // Use controlled or uncontrolled state
  const isOpen = open !== undefined ? open : internalOpen
  const setIsOpen = onOpenChange || setInternalOpen

  // Find the project group
  const projectGroup = allGroups.projectGroups.find((group) => group.id === groupId)
  if (!projectGroup) return null

  const handleEdit = () => {
    openProjectGroupDialog({ mode: "edit", groupId })
    setIsOpen(false)
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
    setIsOpen(false)
  }

  const handleConfirmDelete = async () => {
    try {
      await deleteProjectGroup(groupId)
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error("Failed to delete project group:", error)
      setShowDeleteConfirm(false)
    }
  }

  const handleColorChange = async (color: string) => {
    try {
      await updateProjectGroup({
        id: groupId,
        color,
      })
      setShowColorPicker(false)
    } catch (error) {
      console.error("Failed to update project group color:", error)
      setShowColorPicker(false)
    }
  }

  const handleChangeColor = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowColorPicker(true)
    setIsOpen(false)
  }

  const handleAddSubgroup = () => {
    openProjectGroupDialog({ mode: "create", parentId: groupId })
    setIsOpen(false)
  }

  const handleManageProjects = () => {
    // TODO: Open project assignment dialog
    console.log("Manage projects for group:", groupId)
    setIsOpen(false)
  }

  const getVisibilityClass = () => {
    return isVisible ? "opacity-100" : "hidden"
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
                "h-6 w-6 p-0 transition-opacity flex-shrink-0 cursor-pointer",
                getVisibilityClass(),
              )}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={handleEdit}>
              <Edit3 className="h-3 w-3 mr-2" />
              Edit group
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleChangeColor}>
              <Palette className="h-3 w-3 mr-2" />
              Change color
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleAddSubgroup}>
              <FolderPlus className="h-3 w-3 mr-2" />
              Add subgroup
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleManageProjects}>
              <UserPlus className="h-3 w-3 mr-2" />
              Manage projects
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Delete group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </ContextMenuDropdown>
      </div>

      {/* Color picker floating component */}
      <ColorPickerFloating
        selectedColor={projectGroup.color || "#3b82f6"}
        onColorSelect={handleColorChange}
        open={showColorPicker}
        onClose={() => setShowColorPicker(false)}
        anchorRef={contextMenuRef}
      />

      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleConfirmDelete}
        entityType="group"
        entityName={projectGroup.name}
      />
    </>
  )
}
