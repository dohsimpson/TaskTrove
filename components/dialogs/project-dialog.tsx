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
import { Textarea } from "@/components/ui/textarea"
import { ColorPicker } from "@/components/ui/custom/color-picker"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { COLOR_OPTIONS } from "@/lib/constants/defaults"
import { showProjectDialogAtom, projectDialogContextAtom } from "@/lib/atoms/ui/dialogs"
import { closeProjectDialogAtom } from "@/lib/atoms/ui/navigation"
import { addProjectAtom } from "@/lib/atoms/core/projects"
import { addProjectGroupAtom } from "@/lib/atoms/core/groups"
import { createProjectId } from "@/lib/types"

export function ProjectDialog() {
  const [entityType, setEntityType] = useState<"project" | "projectGroup">("project")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_OPTIONS[0].value)

  const open = useAtomValue(showProjectDialogAtom)
  const context = useAtomValue(projectDialogContextAtom)
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
        insertPosition:
          context.insertPosition?.id && context.insertPosition?.placement
            ? {
                id: createProjectId(context.insertPosition.id),
                placement: context.insertPosition.placement,
              }
            : undefined,
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

  const capitalizedType = entityType === "projectGroup" ? "Project Group" : "Project"

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New {capitalizedType}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <ToggleGroup
              type="single"
              value={entityType}
              onValueChange={(value) => {
                if (value === "project" || value === "projectGroup") {
                  setEntityType(value)
                }
              }}
              className="justify-start"
            >
              <ToggleGroupItem value="project" aria-label="Project">
                Project
              </ToggleGroupItem>
              <ToggleGroupItem value="projectGroup" aria-label="Project Group">
                Project Group
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${entityType}-name`}>{capitalizedType} Name</Label>
            <Input
              id={`${entityType}-name`}
              placeholder={`Enter ${entityType === "projectGroup" ? "project group" : "project"} name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {entityType === "projectGroup" && (
            <div className="space-y-2">
              <Label htmlFor={`${entityType}-description`}>Description (optional)</Label>
              <Textarea
                id={`${entityType}-description`}
                placeholder="Enter project group description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}

          <ColorPicker
            selectedColor={selectedColor}
            onColorSelect={setSelectedColor}
            label="Color"
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid}>
              Add {capitalizedType}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
