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

interface LoginFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function LoginForm({ onSuccess, onCancel: _onCancel }: LoginFormProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!password.trim()) {
      setError("Password is required")
      return
    }

    setIsLoading(true)
    try {
      const result = await signIn("credentials", {
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid password. Please try again.")
      } else {
        toast.success("Login successful")
        onSuccess?.()
      }
    } catch (error) {
      setError("Login failed. Please check your credentials.")
      console.error("Login error:", error)
    } finally {
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
            <div className="space-y-2">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
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
                    aria-label={showPassword ? "Hide password" : "Show password"}
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
