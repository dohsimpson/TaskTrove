"use client"

import { useEffect, useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { User, Upload, Loader2 } from "lucide-react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useLanguage } from "@/components/providers/language-provider"
import { useTranslation } from "@/lib/i18n/client"
import { showUserProfileDialogAtom, closeUserProfileDialogAtom } from "@/lib/atoms/ui/dialogs"
import { userAtom } from "@/lib/atoms"
import type { UpdateUserRequest } from "@tasktrove/types"

export function UserProfileDialog() {
  const { language } = useLanguage()
  const { t } = useTranslation(language, "dialogs")

  const open = useAtomValue(showUserProfileDialogAtom)
  const closeDialog = useSetAtom(closeUserProfileDialogAtom)

  // User data from atoms
  const currentUser = useAtomValue(userAtom)
  const updateUser = useSetAtom(userAtom)

  // Form state
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [avatar, setAvatar] = useState<string | undefined>(undefined)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [disablePassword, setDisablePassword] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with current user data
  useEffect(() => {
    if (open) {
      // Populate form with current user data
      setUsername(currentUser.username || "")
      setPassword("") // Always start with empty password for security
      setConfirmPassword("")
      setAvatar(currentUser.avatar)
      setDisablePassword(!currentUser.password) // Set to true if user has no password
      setError("")
    }
  }, [open, currentUser])

  const handleAvatarChange = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      setError(t("userProfile.errors.fileSizeLimit", "Avatar file size must be under 5MB"))
      return
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError(t("userProfile.errors.invalidFileType", "Please select a valid image file"))
      return
    }

    setAvatarFile(file)

    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    setAvatar(previewUrl)
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim()) {
      setError(t("userProfile.errors.usernameRequired", "Username is required"))
      return
    }

    // Validate password confirmation if password is being set
    if (!disablePassword && password.trim() && password !== confirmPassword) {
      setError(t("userProfile.errors.passwordMismatch", "Passwords do not match"))
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      // Build the update request with only changed fields
      const updateRequest: UpdateUserRequest = {
        username: username.trim(),
      }

      // Handle password based on disable password toggle
      if (disablePassword) {
        // Send null to remove password protection
        updateRequest.password = null
      } else if (password.trim()) {
        // Only include password if it was changed and not disabled
        updateRequest.password = password.trim()
      }

      // Only include avatar if it was changed
      if (avatarFile) {
        // For now, use the preview URL. In production, this would need to be uploaded to storage first
        updateRequest.avatar = avatar
      }

      // Update user via atom
      await updateUser(updateRequest)

      // Show success and close dialog
      closeDialog()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("userProfile.errors.updateFailed", "Failed to update profile"),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    // Reset form to current user data
    setUsername(currentUser.username || "")
    setPassword("")
    setConfirmPassword("")
    setAvatar(currentUser.avatar)
    setAvatarFile(null)
    setDisablePassword(!currentUser.password)
    setError("")
    closeDialog()
  }

  // Check if form is valid
  const isFormValid = () => {
    // Username is required
    if (!username.trim()) {
      return false
    }

    // If password is being set (not disabled and has content), confirm password must match
    if (!disablePassword && password.trim() && password !== confirmPassword) {
      return false
    }

    return true
  }

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("userProfile.title", "Edit Profile")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatar} alt={username} />
              <AvatarFallback>
                <User className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col items-center gap-2">
              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleAvatarChange(file)
                  }
                }}
              />
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {t("userProfile.changeAvatar", "Change Avatar")}
                  </span>
                </Button>
              </Label>
              {avatarFile && <p className="text-xs text-muted-foreground">{avatarFile.name}</p>}
            </div>
          </div>

          {/* Username Field */}
          <div className="space-y-2">
            <Label htmlFor="username">{t("userProfile.username.label", "Username")}</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("userProfile.username.placeholder", "Enter your username")}
              required
            />
          </div>

          {/* Password Field - Only show when password is not disabled */}
          {!disablePassword && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t("userProfile.password.label", "Password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t(
                    "userProfile.password.placeholder",
                    "Leave blank to keep current password",
                  )}
                />
              </div>

              {/* Confirm Password Field - Only show when user is typing a password */}
              {password.trim() && (
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">
                    {t("userProfile.confirmPassword.label", "Confirm Password")}
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t(
                      "userProfile.confirmPassword.placeholder",
                      "Re-enter your password",
                    )}
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-600">
                      {t("userProfile.confirmPassword.mismatch", "Passwords do not match")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Disable Password Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="disable-password"
              checked={disablePassword}
              onCheckedChange={setDisablePassword}
            />
            <Label htmlFor="disable-password" className="text-sm font-normal">
              {t("userProfile.disablePassword.label", "Disable password protection")}
            </Label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || !isFormValid()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("userProfile.saving", "Saving...")}
                </>
              ) : (
                t("userProfile.save", "Save Changes")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
