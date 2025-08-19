import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { safeReadDataFile, safeWriteDataFile } from "@/lib/utils/safe-file-operations"
import { withFileOperationLogging } from "@/lib/middleware/api-logger"
import { createErrorResponse } from "@/lib/utils/validation"
import { log } from "@/lib/utils/logger"
import { DataFileSchema, DataFile } from "@/lib/types"
import type { ErrorResponse } from "@/lib/types"

// Import data schema - expects a DataFile format
const ImportDataSchema = DataFileSchema

interface ImportResponse {
  success: boolean
  importedTasks: number
  importedProjects: number
  importedLabels: number
  duplicatesSkipped: number
  message: string
}

async function importData(
  request: NextRequest,
): Promise<NextResponse<ImportResponse | ErrorResponse>> {
  try {
    // Parse request body
    const body = await request.json()

    // Validate import data structure - expecting DataFile format
    const importData = ImportDataSchema.parse(body)

    log.info(
      {
        module: "import",
        tasksCount: importData.tasks.length,
        projectsCount: importData.projects.length,
        labelsCount: importData.labels.length,
      },
      "Processing import request",
    )

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
      )
    }

    // Merge import data with existing data
    const mergedData: DataFile = {
      ...currentData,
    }

    let importedTasks = 0
    let importedProjects = 0
    let importedLabels = 0
    let duplicatesSkipped = 0

    // Import labels first (no dependencies)
    for (const label of importData.labels) {
      const existingLabel = mergedData.labels.find((l) => l.id === label.id)
      if (existingLabel) {
        duplicatesSkipped++
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
        duplicatesSkipped++
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
        duplicatesSkipped++
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

        // Check labels exist
        if (task.labels) {
          for (const labelId of task.labels) {
            if (!mergedData.labels.find((l) => l.id === labelId)) {
              log.warn({ taskId: task.id, labelId }, "Task references non-existent label")
              // Don't block import, just warn
            }
          }
        }

        if (canImport) {
          mergedData.tasks.push(task)
          importedTasks++
          log.debug({ taskId: task.id, title: task.title }, "Imported task")
        }
      }
    }

    // Recalculate ordering to include new items
    const allProjectIds = mergedData.projects.map((p) => p.id)
    const allLabelIds = mergedData.labels.map((l) => l.id)

    // Merge ordering arrays, keeping existing order and adding new items at the end
    const existingProjectOrdering = mergedData.ordering.projects
    const existingLabelOrdering = mergedData.ordering.labels

    mergedData.ordering = {
      projects: [...new Set([...existingProjectOrdering, ...allProjectIds])],
      labels: [...new Set([...existingLabelOrdering, ...allLabelIds])],
    }

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
      )
    }

    const response: ImportResponse = {
      success: true,
      importedTasks,
      importedProjects,
      importedLabels,
      duplicatesSkipped,
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
        "The uploaded file does not match the expected format",
        400,
      )
    }

    return createErrorResponse(
      "Import failed",
      error instanceof Error ? error.message : "An unknown error occurred",
      500,
    )
  }
}

export const POST = importData
