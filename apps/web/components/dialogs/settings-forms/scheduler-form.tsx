"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { format } from "date-fns"
import { useAtomValue, useSetAtom } from "jotai"
import type { LucideIcon } from "lucide-react"
import { Clock10, RefreshCw, AlertCircle, Loader2, Info, Play, Settings } from "lucide-react"
import { toast } from "@/lib/toast"
import { useTranslation } from "@tasktrove/i18n"
import { updateSettingsAtom } from "@tasktrove/atoms/core/settings"
import { DEFAULT_AUTO_BACKUP_RUN_ON_INIT, DEFAULT_BACKUP_TIME } from "@tasktrove/constants"
import type { GetSchedulerJobsResponse } from "@tasktrove/types/api-responses"
import type { DataSettings } from "@tasktrove/types/settings"
import { API_ROUTES } from "@tasktrove/types/constants"
import { SettingsCard } from "@/components/ui/custom/settings-card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ProBadge } from "@/components/ui/custom/pro-badge"
import { settingsAtom } from "@tasktrove/atoms/data/base/atoms"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import type { SettingsCategoryId } from "@tasktrove/atoms/ui/settings"
import { navigateToSettingsCategoryAtom } from "@tasktrove/atoms/ui/settings"
import { CommitInput } from "@/components/ui/custom/commit-input"
import { formatDateDisplay, formatTimeOfDay } from "@/lib/utils/task-date-formatter"

export type SchedulerJobConfig = {
  label: string
  content?: ReactNode
  dialogTitle?: string
  onOpen?: () => void
}

export type SchedulerJobRow = {
  id: string
  title: string
  description: string
  scheduleLabel: string
  scheduleType: "time" | "cron"
  scheduleValue: string
  /**
   * Commit a new schedule value. Base form decides when to call this (on change or blur).
   */
  onScheduleCommit?: (value: string) => void
  /**
   * When true (default), commits on every change; when false, commits on blur only.
   */
  commitOnChange?: boolean
  enabled: boolean
  onToggle?: (checked: boolean) => void
  runLabel: string
  runIcon: LucideIcon
  onRun?: () => void | Promise<void>
  running: boolean
  proOnly?: boolean
  scheduleHint?: string
  runOnInit?: boolean
  runOnInitLabel?: string
  onRunOnInitToggle?: (checked: boolean) => void
  config?: SchedulerJobConfig
}

export type SchedulerRowBuilderContext = {
  t: ReturnType<typeof useTranslation>["t"]
  dataSettings: DataSettings
  updateDataSettings: (updates: Partial<DataSettings>) => Promise<void>
  wrapAction: (id: string, action: () => Promise<void>) => () => Promise<void>
  isActionRunning: (id: string) => boolean
  navigateToCategory: (categoryId: SettingsCategoryId, sectionId?: string) => void
}

export type SchedulerJobsFormBaseProps = {
  buildRows?: (context: SchedulerRowBuilderContext) => SchedulerJobRow[]
}

interface FetchOptions {
  initial?: boolean
}

function AutoBackupConfig({
  maxBackups,
  onCommit,
}: {
  maxBackups: number
  onCommit: (value: number) => void
}) {
  const { t } = useTranslation("settings")

  const commit = (next: string) => {
    const trimmed = next.trim()
    if (!trimmed) {
      return false
    }
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) {
      return false
    }
    const normalized = parsed < -1 ? -1 : Math.floor(parsed)
    onCommit(normalized)
    return true
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between">
        <div className="space-y-1">
          <Label htmlFor="scheduler-max-backups">
            {t("scheduler.jobs.backup.config.maxBackups.label", "Max backup count")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t(
              "scheduler.jobs.backup.config.maxBackups.description",
              "Use -1 to keep unlimited backups.",
            )}
          </p>
        </div>
        <CommitInput
          id="scheduler-max-backups"
          type="number"
          value={String(maxBackups)}
          onCommit={commit}
          commitOnChange={false}
          min={-1}
          step={1}
          className="w-32"
        />
      </div>
    </div>
  )
}

