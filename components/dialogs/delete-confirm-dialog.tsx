"use client"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export type DeleteEntityType =
  | "task"
  | "project"
  | "label"
  | "section"
  | "history"
  | "bulk"
  | "group"

type DeleteMessageConfig = {
  task: {
    title: string
    description: (name: string) => string
    confirmText: string
  }
  project: {
    title: string
    description: (name: string) => string
    confirmText: string
  }
  label: {
    title: string
    description: (name: string) => string
    confirmText: string
  }
  section: {
    title: string
    description: (name: string) => string
    confirmText: string
  }
  history: {
    title: string
    description: () => string
    confirmText: string
  }
  bulk: {
    title: string
    description: (count: number) => string
    confirmText: string
  }
  group: {
    title: string
    description: (name: string) => string
    confirmText: string
  }
}

export interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  entityType: DeleteEntityType
  entityName?: string
  entityCount?: number
  customMessage?: string
  confirmButtonText?: string
  variant?: "destructive" | "default"
}

const DELETE_MESSAGES: DeleteMessageConfig = {
  task: {
    title: "Delete Task",
    description: (name: string) =>
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
    confirmText: "Delete",
  },
  project: {
    title: "Delete Project",
    description: (name: string) =>
      `Are you sure you want to delete "${name}"? This action cannot be undone and will remove all tasks in this project.`,
    confirmText: "Delete Project",
  },
  label: {
    title: "Delete Label",
    description: (name: string) =>
      `Are you sure you want to delete "${name}"? This action cannot be undone and will remove this label from all tasks.`,
    confirmText: "Delete Label",
  },
  section: {
    title: "Delete Section",
    description: (name: string) =>
      `Are you sure you want to delete "${name}"? This action cannot be undone and all tasks in this section will be moved to the default section.`,
    confirmText: "Delete Section",
  },
  history: {
    title: "Clear All History",
    description: () =>
      "This will permanently clear all undo/redo history for tasks, projects, and labels. This action cannot be undone.",
    confirmText: "Clear History",
  },
  bulk: {
    title: "Delete Tasks",
    description: (count: number) =>
      `Are you sure you want to delete ${count} task${count === 1 ? "" : "s"}? This action cannot be undone.`,
    confirmText: "Delete Tasks",
  },
  group: {
    title: "Delete Group",
    description: (name: string) =>
      `Are you sure you want to delete "${name}"? This action cannot be undone and will remove the group and all its subgroups. Projects and tasks within the group will not be deleted.`,
    confirmText: "Delete Group",
  },
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  entityType,
  entityName,
  entityCount,
  customMessage,
  confirmButtonText,
  variant = "destructive",
}: DeleteConfirmDialogProps) {
  const messageConfig = DELETE_MESSAGES[entityType]

  const title = messageConfig.title

  let description: string
  if (customMessage) {
    description = customMessage
  } else if (entityType === "bulk") {
    description = DELETE_MESSAGES.bulk.description(entityCount || 0)
  } else if (entityType === "history") {
    description = DELETE_MESSAGES.history.description()
  } else if (entityType === "task") {
    description = DELETE_MESSAGES.task.description(entityName || "")
  } else if (entityType === "project") {
    description = DELETE_MESSAGES.project.description(entityName || "")
  } else if (entityType === "label") {
    description = DELETE_MESSAGES.label.description(entityName || "")
  } else if (entityType === "section") {
    description = DELETE_MESSAGES.section.description(entityName || "")
  } else {
    description = "Are you sure you want to delete this item?"
  }
  const buttonText = confirmButtonText || messageConfig.confirmText

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={variant === "destructive" ? "outline" : "default"}
              className={
                variant === "destructive"
                  ? "border border-red-600 text-red-600 hover:text-red-700 bg-transparent hover:bg-transparent cursor-pointer"
                  : undefined
              }
              onClick={handleConfirm}
            >
              {buttonText}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
