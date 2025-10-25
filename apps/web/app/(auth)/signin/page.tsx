import { LoginPage } from "@/components/auth/login-page"
import { EnsureUserFile } from "@/components/auth/ensure-user-file"
import { checkPasswordSetupNeeded } from "@/lib/utils/data-initialization"

// Force dynamic rendering to prevent build-time file access by checkPasswordSetupNeeded
export const dynamic = "force-dynamic"

export default async function SignIn() {
  const needsPasswordSetup = await checkPasswordSetupNeeded()

  return (
    <EnsureUserFile>
      <LoginPage needsPasswordSetup={needsPasswordSetup} />
    </EnsureUserFile>
  )
}
