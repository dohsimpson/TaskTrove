import { LoginPage } from "@/components/auth/login-page"
import { checkPasswordSetupNeeded } from "@/lib/utils/data-initialization"

export default async function SignIn() {
  const needsPasswordSetup = await checkPasswordSetupNeeded()

  return <LoginPage needsPasswordSetup={needsPasswordSetup} />
}
