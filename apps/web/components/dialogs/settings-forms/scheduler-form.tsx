"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Clock10, RefreshCw, AlertCircle, Loader2, Archive } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@tasktrove/i18n"
import { dataSettingsAtom, updateSettingsAtom } from "@tasktrove/atoms/core/settings"
import { DEFAULT_BACKUP_TIME } from "@tasktrove/constants"
import type { GetSchedulerJobsResponse, SchedulerJob } from "@tasktrove/types/api-responses"
import { API_ROUTES } from "@tasktrove/types/constants"
import { SettingsCard } from "@/components/ui/custom/settings-card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

interface FetchOptions {
  initial?: boolean
}

export function SchedulerJobsForm() {
  const { t } = useTranslation("settings")
  const dataSettings = useAtomValue(dataSettingsAtom)
  const writeSettings = useSetAtom(updateSettingsAtom)

  const [jobs, setJobs] = useState<SchedulerJob[]>([])
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualBackupRunning, setManualBackupRunning] = useState(false)

  const fetchJobs = useCallback(async (options: FetchOptions = {}) => {
    if (options.initial) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      const response = await fetch(API_ROUTES.V1_SCHEDULER_JOBS, {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`Failed to load scheduler jobs (${response.status})`)
      }

      const payload: GetSchedulerJobsResponse = await response.json()
      setJobs(payload.jobs)
      setRunning(payload.running)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown scheduler error"
      setError(message)
    } finally {
      if (options.initial) {
        setLoading(false)
      } else {
        setRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    void fetchJobs({ initial: true })
  }, [fetchJobs])

  const autoBackup = useMemo(() => dataSettings.autoBackup, [dataSettings.autoBackup])

  const applyAutoBackupUpdate = useCallback(
    async (updates: Partial<typeof autoBackup>) => {
      try {
        await writeSettings({
          data: {
            autoBackup: {
              ...autoBackup,
              ...updates,
            },
          },
        })
        await fetchJobs()
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update backup settings"
        setError(message)
      }
    },
    [autoBackup, fetchJobs, writeSettings],
  )

  const handleToggleAutoBackup = (checked: boolean) => {
    void applyAutoBackupUpdate({ enabled: checked })
  }

  const handleBackupTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    if (!value) return
    void applyAutoBackupUpdate({ backupTime: value })
  }

  const manualRefresh = () => {
    void fetchJobs()
  }

  const triggerManualBackup = async () => {
    setManualBackupRunning(true)
    try {
      const response = await fetch(API_ROUTES.BACKUP, { method: "POST" })
      if (response.ok) {
        toast.success("Manual backup triggered successfully")
      } else {
        toast.error("Failed to trigger manual backup")
      }
    } catch {
      toast.error("Failed to trigger manual backup. Please try again.")
    } finally {
      setManualBackupRunning(false)
    }
  }

  const schedulerStateLabel = running
    ? t("scheduler.state.running", "Running")
    : t("scheduler.state.stopped", "Stopped")

  return (
    <SettingsCard
      title={t("scheduler.title", "Scheduler")}
      description={t(
        "scheduler.description",
        "Monitor and configure background jobs that keep your workspace healthy.",
      )}
      icon={Clock10}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">
            {t("scheduler.state.label", "Scheduler State")}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={running ? "default" : "secondary"}>{schedulerStateLabel}</Badge>
            {refreshing && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={manualRefresh}
          disabled={loading || refreshing}
        >
          <RefreshCw className="mr-2 size-4" />
          {t("scheduler.actions.refresh", "Refresh jobs")}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <p className="text-sm font-medium mb-2">{t("scheduler.jobs.title", "Registered Jobs")}</p>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("scheduler.jobs.columns.id", "Job ID")}</TableHead>
                <TableHead>{t("scheduler.jobs.columns.schedule", "Schedule")}</TableHead>
                <TableHead className="text-right">
                  {t("scheduler.jobs.columns.autoStart", "Auto start")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono text-xs">{job.id}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded-sm">
                      {job.schedule.expression}
                    </code>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={job.autoStart ? "outline" : "secondary"}>
                      {job.autoStart
                        ? t("scheduler.jobs.autoStart.enabled", "Enabled")
                        : t("scheduler.jobs.autoStart.disabled", "Disabled")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && jobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground text-sm">
                    {t("scheduler.jobs.empty", "No scheduled jobs found.")}
                  </TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground text-sm">
                    {t("scheduler.jobs.loading", "Loading jobs...")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="auto-backup-toggle">
              {t("scheduler.controls.enable", "Enable daily backup job")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t(
                "scheduler.controls.enableDescription",
                "Stop or resume running the backup job without touching cron.",
              )}
            </p>
          </div>
          <Switch
            id="auto-backup-toggle"
            checked={autoBackup.enabled}
            onCheckedChange={handleToggleAutoBackup}
          />
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <Label htmlFor="backup-time-input">
              {t("scheduler.controls.backupTime", "Backup start time")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t(
                "scheduler.controls.backupTimeDescription",
                "Set the daily cron start (24-hour time)",
              )}
            </p>
          </div>
          <Input
            id="backup-time-input"
            type="time"
            value={autoBackup.backupTime || DEFAULT_BACKUP_TIME}
            onChange={handleBackupTimeChange}
            className="w-32"
          />
        </div>

        <Separator />

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1 max-w-md">
            <Label>{t("scheduler.controls.manualBackup.title", "Manual backup")}</Label>
            <p className="text-sm text-muted-foreground">
              {t(
                "scheduler.controls.manualBackup.description",
                "Need a one-off backup before big changes? Trigger it instantly.",
              )}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={triggerManualBackup}
            disabled={manualBackupRunning}
            className="w-full md:w-auto"
          >
            {manualBackupRunning ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Archive className="size-4 mr-2" />
            )}
            {t("scheduler.controls.manualBackup.button", "Trigger Manual Backup Now")}
          </Button>
        </div>
      </div>
    </SettingsCard>
  )
}
