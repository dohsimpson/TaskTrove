"use client"

import React, { useState } from "react"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { TaskTroveLogo } from "@/components/ui/custom/tasktrove-logo"
import { TaskTroveIcon } from "@/components/ui/custom/tasktrove-icon"
import { useLanguage } from "@/components/providers/language-provider"
import { useTranslation } from "@/lib/i18n/client"

export interface LoginFormProps {
  needsPasswordSetup: boolean
  onSuccess?: () => void
  onCancel?: () => void
}

export function LoginForm({
  needsPasswordSetup: initialNeedsPasswordSetup,
  onSuccess,
  onCancel: _onCancel,
}: LoginFormProps) {
  // Translation hooks
  const { language } = useLanguage()
  const { t } = useTranslation(language, "auth")

  // Local state to track if password setup is still needed
  // This allows us to transition from setup mode to login mode after password is set
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(initialNeedsPasswordSetup)

  // Form state
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!password) {
      setError(t("errors.passwordRequired", "Password is required"))
      return
    }

    // If user needs to set up password, handle password setup
    if (needsPasswordSetup) {
      // Validate password confirmation
      if (password !== confirmPassword) {
        setError(t("errors.passwordMismatch", "Passwords do not match"))
        return
      }

      setIsLoading(true)
      try {
        // Set up password using initial-setup endpoint
        const response = await fetch("/api/initial-setup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password: password,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to set up password")
        }

        const data = await response.json()

        toast.success(
          t("messages.passwordSetSuccess", "Password set successfully! Please sign in."),
        )

        // Clear form and switch to login mode
        setPassword("")
        setConfirmPassword("")
        setNeedsPasswordSetup(false)

        // Note: needsPasswordSetup is now false, so form will switch to login mode
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t("errors.passwordSetupFailed", "Failed to set password. Please try again."),
        )
      } finally {
        setIsLoading(false)
      }
      return
    }

    // Normal login flow
    setIsLoading(true)
    try {
      const result = await signIn("credentials", {
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(t("errors.invalidPassword", "Invalid password. Please try again."))
        setIsLoading(false)
        setPassword("")
      } else {
        toast.success(t("messages.loginSuccess", "Login successful"))
        onSuccess?.()
      }
    } catch (error) {
      setError(t("errors.loginFailed", "Login failed. Please check your credentials."))
      console.error("Login error:", error)
      setIsLoading(false)
      setPassword("")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md gap-0">
        <CardHeader className="text-center space-y-4 p-6">
          <div className="flex flex-col items-center space-y-3">
            <TaskTroveIcon size="lg" />
            <TaskTroveLogo size="lg" />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-xs mx-auto">
            {needsPasswordSetup ? (
              // Password Setup Mode
              <>
                <div className="text-center space-y-2 mb-4">
                  <h2 className="text-lg font-semibold">{t("setup.title", "First Time Setup")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "setup.description",
                      "Welcome! Let's complete your initial setup to get started.",
                    )}
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t("setup.passwordPlaceholder", "Create Password")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        className={
                          error
                            ? "border-red-500" + (password.length > 0 ? " pr-10" : "")
                            : password.length > 0
                              ? "pr-10"
                              : ""
                        }
                        autoFocus={true}
                      />
                      {password.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={
                            showPassword
                              ? t("accessibility.hidePassword", "Hide password")
                              : t("accessibility.showPassword", "Show password")
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("setup.confirmPasswordPlaceholder", "Confirm Password")}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      className={error ? "border-red-500" : ""}
                    />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                </div>
              </>
            ) : (
              // Normal Login Mode
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("login.passwordPlaceholder", "Password")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className={
                      error
                        ? "border-red-500" + (password.length > 0 ? " pr-10" : "")
                        : password.length > 0
                          ? "pr-10"
                          : ""
                    }
                    autoFocus={true}
                  />
                  {password.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword
                          ? t("accessibility.hidePassword", "Hide password")
                          : t("accessibility.showPassword", "Show password")
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  )}
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? needsPasswordSetup
                  ? t("buttons.settingUp", "Setting up...")
                  : t("buttons.signingIn", "Signing in...")
                : needsPasswordSetup
                  ? t("buttons.initialize", "Initialize")
                  : t("buttons.signIn", "Sign In")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
