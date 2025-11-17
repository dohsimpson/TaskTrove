"use client"

import { useState, useEffect } from "react"
import { isPro } from "@/lib/utils/env"
import { getAppVersion } from "@/lib/utils/version"
import { compareVersions } from "@tasktrove/utils/version"

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

export function useUpdateChecker(): UpdateInfo {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    hasUpdate: false,
    currentVersion: getAppVersion(),
    loading: true,
  })

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const repository = isPro() ? "TaskTrovePro" : "TaskTrove"
        const response = await fetch(
          `https://api.github.com/repos/dohsimpson/${repository}/releases/latest`,
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

        const hasUpdate = compareVersions(getAppVersion(), release.tag_name) < 0

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
