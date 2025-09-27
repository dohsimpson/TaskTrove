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
import { useTranslation } from "@/lib/i18n/client"
import { useLanguage } from "@/components/providers/language-provider"

export interface LogoutConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function LogoutConfirmDialog({ open, onOpenChange, onConfirm }: LogoutConfirmDialogProps) {
  const { language } = useLanguage()
  const { t } = useTranslation(language, "navigation")

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("logout.confirmTitle", "Sign Out")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              "logout.confirmMessage",
              "Are you sure you want to sign out? You will need to sign in again to access your tasks.",
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("logout.cancel", "Cancel")}</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleConfirm} variant="outline">
              {t("logout.confirm", "Sign Out")}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
