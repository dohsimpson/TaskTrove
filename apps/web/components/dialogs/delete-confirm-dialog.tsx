"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { useTranslation } from "@/lib/i18n/client"
import { useLanguage } from "@/components/providers/language-provider"

export type DeleteEntityType =
  | "task"
  | "project"
  | "label"
  | "section"
  | "history"
  | "bulk"
  | "group"

export interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (deleteContainedResources?: boolean) => void
  entityType: DeleteEntityType
  entityName?: string
  entityCount?: number
  customMessage?: string
  confirmButtonText?: string
  variant?: "destructive" | "default"
}

// Translation function will be used inline in the component

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
  const { language } = useLanguage()
  const { t } = useTranslation(language, "dialogs")
  const [deleteContainedResources, setDeleteContainedResources] = useState(false)

  // Show checkbox for groups and projects only
  const shouldShowCheckbox = entityType === "group" || entityType === "project"

  // Get translated title based on entity type
  const getTitle = () => {
    switch (entityType) {
      case "task":
        return t("delete.task.title", "Delete Task")
      case "project":
        return t("delete.project.title", "Delete Project")
      case "label":
        return t("delete.label.title", "Delete Label")
      case "section":
        return t("delete.section.title", "Delete Section")
      case "history":
        return t("delete.history.title", "Clear All History")
      case "bulk":
        return t("delete.bulk.title", "Delete Tasks")
      case "group":
        return t("delete.group.title", "Delete Group")
      default:
        return t("delete.default.title", "Delete Item")
    }
  }

  // Get translated description based on entity type
  const getDescription = () => {
    if (customMessage) return customMessage

    switch (entityType) {
      case "task":
        return t(
          "delete.task.description",
          'Are you sure you want to delete "{{- name}}"? This action cannot be undone.',
          { name: entityName || "" },
        )
      case "project":
        return t(
          "delete.project.description",
          'Are you sure you want to delete "{{- name}}"? This action cannot be undone.',
          { name: entityName || "" },
        )
      case "label":
        return t(
          "delete.label.description",
          'Are you sure you want to delete "{{- name}}"? This action cannot be undone.',
          { name: entityName || "" },
        )
      case "section":
        return t(
          "delete.section.description",
          'Are you sure you want to delete "{{- name}}"? This action cannot be undone.',
          { name: entityName || "" },
        )
      case "history":
        return t(
          "delete.history.description",
          "This will permanently clear all undo/redo history for tasks, projects, and labels. This action cannot be undone.",
        )
      case "bulk":
        return t(
          "delete.bulk.description",
          "Are you sure you want to delete {{count}} task{{s}}? This action cannot be undone.",
          {
            count: entityCount || 0,
            s: (entityCount || 0) === 1 ? "" : "s",
          },
        )
      case "group":
        return t(
          "delete.group.description",
          'Are you sure you want to delete "{{- name}}"? This action cannot be undone.',
          { name: entityName || "" },
        )
      default:
        return t("delete.default.description", "Are you sure you want to delete this item?")
    }
  }

  // Get translated confirm button text
  const getConfirmText = () => {
    if (confirmButtonText) return confirmButtonText

    switch (entityType) {
      case "task":
        return t("delete.task.confirm", "Delete")
      case "project":
        return t("delete.project.confirm", "Delete Project")
      case "label":
        return t("delete.label.confirm", "Delete Label")
      case "section":
        return t("delete.section.confirm", "Delete Section")
      case "history":
        return t("delete.history.confirm", "Clear History")
      case "bulk":
        return t("delete.bulk.confirm", "Delete Tasks")
      case "group":
        return t("delete.group.confirm", "Delete Group")
      default:
        return t("delete.default.confirm", "Delete")
    }
  }

  const title = getTitle()
  const description = getDescription()
  const buttonText = getConfirmText()

  const handleConfirm = () => {
    onConfirm(deleteContainedResources)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {shouldShowCheckbox && (
          <div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="delete-contained-resources"
                checked={deleteContainedResources}
                onCheckedChange={(checked) => setDeleteContainedResources(checked === true)}
              />
              <label
                htmlFor="delete-contained-resources"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {entityType === "project"
                  ? t(
                      "delete.project.deleteContainedResources",
                      "Also delete all tasks in this project",
                    )
                  : entityType === "group"
                    ? t(
                        "delete.group.deleteContainedResources",
                        "Also delete all projects and tasks in this group",
                      )
                    : t("delete.deleteContainedResources", "Also delete contained resources")}
              </label>
            </div>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
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
