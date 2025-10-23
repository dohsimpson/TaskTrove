"use client"

import { useEffect, useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { User, Upload, Loader2 } from "lucide-react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTranslation } from "@tasktrove/i18n"
import { showUserProfileDialogAtom, closeUserProfileDialogAtom } from "@tasktrove/atoms/ui/dialogs"
import { userAtom } from "@tasktrove/atoms/data/base/atoms"
import type { UpdateUserRequest } from "@tasktrove/types"
import { createAvatarBase64 } from "@tasktrove/types"
import { encodeFileToBase64, isSupportedAvatarMimeType, getAvatarApiUrl } from "@tasktrove/utils"

export function UserProfileDialog() {
  const { t } = useTranslation("dialogs")

  const open = useAtomValue(showUserProfileDialogAtom)
  const closeDialog = useSetAtom(closeUserProfileDialogAtom)

  // User data from atoms
  const currentUser = useAtomValue(userAtom)
  const updateUser = useSetAtom(userAtom)

  // Form state
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [uploadedAvatarDataUrl, setUploadedAvatarDataUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarRemoved, setAvatarRemoved] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get the avatar to display (prioritize uploaded avatar, fall back to current user avatar, unless removed)
  const displayAvatar = avatarRemoved ? undefined : uploadedAvatarDataUrl || currentUser.avatar

  // Initialize form with current user data
  useEffect(() => {
    if (open) {
      // Populate form with current user data
      setUsername(currentUser.username || "")
      setPassword("") // Always start with empty password for security
      setConfirmPassword("")
      setUploadedAvatarDataUrl(null) // Reset any uploaded avatar
      setAvatarFile(null) // Reset file selection
      setAvatarRemoved(false) // Reset avatar removal flag
      setError("")
    }
  }, [open, currentUser])

  const handleAvatarChange = async (file: File) => {
    // Validate file type using utility function
    if (!isSupportedAvatarMimeType(file.type)) {
      setError(
        t(
          "userProfile.errors.invalidFileType",
          "Please select a valid image file (PNG, JPEG, GIF, or WebP)",
        ),
      )
      return
    }

    try {
      // Encode to base64 with 5MB limit
      const base64Data = await encodeFileToBase64(file, 5 * 1024 * 1024)

      if (!base64Data) {
        setError(t("userProfile.errors.fileSizeLimit", "Avatar file size must be under 5MB"))
        return
      }

      setAvatarFile(file)
      setAvatarRemoved(false) // Clear removed flag when uploading new avatar

      // Create data URL for preview and upload
      const dataUrl = `data:${file.type};base64,${base64Data}`
      setUploadedAvatarDataUrl(dataUrl)
      setError("")
    } catch {
      setError(t("userProfile.errors.invalidFileType", "Please select a valid image file"))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim()) {
      setError(t("userProfile.errors.usernameRequired", "Username is required"))
      return
    }

    // Validate password confirmation if password is being set
    if (password && password !== confirmPassword) {
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

      // Include password if it was changed
      if (password) {
        updateRequest.password = password
      }

      // Handle avatar update
      if (avatarRemoved) {
        // User explicitly removed avatar
        updateRequest.avatar = null
      } else if (avatarFile && uploadedAvatarDataUrl) {
        // User uploaded a new avatar
        updateRequest.avatar = createAvatarBase64(uploadedAvatarDataUrl)
      }
      // else: avatar remains undefined (don't change avatar)

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
    setUploadedAvatarDataUrl(null) // Reset any uploaded avatar
    setAvatarFile(null)
    setAvatarRemoved(false) // Reset avatar removal flag
    setError("")
    closeDialog()
  }

  // Check if form is valid
  const isFormValid = () => {
    // Username is required
    if (!username.trim()) {
      return false
    }

    // If password is being set, confirm password must match
    if (password && password !== confirmPassword) {
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
              <AvatarImage src={getAvatarApiUrl(displayAvatar)} alt={username} />
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
                    {displayAvatar
                      ? t("userProfile.changeAvatar", "Change Avatar")
                      : t("userProfile.uploadAvatar", "Upload Avatar")}
                  </span>
                </Button>
              </Label>
              {avatarFile && <p className="text-xs text-muted-foreground">{avatarFile.name}</p>}
              {displayAvatar && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAvatarFile(null)
                    setUploadedAvatarDataUrl(null)
                    setAvatarRemoved(true)
                  }}
                >
                  {t("userProfile.removeAvatar", "Remove Avatar")}
                </Button>
              )}
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

          {/* Password Field */}
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
            {password && (
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
