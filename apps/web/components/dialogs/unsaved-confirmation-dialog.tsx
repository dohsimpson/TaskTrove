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

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
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
              variant="outline"
              className="border border-red-600 text-red-600 hover:text-red-700 hover:bg-transparent"
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
