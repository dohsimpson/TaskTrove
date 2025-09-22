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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ColorPicker } from "@/components/ui/custom/color-picker"
import { COLOR_OPTIONS } from "@/lib/constants/defaults"
import { useAtomValue, useSetAtom } from "jotai"
import type { Atom, WritableAtom } from "jotai"
import { useTranslation } from "@/lib/i18n/client"
import { useLanguage } from "@/components/providers/language-provider"

interface DialogContext {
  mode?: "create" | "edit"
  insertPosition?: {
    id?: string
    placement?: "above" | "below"
    projectId?: string
  }
  parentId?: string
}

interface BaseDialogProps<T, R = void> {
  type: "project" | "label" | "section" | "projectGroup"
  showAtom: Atom<boolean>
  contextAtom: Atom<DialogContext>
  closeAtom: WritableAtom<null, [], void>
  addAtom: WritableAtom<null, [T], Promise<R>>
  customValidation?: (name: string, description: string, context: DialogContext) => boolean
  transformData: (name: string, color: string, description: string, context: DialogContext) => T
  showDescription?: boolean
  showParentPicker?: boolean
  parentPickerOptions?: Array<{ id: string; name: string; color?: string }>
  parentPickerLabel?: string
}

export function BaseDialog<T, R = void>({
  type,
  showAtom,
  contextAtom,
  closeAtom,
  addAtom,
  customValidation,
  transformData,
  showDescription = false,
  showParentPicker = false,
  parentPickerOptions = [],
  parentPickerLabel = "Parent",
}: BaseDialogProps<T, R>) {
  // Translation hooks
  const { language } = useLanguage()
  const { t } = useTranslation(language, "dialogs")

  const open = useAtomValue(showAtom)
  const context = useAtomValue(contextAtom)
  const closeDialog = useSetAtom(closeAtom)
  const addItem = useSetAtom(addAtom)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_OPTIONS[0].value)
  const [selectedParentId, setSelectedParentId] = useState<string>("")

  const isValid = customValidation ? customValidation(name, description, context) : !!name.trim()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!isValid) return

    // Update context with selected parent ID if applicable
    const updatedContext = showParentPicker
      ? { ...context, parentId: selectedParentId || undefined }
      : context

    const data = transformData(name, selectedColor, description, updatedContext)
    addItem(data)

    // Reset form
    setName("")
    setDescription("")
    setSelectedColor(COLOR_OPTIONS[0].value)
    setSelectedParentId("")
    closeDialog()
  }

  const handleCancel = () => {
    // Reset form
    setName("")
    setDescription("")
    setSelectedColor(COLOR_OPTIONS[0].value)
    setSelectedParentId("")
    closeDialog()
  }

  const capitalizedType = t(`baseDialog.${type}`, type.charAt(0).toUpperCase() + type.slice(1))

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {t("baseDialog.title", "Add New {{type}}", { type: capitalizedType })}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${type}-name`}>
              {t("baseDialog.name.label", "{{type}} Name", { type: capitalizedType })}
            </Label>
            <Input
              id={`${type}-name`}
              placeholder={t("baseDialog.name.placeholder", "Enter {{type}} name", { type: type })}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {showDescription && (
            <div className="space-y-2">
              <Label htmlFor={`${type}-description`}>
                {t("baseDialog.description.label", "Description (optional)")}
              </Label>
              <Textarea
                id={`${type}-description`}
                placeholder={t("baseDialog.description.placeholder", "Enter {{type}} description", {
                  type: type,
                })}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}

          {showParentPicker && parentPickerOptions.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor={`${type}-parent`}>{parentPickerLabel}</Label>
              <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                <SelectTrigger id={`${type}-parent`}>
                  <SelectValue
                    placeholder={t("baseDialog.parent.placeholder", "Select {{type}}", {
                      type: parentPickerLabel.toLowerCase(),
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    {t("baseDialog.parent.none", "None (Root Level)")}
                  </SelectItem>
                  {parentPickerOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      <div className="flex items-center gap-2">
                        {option.color && (
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: option.color }}
                          />
                        )}
                        <span>{option.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <ColorPicker
            selectedColor={selectedColor}
            onColorSelect={setSelectedColor}
            label={t("baseDialog.color.label", "Color")}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button type="submit" disabled={!isValid}>
              {t("baseDialog.buttons.add", "Add {{type}}", { type: capitalizedType })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
