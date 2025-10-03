"use client"

import { useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
// import { Textarea } from "@/components/ui/textarea"
import { ColorPicker } from "@/components/ui/custom/color-picker"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { COLOR_OPTIONS } from "@tasktrove/constants"
import { showProjectDialogAtom } from "@/lib/atoms/ui/dialogs"
import { closeProjectDialogAtom } from "@/lib/atoms/ui/navigation"
import { addProjectAtom } from "@/lib/atoms/core/projects"
import { addProjectGroupAtom } from "@/lib/atoms/core/groups"
import { useTranslation } from "@tasktrove/i18n"
export function ProjectDialog() {
  const [entityType, setEntityType] = useState<"project" | "projectGroup">("project")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_OPTIONS[0].value)

  // Translation hooks
  const { t } = useTranslation("dialogs")

  const open = useAtomValue(showProjectDialogAtom)
  const closeDialog = useSetAtom(closeProjectDialogAtom)
  const addProject = useSetAtom(addProjectAtom)
  const addProjectGroup = useSetAtom(addProjectGroupAtom)

  const isValid = !!name.trim()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!isValid) return

    if (entityType === "projectGroup") {
      addProjectGroup({
        name: name.trim(),
        color: selectedColor,
        description: description.trim() || undefined,
      })
    } else {
      addProject({
        name: name.trim(),
        color: selectedColor,
      })
    }

    // Reset form
    setName("")
    setDescription("")
    setSelectedColor(COLOR_OPTIONS[0].value)
    setEntityType("project")
    closeDialog()
  }

  const handleCancel = () => {
    // Reset form
    setName("")
    setDescription("")
    setSelectedColor(COLOR_OPTIONS[0].value)
    setEntityType("project")
    closeDialog()
  }

  const capitalizedType =
    entityType === "projectGroup"
      ? t("projectDialog.group", "Group")
      : t("projectDialog.project", "Project")

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {t("projectDialog.title", "Add New {{type}}", { type: capitalizedType })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("projectDialog.type.label", "Type")}</Label>
            <ToggleGroup
              type="single"
              value={entityType}
              onValueChange={(value) => {
                if (value === "project" || value === "projectGroup") {
                  setEntityType(value)
                }
              }}
              variant="outline"
              className="justify-start"
            >
              <ToggleGroupItem value="project" aria-label={t("projectDialog.project", "Project")}>
                {t("projectDialog.project", "Project")}
              </ToggleGroupItem>
              <ToggleGroupItem value="projectGroup" aria-label={t("projectDialog.group", "Group")}>
                {t("projectDialog.group", "Group")}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${entityType}-name`}>
              {t("projectDialog.name.label", "{{type}} Name", { type: capitalizedType })}
            </Label>
            <Input
              id={`${entityType}-name`}
              placeholder={t("projectDialog.name.placeholder", "Enter {{type}} name", {
                type:
                  entityType === "projectGroup"
                    ? t("projectDialog.group", "group").toLowerCase()
                    : t("projectDialog.project", "project").toLowerCase(),
              })}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* {entityType === "projectGroup" && ( */}
          {/*   <div className="space-y-2"> */}
          {/*     <Label htmlFor={`${entityType}-description`}>Description (optional)</Label> */}
          {/*     <Textarea */}
          {/*       id={`${entityType}-description`} */}
          {/*       placeholder="Enter project group description" */}
          {/*       value={description} */}
          {/*       onChange={(e) => setDescription(e.target.value)} */}
          {/*       className="min-h-[80px]" */}
          {/*     /> */}
          {/*   </div> */}
          {/* )} */}

          <ColorPicker
            selectedColor={selectedColor}
            onColorSelect={setSelectedColor}
            label={t("projectDialog.color.label", "Color")}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button type="submit" disabled={!isValid}>
              {t("projectDialog.buttons.add", "Add {{type}}", { type: capitalizedType })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
