"use client"

import { useState, useEffect } from "react"
import { getAppVersion } from "@/lib/utils/version"

interface GitHubRelease {
  tag_name: string
  name: string
  published_at: string
  html_url: string
  draft: boolean
  prerelease: boolean
}

interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion?: string
  releaseUrl?: string
  loading: boolean
  error?: string
}

function compareVersions(current: string, latest: string): boolean {
  // Remove 'v' prefix if present
  const currentClean = current.replace(/^v/, "")
  const latestClean = latest.replace(/^v/, "")

  // Split versions into parts
  const currentParts = currentClean.split(".").map(Number)
  const latestParts = latestClean.split(".").map(Number)

  // Compare each part
  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0
    const latestPart = latestParts[i] || 0

    if (latestPart > currentPart) return true
    if (latestPart < currentPart) return false
  }

  return false
}

export function useUpdateChecker(): UpdateInfo {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    hasUpdate: false,
    currentVersion: getAppVersion(),
    loading: true,
  })

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const response = await fetch(
          "https://api.github.com/repos/dohsimpson/TaskTrove/releases/latest",
        )

        if (!response.ok) {
          throw new Error(`Failed to fetch release info: ${response.status}`)
        }

        const release: GitHubRelease = await response.json()

        // Skip draft and prerelease versions
        if (release.draft || release.prerelease) {
          setUpdateInfo((prev) => ({
            ...prev,
            loading: false,
          }))
          return
        }

        const hasUpdate = compareVersions(getAppVersion(), release.tag_name)

        setUpdateInfo({
          hasUpdate,
          currentVersion: getAppVersion(),
          latestVersion: release.tag_name,
          releaseUrl: release.html_url,
          loading: false,
        })
      } catch (error) {
        setUpdateInfo((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }))
      }
    }

    checkForUpdates()

    // Check for updates every hour
    const interval = setInterval(checkForUpdates, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  return updateInfo
}
