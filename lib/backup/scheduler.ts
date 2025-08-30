import cron from "node-cron"
import { readFile } from "fs/promises"
import { runBackup } from "./backup"
import { DEFAULT_SETTINGS_FILE_PATH, DEFAULT_BACKUP_TIME } from "@/lib/constants/defaults"
import type { UserSettings } from "@/lib/types"

let isSchedulerInitialized = false
let currentBackupJob: ReturnType<typeof cron.schedule> | null = null

async function loadBackupTimeFromSettings(): Promise<string> {
  try {
    const settingsContent = await readFile(DEFAULT_SETTINGS_FILE_PATH, "utf8")
    const settings: UserSettings = JSON.parse(settingsContent)
    return settings.integrations?.backupTime || DEFAULT_BACKUP_TIME
  } catch {
    console.log(`Could not load backup time from settings, using default ${DEFAULT_BACKUP_TIME}`)
    return DEFAULT_BACKUP_TIME
  }
}

function createCronExpression(timeString: string): string {
  const [hour, minute] = timeString.split(":").map(Number)
  // Format: minute hour day-of-month month day-of-week
  return `${minute} ${hour} * * *`
}

export async function initializeScheduler() {
  if (isSchedulerInitialized) {
    console.log("Scheduler already initialized.")
    return
  }

  console.log("Initializing scheduler...")

  // Load backup time from settings
  const backupTime = await loadBackupTimeFromSettings()
  const cronExpression = createCronExpression(backupTime)

  console.log(`Scheduling backup for ${backupTime} daily (cron: ${cronExpression})`)

  // Schedule backup to run daily at the configured time
  currentBackupJob = cron.schedule(cronExpression, async () => {
    console.log(`[${new Date().toISOString()}] Running scheduled daily backup task...`)
    try {
      await runBackup()
      console.log(`[${new Date().toISOString()}] Scheduled backup task completed successfully.`)
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Scheduled backup task failed:`, err)
    }
  })

  // Start the scheduled job
  currentBackupJob.start()

  console.log(`Scheduler initialized. Daily backup scheduled for ${backupTime} server time.`)
  isSchedulerInitialized = true

  // Graceful shutdown handling
  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received. Stopping scheduler...")
    currentBackupJob?.stop()
    // Add cleanup for other jobs if needed
    process.exit(0)
  })

  process.on("SIGINT", () => {
    console.log("SIGINT signal received. Stopping scheduler...")
    currentBackupJob?.stop()
    // Add cleanup for other jobs if needed
    process.exit(0)
  })

  // --- Add other scheduled tasks here in the future ---
  // Example:
  // cron.schedule('* * * * *', () => {
  //   console.log('Running every minute');
  // });
}
