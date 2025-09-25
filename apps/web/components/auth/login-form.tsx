"use client"

import React, { useState } from "react"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar"

interface LoginFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

interface LoginFormData {
  password: string
}

export function LoginForm({ onSuccess, onCancel: _onCancel }: LoginFormProps) {
  const [formData, setFormData] = useState<LoginFormData>({
    password: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.password.trim()) {
      newErrors.password = "Password is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      setIsLoading(true)
      try {
        // TODO: Implement actual login API call
        await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulated API call

        toast.success("Login successful")
        onSuccess?.()
      } catch (error) {
        toast.error("Login failed. Please check your credentials.")
        console.error("Login error:", error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        {/* <CardHeader className="text-center pb-2"> */}
        {/*   <div className="flex flex-col items-center gap-4"> */}
        {/*     <Avatar className="w-20 h-20"> */}
        {/*       <AvatarImage src="/placeholder-user.png" alt="User" /> */}
        {/*       <AvatarFallback className="text-2xl">JD</AvatarFallback> */}
        {/*     </Avatar> */}
        {/*     <div className="space-y-1"> */}
        {/*       <h2 className="text-2xl font-semibold">John Doe</h2> */}
        {/*       <p className="text-sm text-muted-foreground">Administrator</p> */}
        {/*     </div> */}
        {/*   </div> */}
        {/* </CardHeader> */}
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  disabled={isLoading}
                  className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                />
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
              </div>
              {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
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
