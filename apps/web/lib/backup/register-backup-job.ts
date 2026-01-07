import { Scheduler } from "@tasktrove/scheduler"
import { DEFAULT_AUTO_BACKUP_RUN_ON_INIT, DEFAULT_BACKUP_TIME } from "@tasktrove/constants"

import { safeReadDataFile } from "@/lib/utils/safe-file-operations"
import { runBackup } from "./backup"

const DAILY_BACKUP_JOB_ID = "daily-backup"

type BackupScheduleConfig = {
  backupTime: string
  enabled: boolean
  runOnInit: boolean
}

export async function registerBackupJob(scheduler: Scheduler) {
  const { backupTime, enabled, runOnInit } = await loadBackupScheduleConfig()

  if (!enabled) {
    const removed = scheduler.unregister(DAILY_BACKUP_JOB_ID)
    if (removed) {
      console.log("Auto backup disabled. Existing backup job removed from scheduler.")
    } else {
      console.log("Auto backup disabled. No backup job registered.")
    }
    return
  }

  const cronExpression = createCronExpression(backupTime)

  console.log(`Scheduling backup for ${backupTime} daily (cron: ${cronExpression})`)

  scheduler.register(
    {
      id: DAILY_BACKUP_JOB_ID,
      schedule: {
        type: "cron",
        expression: cronExpression,
      },
      runOnInit,
      handler: async () => {
        console.log(`[${new Date().toISOString()}] Running scheduled daily backup task...`)
        try {
          await runBackup()
          console.log(`[${new Date().toISOString()}] Scheduled backup task completed successfully.`)
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Scheduled backup task failed:`, error)
        }
      },
    },
    { replace: true },
  )
}

async function loadBackupScheduleConfig(): Promise<BackupScheduleConfig> {
  try {
    const dataFile = await safeReadDataFile()
    if (!dataFile) {
      console.log(
        `Could not load data file, using defaults (enabled: true, backup time ${DEFAULT_BACKUP_TIME})`,
      )
      return {
        backupTime: DEFAULT_BACKUP_TIME,
        enabled: true,
        runOnInit: DEFAULT_AUTO_BACKUP_RUN_ON_INIT,
      }
    }
    const autoBackupSettings = dataFile.settings.data.autoBackup
    const enabled = autoBackupSettings.enabled !== false
    const backupTime = autoBackupSettings.backupTime || DEFAULT_BACKUP_TIME
    const runOnInit = autoBackupSettings.runOnInit ?? DEFAULT_AUTO_BACKUP_RUN_ON_INIT
    return { backupTime, enabled, runOnInit }
  } catch {
    console.log(
      `Could not load backup settings, using defaults (enabled: true, backup time ${DEFAULT_BACKUP_TIME})`,
    )
    return {
      backupTime: DEFAULT_BACKUP_TIME,
      enabled: true,
      runOnInit: DEFAULT_AUTO_BACKUP_RUN_ON_INIT,
    }
  }
}

function createCronExpression(timeString: string): string {
  const [hour, minute] = timeString.split(":").map(Number)
  return `${minute} ${hour} * * *`
}
