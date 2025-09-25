"use client"

import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"

export function LoginPage() {
  const router = useRouter()

  const handleLoginSuccess = () => {
    router.push("/")
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 p-4 sm:p-6 bg-muted bg-center bg-no-repeat">
      {/* Background overlay with blur effect */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-sm sm:max-w-md flex-col gap-6">
        <LoginForm onSuccess={handleLoginSuccess} />
      </div>
    </div>
  )
}
