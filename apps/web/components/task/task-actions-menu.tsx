"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DeleteConfirmDialog } from "@/components/dialogs/delete-confirm-dialog"
import {
  MoreHorizontal,
  Trash2,
  // Timer, // Commented out since pomodoro timer is disabled
  Edit3,
  ClockFading,
  Copy,
  CheckSquare,
  ArrowUpRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Task } from "@tasktrove/types/core"
import { useSetAtom } from "jotai"
import { openQuickAddWithCopyAtom } from "@tasktrove/atoms/ui/dialogs"
// import { openPomodoroAtom } "@tasktrove/atoms" // Commented out since pomodoro timer is disabled

interface TaskActionsMenuProps {
  task: Task
  isVisible: boolean
  onDeleteClick: () => void
  onEditClick?: () => void
  onEstimationClick?: () => void
  onSelectClick?: () => void
  onConvertToTaskClick?: () => void
  isSubTask?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TaskActionsMenu({
  task,
  isVisible,
  onDeleteClick,
  onEditClick,
  onEstimationClick,
  onSelectClick,
  onConvertToTaskClick,
  isSubTask = false,
  open,
  onOpenChange,
}: TaskActionsMenuProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)
  const openQuickAddWithCopy = useSetAtom(openQuickAddWithCopyAtom)
  // const openPomodoro = useSetAtom(openPomodoroAtom) // Commented out since pomodoro timer is disabled

  // Use controlled or uncontrolled state
  const isOpen = open !== undefined ? open : internalOpen
  const setIsOpen = onOpenChange || setInternalOpen

  // Fix Radix UI pointer-events bug where body gets stuck with pointer-events: none
  // When Radix components (DropdownMenu, Dialog, etc.) open, they set pointer-events: none
  // on the body to prevent interactions outside the modal. However, this can sometimes
  // persist after the component closes, making the entire page uninteractive.
  // This affects third-party modals (like Stripe) and general page interactions.
  // For fix, see: https://github.com/radix-ui/primitives/issues/2122#issuecomment-1666753771
  useEffect(() => {
    if (isOpen) {
      // Pushing the change to the end of the call stack to ensure pointer events are restored
      // after Radix has finished its setup, preventing the body from staying locked
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = ""
      }, 0)

      return () => clearTimeout(timer)
    } else {
      // Explicitly restore pointer events when dropdown closes
      document.body.style.pointerEvents = "auto"
    }
  }, [isOpen])

  const handleDeleteClick = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    setShowDeleteConfirm(true)
    // setIsOpen(false)
  }

  const handleConfirmDelete = () => {
    // For task deletion, we don't currently use deleteContainedResources
    // but we need to match the new DeleteConfirmDialog signature
    onDeleteClick()
    setShowDeleteConfirm(false)
  }

  const handleEditClick = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    onEditClick?.()
    // setIsOpen(false)
  }

  const handleEstimationClick = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    onEstimationClick?.()
    // setIsOpen(false) // NOTE: Must not close menu when opening estimation modal, otherwise estimation modal is closed too
  }

  const handleCopyClick = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    openQuickAddWithCopy(task.id)
    setIsOpen(false)
  }

  const handleSelectClick = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    onSelectClick?.()
    setIsOpen(false)
  }

  const handleConvertToTaskClick = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    onConvertToTaskClick?.()
    setIsOpen(false)
  }

  // const handleTimerClick = () => {
  //   openPomodoro(task)
  //   setIsOpen(false)
  // } // Commented out since pomodoro timer is disabled

  return (
    <>
      <DropdownMenu modal={false} open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "h-5 w-5 p-0 m-0 flex-shrink-0 flex items-center justify-center",
              isVisible ? "flex" : "hidden",
            )}
            data-action="menu"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={cn("w-32", isSubTask && "w-40")}>
          {!isSubTask && onSelectClick && (
            <DropdownMenuItem onClick={handleSelectClick} className="cursor-pointer">
              <CheckSquare className="h-3.5 w-3.5 mr-2" />
              Select
            </DropdownMenuItem>
          )}
          {onEditClick && (
            <DropdownMenuItem onClick={handleEditClick} className="cursor-pointer">
              <Edit3 className="h-3.5 w-3.5 mr-2" />
              Edit
            </DropdownMenuItem>
          )}
          {!isSubTask && (
            <DropdownMenuItem onClick={handleCopyClick} className="cursor-pointer">
              <Copy className="h-3.5 w-3.5 mr-2" />
              Duplicate
            </DropdownMenuItem>
          )}
          {isSubTask && onConvertToTaskClick && (
            <DropdownMenuItem onClick={handleConvertToTaskClick} className="cursor-pointer">
              <ArrowUpRight className="h-3.5 w-3.5 mr-2" />
              Convert to Task
            </DropdownMenuItem>
          )}
          {isSubTask && onEstimationClick && (
            <DropdownMenuItem onClick={handleEstimationClick} className="cursor-pointer">
              <ClockFading className="h-3.5 w-3.5 mr-2" />
              Estimation
            </DropdownMenuItem>
          )}
          {/* <DropdownMenuItem onClick={handleTimerClick}>
              <Timer className="h-3.5 w-3.5 mr-2" />
              Start timer
            </DropdownMenuItem> */}
          <DropdownMenuItem
            onClick={handleDeleteClick}
            className="text-destructive dark:text-red-400 focus:text-destructive dark:focus:text-red-300 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleConfirmDelete}
        entityType="task"
        entityName={task.title}
      />
    </>
  )
}