export function buildBaseSchedulerRows({
  t,
  dataSettings,
  updateDataSettings,
  wrapAction,
  isActionRunning,
}: SchedulerRowBuilderContext): SchedulerJobRow[] {
  const autoBackup = dataSettings.autoBackup
  const runOnInit = autoBackup.runOnInit ?? DEFAULT_AUTO_BACKUP_RUN_ON_INIT
  const maxBackups = autoBackup.maxBackups

  const handleToggleAutoBackup = (checked: boolean) => {
    void updateDataSettings({
      autoBackup: {
        ...autoBackup,
        enabled: checked,
      },
    })
  }

  const setBackupTime = (value: string) => {
    if (!value) return
    void updateDataSettings({
      autoBackup: {
        ...autoBackup,
        backupTime: value,
      },
    })
  }

  const setRunOnInit = (checked: boolean) => {
    void updateDataSettings({
      autoBackup: {
        ...autoBackup,
        runOnInit: checked,
      },
    })
  }

  const setMaxBackups = (value: number) => {
    void updateDataSettings({
      autoBackup: {
        ...autoBackup,
        maxBackups: value,
      },
    })
  }

  const triggerManualBackup = wrapAction("manual-backup", async () => {
    const response = await fetch(API_ROUTES.BACKUP, { method: "POST" })
    if (response.ok) {
      toast.success("Manual backup triggered successfully")
    } else {
      toast.error("Failed to trigger manual backup")
    }
  })

  return [
    {
      id: "daily-backup",
      title: t("scheduler.jobs.backup.title", "Daily backup"),
      description: t(
        "scheduler.jobs.backup.description",
        "Creates a backup archive of tasks and projects at the chosen time.",
      ),
      scheduleLabel: t("scheduler.jobs.backup.scheduleLabel", "Run time"),
      scheduleType: "time",
      scheduleValue: autoBackup.backupTime || DEFAULT_BACKUP_TIME,
      onScheduleCommit: (value) => setBackupTime(value),
      enabled: autoBackup.enabled,
      onToggle: handleToggleAutoBackup,
      runLabel: t("scheduler.jobs.backup.run", "Run backup now"),
      runIcon: Play,
      onRun: triggerManualBackup,
      running: isActionRunning("manual-backup"),
      runOnInit,
      runOnInitLabel: t("scheduler.jobs.backup.runOnInit", "Run once on scheduler start"),
      onRunOnInitToggle: setRunOnInit,
      config: {
        label: t("scheduler.jobs.backup.config.label", "Configure backup"),
        dialogTitle: t("scheduler.jobs.backup.config.title", "Backup settings"),
        content: <AutoBackupConfig maxBackups={maxBackups} onCommit={setMaxBackups} />,
      },
    },
  ]
}

