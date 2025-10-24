"use client"

import { useRef } from "react"
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
import { useTranslation } from "@tasktrove/i18n"

export interface UnsavedConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function UnsavedConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
}: UnsavedConfirmationDialogProps) {
  const { t } = useTranslation("dialogs")
  const discardButtonRef = useRef<HTMLButtonElement>(null)

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onOpenAutoFocus={(e) => {
          // Prevent default focus behavior (which focuses Cancel button)
          e.preventDefault()
          // Use setTimeout to ensure focus happens after any click events resolve
          setTimeout(() => {
            discardButtonRef.current?.focus()
          }, 0)
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("unsavedConfirmation.title", "Discard unsaved changes?")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              "unsavedConfirmation.description",
              "You have unsaved changes that will be lost if you close this dialog. Are you sure you want to continue?",
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              ref={discardButtonRef}
              variant="outline"
              className="border border-red-600 text-red-600 bg-background hover:text-red-700 hover:bg-transparent focus:ring-4 focus:ring-muted-foreground"
              onClick={handleConfirm}
            >
              {t("unsavedConfirmation.confirm", "Discard Changes")}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
