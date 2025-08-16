"use client"

import { useState } from "react"
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
import { ColorPicker } from "@/components/ui/custom/color-picker"
import { COLOR_OPTIONS } from "@/lib/constants/defaults"
import { useAtomValue, useSetAtom } from "jotai"
import type { Atom, WritableAtom } from "jotai"

interface DialogContext {
  insertPosition?: {
    id?: string
    placement?: "above" | "below"
    projectId?: string
  }
}

interface BaseDialogProps<T> {
  type: "project" | "label" | "section"
  showAtom: Atom<boolean>
  contextAtom: Atom<DialogContext>
  closeAtom: WritableAtom<null, [], void>
  addAtom: WritableAtom<null, [T], Promise<void>>
  customValidation?: (name: string, context: DialogContext) => boolean
  transformData: (name: string, color: string, context: DialogContext) => T
}

export function BaseDialog<T>({
  type,
  showAtom,
  contextAtom,
  closeAtom,
  addAtom,
  customValidation,
  transformData,
}: BaseDialogProps<T>) {
  const open = useAtomValue(showAtom)
  const context = useAtomValue(contextAtom)
  const closeDialog = useSetAtom(closeAtom)
  const addItem = useSetAtom(addAtom)
  const [name, setName] = useState("")
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_OPTIONS[0].value)

  const isValid = customValidation ? customValidation(name, context) : !!name.trim()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!isValid) return

    const data = transformData(name, selectedColor, context)
    addItem(data)

    // Reset form
    setName("")
    setSelectedColor(COLOR_OPTIONS[0].value)
    closeDialog()
  }

  const handleCancel = () => {
    // Reset form
    setName("")
    setSelectedColor(COLOR_OPTIONS[0].value)
    closeDialog()
  }

  const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1)

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New {capitalizedType}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${type}-name`}>{capitalizedType} Name</Label>
            <Input
              id={`${type}-name`}
              placeholder={`Enter ${type} name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

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