export function SchedulerJobsFormBase({
  buildRows = buildBaseSchedulerRows,
}: SchedulerJobsFormBaseProps) {
  const { t } = useTranslation("settings")
  const settings = useAtomValue(settingsAtom)
  const dataSettings = settings.data
  const writeSettings = useSetAtom(updateSettingsAtom)
  const setNavigateToCategory = useSetAtom(navigateToSettingsCategoryAtom)

  const use24HourTime = Boolean(settings.uiSettings.use24HourTime)
  const preferDayMonthFormat = Boolean(settings.general.preferDayMonthFormat)

  const [schedulerRunning, setSchedulerRunning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serverTime, setServerTime] = useState<string | null>(null)
  const [actionRunning, setActionRunning] = useState<Record<string, boolean>>({})

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
      setSchedulerRunning(payload.running)
      setServerTime(payload.serverTime)
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

  const updateDataSettings = useCallback(
    async (updates: Partial<DataSettings>) => {
      try {
        await writeSettings({
          data: {
            ...updates,
          },
        })
        await fetchJobs()
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update settings"
        setError(message)
      }
    },
    [fetchJobs, writeSettings],
  )

  const wrapAction = useCallback((id: string, action: () => Promise<void>) => {
    return async () => {
      setActionRunning((prev) => ({ ...prev, [id]: true }))
      try {
        await action()
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown action error"
        toast.error(message)
      } finally {
        setActionRunning((prev) => ({ ...prev, [id]: false }))
      }
    }
  }, [])

  const context = useMemo<SchedulerRowBuilderContext>(
    () => ({
      t,
      dataSettings,
      updateDataSettings,
      wrapAction,
      isActionRunning: (id) => Boolean(actionRunning[id]),
      navigateToCategory: (categoryId, sectionId) => {
        setNavigateToCategory(categoryId)
        if (!sectionId) return
        setTimeout(() => {
          const target = document.getElementById(sectionId)
          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        }, 0)
      },
    }),
    [actionRunning, dataSettings, setNavigateToCategory, t, updateDataSettings, wrapAction],
  )

  const jobRows = useMemo(() => buildRows(context), [buildRows, context])

  const schedulerStateLabel = schedulerRunning
    ? t("scheduler.state.running", "Running")
    : t("scheduler.state.stopped", "Stopped")

  const formattedServerTime = useMemo(() => {
    if (!serverTime) return null
    const date = new Date(serverTime)
    if (Number.isNaN(date.getTime())) return null
    return `${formatDateDisplay(date, {
      includeYear: true,
      preferDayMonthFormat,
    })} ${formatTimeOfDay(date, { use24HourTime })} ${format(date, "zzz")}`
  }, [preferDayMonthFormat, serverTime, use24HourTime])

  const manualRefresh = () => {
    void fetchJobs()
  }

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
            <Badge variant={schedulerRunning ? "default" : "secondary"}>
              {schedulerStateLabel}
            </Badge>
            {refreshing && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>
          {formattedServerTime && (
            <p className="text-xs text-muted-foreground mt-1">
              {t("scheduler.state.serverTime", "Server time")}: {formattedServerTime}
            </p>
          )}
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
        <p className="text-sm font-medium mb-2">{t("scheduler.jobs.title", "Scheduled Jobs")}</p>
        <div className="rounded-md border overflow-hidden">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">
                    {t("scheduler.jobs.columns.enabled", "Enabled")}
                  </TableHead>
                  <TableHead>{t("scheduler.jobs.columns.name", "Job")}</TableHead>
                  <TableHead>{t("scheduler.jobs.columns.schedule", "Schedule")}</TableHead>
                  <TableHead className="text-center">
                    {t("scheduler.jobs.columns.config", "Config")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("scheduler.jobs.columns.runOnStart", "Run on start")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("scheduler.jobs.columns.run", "Run")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobRows.map((row) => {
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-center">
                        <Switch
                          checked={row.enabled}
                          onCheckedChange={row.onToggle}
                          disabled={!row.onToggle}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{row.title}</span>
                            {row.proOnly && <ProBadge />}
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  aria-label={t("scheduler.jobs.infoLabel", "Job details")}
                                >
                                  <Info className="size-4 text-muted-foreground" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="max-w-xs text-sm">
                                {row.description}
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <CommitInput
                            id={`${row.id}-schedule`}
                            type={row.scheduleType === "time" ? "time" : "text"}
                            value={row.scheduleValue}
                            onCommit={
                              row.onScheduleCommit
                                ? (value) => {
                                    if (!value) return false
                                    row.onScheduleCommit?.(value)
                                    return true
                                  }
                                : undefined
                            }
                            commitOnChange={row.commitOnChange}
                            ariaLabel={row.scheduleLabel}
                            className={
                              row.scheduleType === "time" ? "w-32" : "w-56 font-mono text-xs"
                            }
                          />
                          {row.scheduleHint ? (
                            <p className="text-xs text-muted-foreground">{row.scheduleHint}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {row.config ? (
                          row.config.content ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  aria-label={row.config.label}
                                >
                                  <Settings className="size-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                {row.config.dialogTitle ? (
                                  <DialogHeader>
                                    <DialogTitle>{row.config.dialogTitle}</DialogTitle>
                                  </DialogHeader>
                                ) : null}
                                {row.config.content}
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              aria-label={row.config.label}
                              onClick={row.config.onOpen}
                            >
                              <Settings className="size-4" />
                            </Button>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.onRunOnInitToggle ? (
                          <Switch
                            checked={row.runOnInit ?? false}
                            onCheckedChange={row.onRunOnInitToggle}
                            aria-label={row.runOnInitLabel}
                            disabled={!row.onRunOnInitToggle}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={row.onRun}
                          disabled={row.running || !row.onRun}
                          aria-label={row.runLabel}
                        >
                          {row.running ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <row.runIcon className="size-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </SettingsCard>
  )
}

export function SchedulerJobsForm() {
  return <SchedulerJobsFormBase />
}
