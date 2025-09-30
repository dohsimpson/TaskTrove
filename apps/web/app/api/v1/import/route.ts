import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"
import {
  withFileOperationLogging,
  withApiLogging,
  type EnhancedRequest,
} from "@/lib/middleware/api-logger"
import { withMutexProtection } from "@/lib/utils/api-mutex"
import { withAuthentication } from "@/lib/middleware/auth"
import { withApiVersion } from "@/lib/middleware/api-version"
import { createErrorResponse } from "@/lib/utils/validation"
import { log } from "@/lib/utils/logger"
import { DataFile, DataFileSchema, JsonSchema, ApiErrorCode } from "@/lib/types"
import type { ErrorResponse, ProjectId, LabelId } from "@/lib/types"
import { migrateDataFile, needsMigration, getMigrationInfo } from "@/lib/utils/data-migration"

interface ImportResponse {
  success: boolean
  importedTasks: number
  importedProjects: number
  importedLabels: number
  duplicatesSkipped: number
  duplicateTasksSkipped: number
  duplicateProjectsSkipped: number
  duplicateLabelsSkipped: number
  message: string
}

async function importData(
  request: EnhancedRequest,
): Promise<NextResponse<ImportResponse | ErrorResponse>> {
  try {
    // Parse request body
    const body = await request.json()

    // Validate import data structure - accepts any JSON object
    const rawImportData = JsonSchema.parse(body)

    // Get migration info for the import data
    const requiresMigration = needsMigration(rawImportData)
    const migrationInfo = getMigrationInfo(rawImportData)

    log.info(
      {
        module: "import",
        ...migrationInfo,
      },
      "Processing import request with potential migration",
    )

    // Apply migration to import data only if needed
    let importData: DataFile
    try {
      if (requiresMigration) {
        importData = migrateDataFile(rawImportData)
        log.info(
          {
            module: "import",
            finalVersion: importData.version,
            tasksCount: importData.tasks.length,
            projectsCount: importData.projects.length,
            labelsCount: importData.labels.length,
          },
          "Import data migrated successfully",
        )
      } else {
        // No migration needed, validate and use data as-is
        importData = DataFileSchema.parse(rawImportData)
        log.info(
          {
            module: "import",
            currentVersion: importData.version,
            tasksCount: importData.tasks.length,
            projectsCount: importData.projects.length,
            labelsCount: importData.labels.length,
          },
          "Import data already in current format",
        )
      }
    } catch (migrationError) {
      log.error(
        { error: migrationError, module: "import" },
        requiresMigration
          ? "Failed to migrate import data"
          : "Failed to validate import data format",
      )
      return createErrorResponse(
        "Invalid import data format",
        requiresMigration
          ? `Failed to migrate import data: ${migrationError instanceof Error ? migrationError.message : String(migrationError)}`
          : `Invalid data format: ${migrationError instanceof Error ? migrationError.message : String(migrationError)}`,
        400,
        ApiErrorCode.INVALID_IMPORT_FORMAT,
      )
    }

    // Read current data file
    const currentData = await withFileOperationLogging(
      () => safeReadDataFile(),
      "read-data-file-for-import",
    )

    if (!currentData) {
      return createErrorResponse(
        "Failed to read current data",
        "Unable to access current data file",
        500,
        ApiErrorCode.DATA_FILE_READ_ERROR,
      )
    }

    // Merge import data with existing data
    const mergedData: DataFile = {
      ...currentData,
      // Use imported data version if it's newer or current version if same/older
      version: importData.version,
    }

    let importedTasks = 0
    let importedProjects = 0
    let importedLabels = 0
    let duplicatesSkipped = 0
    let duplicateTasksSkipped = 0
    let duplicateProjectsSkipped = 0
    let duplicateLabelsSkipped = 0

    // Import labels first (no dependencies)
    for (const label of importData.labels) {
      const existingLabel = mergedData.labels.find((l) => l.id === label.id)
      if (existingLabel) {
        duplicateLabelsSkipped++
        log.debug({ labelId: label.id }, "Skipping duplicate label")
      } else {
        mergedData.labels.push(label)
        importedLabels++
        log.debug({ labelId: label.id, name: label.name }, "Imported label")
      }
    }

    // Import projects (no dependencies)
    for (const project of importData.projects) {
      const existingProject = mergedData.projects.find((p) => p.id === project.id)
      if (existingProject) {
        duplicateProjectsSkipped++
        log.debug({ projectId: project.id }, "Skipping duplicate project")
      } else {
        mergedData.projects.push(project)
        importedProjects++
        log.debug({ projectId: project.id, name: project.name }, "Imported project")
      }
    }

    // Import tasks (depend on projects and labels)
    for (const task of importData.tasks) {
      const existingTask = mergedData.tasks.find((t) => t.id === task.id)
      if (existingTask) {
        duplicateTasksSkipped++
        log.debug({ taskId: task.id }, "Skipping duplicate task")
      } else {
        // Verify referenced entities exist
        let canImport = true

        // Check project exists
        if (task.projectId && !mergedData.projects.find((p) => p.id === task.projectId)) {
          log.warn(
            { taskId: task.id, projectId: task.projectId },
            "Skipping task - project not found",
          )
          canImport = false
        }

        // Check labels exist and filter out invalid ones
        const validLabels = task.labels.filter((labelId) => {
          const labelExists = mergedData.labels.find((l) => l.id === labelId)
          if (!labelExists) {
            log.warn(
              { taskId: task.id, labelId },
              "Removing non-existent label reference from task",
            )
          }
          return labelExists
        })
        // Update task with only valid labels
        task.labels = validLabels

        if (canImport) {
          mergedData.tasks.push(task)
          importedTasks++
          log.debug({ taskId: task.id, title: task.title }, "Imported task")
        }
      }
    }

    // Merge project groups and label groups
    // Only merge items that exist in the merged data
    const existingProjectIds = new Set(mergedData.projects.map((p) => p.id))
    const existingLabelIds = new Set(mergedData.labels.map((l) => l.id))

    // Update project groups to include any new projects (only string IDs, not nested groups)
    const importedProjectItems: ProjectId[] = []
    const currentProjectItems: ProjectId[] = []

    for (const item of importData.projectGroups.items) {
      if (typeof item === "string" && existingProjectIds.has(item)) {
        importedProjectItems.push(item)
      }
    }

    for (const item of mergedData.projectGroups.items) {
      if (typeof item === "string") {
        currentProjectItems.push(item)
      }
    }

    const allProjectItems = [...new Set([...currentProjectItems, ...importedProjectItems])]
    mergedData.projectGroups = {
      ...mergedData.projectGroups,
      items: allProjectItems,
    }

    // Update label groups to include any new labels (only string IDs, not nested groups)
    const importedLabelItems: LabelId[] = []
    const currentLabelItems: LabelId[] = []

    for (const item of importData.labelGroups.items) {
      if (typeof item === "string" && existingLabelIds.has(item)) {
        importedLabelItems.push(item)
      }
    }

    for (const item of mergedData.labelGroups.items) {
      if (typeof item === "string") {
        currentLabelItems.push(item)
      }
    }

    const allLabelItems = [...new Set([...currentLabelItems, ...importedLabelItems])]
    mergedData.labelGroups = {
      ...mergedData.labelGroups,
      items: allLabelItems,
    }

    // Calculate total duplicates skipped
    duplicatesSkipped = duplicateTasksSkipped + duplicateProjectsSkipped + duplicateLabelsSkipped

    // Write updated data file
    const writeSuccess = await withFileOperationLogging(
      () => safeWriteDataFile({ data: mergedData }),
      "write-data-file-after-import",
    )

    if (!writeSuccess) {
      return createErrorResponse(
        "Failed to save imported data",
        "Unable to write updated data file",
        500,
        ApiErrorCode.DATA_FILE_WRITE_ERROR,
      )
    }

    const response: ImportResponse = {
      success: true,
      importedTasks,
      importedProjects,
      importedLabels,
      duplicatesSkipped,
      duplicateTasksSkipped,
      duplicateProjectsSkipped,
      duplicateLabelsSkipped,
      message: `Successfully imported ${importedTasks} tasks, ${importedProjects} projects, and ${importedLabels} labels. ${duplicatesSkipped} duplicates were skipped.`,
    }

    log.info(
      {
        module: "import",
        ...response,
      },
      "Import completed successfully",
    )

    return NextResponse.json(response)
  } catch (error) {
    log.error({ error, module: "import" }, "Import failed")

    if (error instanceof z.ZodError) {
      return createErrorResponse(
        "Invalid import data format",
        "The uploaded file does not contain valid JSON data",
        400,
        ApiErrorCode.INVALID_IMPORT_FORMAT,
      )
    }

    return createErrorResponse(
      "Import failed",
      error instanceof Error ? error.message : "An unknown error occurred",
      500,
      ApiErrorCode.IMPORT_FAILED,
    )
  }
}

export const POST = withApiVersion(
  withMutexProtection(
    withAuthentication(
      withApiLogging(importData, {
        endpoint: "/api/v1/import",
        module: "api-v1-import",
      }),
    ),
  ),
)
