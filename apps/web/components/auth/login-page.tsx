"use client"

import { useRouter } from "next/navigation"
import { DynamicLoginForm } from "@/components/auth/dynamic-login-form"
import { LoginPageShell } from "@/components/auth/login-page-shell"

interface LoginPageProps {
  needsPasswordSetup: boolean
}

export function LoginPage({ needsPasswordSetup }: LoginPageProps) {
  const router = useRouter()

  const handleLoginSuccess = () => {
    router.push("/")
  }

  return (
    <LoginPageShell>
      <DynamicLoginForm needsPasswordSetup={needsPasswordSetup} onSuccess={handleLoginSuccess} />
    </LoginPageShell>
  )
}
