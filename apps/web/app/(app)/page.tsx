"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAtomValue } from "jotai"
import { settingsAtom } from "@tasktrove/atoms/data/base/atoms"
import { DEFAULT_ROUTE } from "@tasktrove/constants"

export default function HomePage() {
  const router = useRouter()
  const settings = useAtomValue(settingsAtom)

  useEffect(() => {
    // Get the default page from settings, with fallback to DEFAULT_ROUTE
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const generalSettings = (settings as { general: { startView?: string } }).general
    const startView = generalSettings.startView ?? "all"

    let redirectPath: string
    if (startView === "lastViewed") {
      // For now, treat "lastViewed" as default route
      // TODO: Implement localStorage-based last viewed tracking
      redirectPath = DEFAULT_ROUTE
    } else {
      // Map standard view IDs to routes
      redirectPath = `/${startView}`
    }

    router.push(redirectPath)
  }, [router, settings])

  return null
}
