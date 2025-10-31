import { DEFAULT_PROJECT_SECTION } from "@tasktrove/types/defaults"
import { Command } from "commander"
import { v4 as uuidv4 } from "uuid"
import * as fs from "fs"
import * as path from "path"

// =============================================================================
// 1. TYPE IMPORTS from '@tasktrove/types'
// =============================================================================

import type {
  Task,
  Project,
  Label,
  Subtask,
  ProjectSection,
  User,
  TaskPriority,
} from "@tasktrove/types/core"
import type { ProjectGroup, LabelGroup } from "@tasktrove/types/group"
import type { DataFile, DataFileSerialization } from "@tasktrove/types/data-file"
import type { UserSettings } from "@tasktrove/types/settings"
import type { TaskId, ProjectId, LabelId, SubtaskId, GroupId } from "@tasktrove/types/id"

import {
  createTaskId,
  createProjectId,
  createLabelId,
  createSubtaskId,
  createGroupId,
  createVersionString,
} from "@tasktrove/types/id"
import { DataFileSchema } from "@tasktrove/types/data-file"
import { DataFileSerializationSchema } from "@tasktrove/types/data-file"
import { DEFAULT_EMPTY_DATA_FILE } from "@tasktrove/types/defaults"

// =============================================================================
// 2. UTILITY FUNCTIONS (Functional & Pure)
//    (DRY principle applied by reusing these across all entity creation)
// =============================================================================

const MAX_COLOR_HUE = 360
const MAX_WORD_LENGTH = 12

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")

const generateColor = (): string =>
  `#${Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, "0")}`

const generateWord = (): string => {
  const chars = "abcdefghijklmnopqrstuvwxyz"
  const len = Math.floor(Math.random() * MAX_WORD_LENGTH) + 3
  return Array.from({ length: len }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join("")
}

const generateTitle = (prefix: string, index: number): string => {
  const words = ["Plan", "Review", "Implement", "Test", "Deploy", "Finalize"]
  const adjective = ["New", "Important", "Urgent", "Draft", "Beta"]
  const noun = ["Feature", "API", "Database", "Component", "Module"]

  return `${prefix}: ${words[index % words.length]} ${
    adjective[Math.floor(Math.random() * adjective.length)]
  } ${noun[Math.floor(Math.random() * noun.length)]} #${index + 1}`
}

const generateIsoDate = (daysAgo: number, isFuture: boolean = false): string => {
  const now = new Date()
  const offset = isFuture ? 1 : -1
  const date = new Date(
    now.getTime() + offset * Math.floor(Math.random() * daysAgo * 24 * 60 * 60 * 1000),
  )
  return date.toISOString()
}

const generateDueDate = (daysInFuture: number): string => {
  const date = new Date()
  date.setDate(date.getDate() + Math.floor(Math.random() * daysInFuture) + 1)
  const datePart = date.toISOString().split("T")[0]
  if (!datePart) throw new Error("Failed to generate date")
  return datePart
}

// =============================================================================
// 3. FACTORY FUNCTIONS (Pure functions to create core entities)
// =============================================================================

const createLabel = (index: number): Label => {
  const name = generateWord()
  return {
    id: createLabelId(uuidv4()),
    name: name.charAt(0).toUpperCase() + name.slice(1),
    slug: slugify(name),
    color: generateColor(),
  }
}

const createSection = (name: string, items: TaskId[] = []): ProjectSection => {
  return {
    id: createGroupId(uuidv4()),
    name,
    slug: slugify(name),
    color: generateColor(),
    type: "section",
    items,
  }
}

const createProject = (index: number): Project => {
  const name = `Project ${index + 1} Planning`
  return {
    id: createProjectId(uuidv4()),
    name,
    slug: slugify(name),
    color: generateColor(),
    sections: [createSection("To Do"), createSection("In Progress"), createSection("Done")],
  }
}

const createSubtask = (taskTitle: string, subtaskIndex: number): Subtask => ({
  id: createSubtaskId(uuidv4()),
  title: `Checklist item ${subtaskIndex + 1} for ${taskTitle}`,
  completed: Math.random() > 0.8,
  order: subtaskIndex + 1,
})

const createTask = (index: number, projectId: ProjectId, labelIds: LabelId[]): Task => {
  const title = generateTitle("Task", index)
  const completed = Math.random() > 0.6
  const recurringMode: "dueDate" | "completedAt" | "autoRollover" =
    Math.random() > 0.66 ? "dueDate" : Math.random() > 0.33 ? "completedAt" : "autoRollover"
  const subtasksCount = Math.floor(Math.random() * 4) + 1

  // Safely select a label or use empty array if no labels exist
  const selectedLabel =
    labelIds.length > 0 ? labelIds[Math.floor(Math.random() * labelIds.length)] : undefined
  const taskLabels: LabelId[] = selectedLabel ? [selectedLabel] : []

  return {
    id: createTaskId(uuidv4()),
    title,
    description: `A detailed description for ${title}. This task is autogenerated and needs attention.`,
    completed,
    priority: (Math.floor(Math.random() * 4) + 1) as TaskPriority,
    dueDate: completed ? undefined : new Date(generateDueDate(30)),
    projectId,
    labels: taskLabels,
    subtasks: Array.from({ length: subtasksCount }, (_, i) => createSubtask(title, i)),
    comments: [],
    createdAt: new Date(generateIsoDate(365)),
    completedAt: completed ? new Date(generateIsoDate(10)) : undefined,
    recurringMode,
  }
}

// =============================================================================
// 4. ORCHESTRATOR FUNCTION (Handles relationships and configuration)
// =============================================================================

interface GenerateConfig {
  numTasks?: number
  numProjects?: number
  numLabels?: number
}

const generateTestData = (config: GenerateConfig, existingData?: DataFile): DataFile => {
  const { numTasks, numProjects, numLabels } = config

  // Use existing data as base if provided, otherwise create from scratch
  const baseData: DataFile = existingData || DEFAULT_EMPTY_DATA_FILE

  // Generate new labels if specified
  const labels: Label[] =
    numLabels !== undefined
      ? Array.from({ length: numLabels }, (_, i) => createLabel(i))
      : baseData.labels

  // Generate new projects if specified
  const projects: Project[] =
    numProjects !== undefined
      ? Array.from({ length: numProjects }, (_, i) => createProject(i))
      : baseData.projects

  const projectIds = projects.map((p) => p.id)
  const labelIds = labels.map((l) => l.id)

  // Generate new tasks if specified
  let tasks: Task[]
  let updatedProjects: Project[]

  if (numTasks !== undefined) {
    if (projectIds.length === 0) {
      throw new Error(
        "Cannot generate tasks without projects. Please specify --projects or use an input file with existing projects.",
      )
    }

    // Generate Tasks, distributing them across projects
    tasks = Array.from({ length: numTasks }, (_, i) => {
      const projectId = projectIds[i % projectIds.length]
      if (!projectId) throw new Error("Project ID is undefined")
      return createTask(i, projectId, labelIds)
    })

    // Update Project sections with Task IDs
    updatedProjects = projects.map((project) => {
      const tasksForProject = tasks.filter((t) => t.projectId === project.id)

      const updatedSections = project.sections.map((section, sectionIndex) => {
        // Simple strategy: Put completed tasks in the 'Done' section, and others spread across 'To Do'/'In Progress'
        const isDoneSection = section.name.toLowerCase().includes("done")

        const items = tasksForProject
          .filter((t) => t.completed === isDoneSection)
          .filter((t, i) => {
            // If not 'Done', distribute across the remaining sections
            if (!isDoneSection) {
              return (i % (project.sections.length - 1)) + 1 === sectionIndex
            }
            return true // Keep all completed in 'Done'
          })
          .map((t) => t.id)

        return { ...section, items } // Immutable update
      })

      return { ...project, sections: updatedSections }
    })
  } else {
    // Keep existing tasks and projects
    tasks = baseData.tasks
    updatedProjects = projects
  }

  // Update group structures
  const projectGroups: ProjectGroup = {
    ...baseData.projectGroups,
    items: updatedProjects.map((p) => p.id),
  }

  const labelGroups: LabelGroup = {
    ...baseData.labelGroups,
    items: labelIds,
  }

  return {
    ...baseData,
    tasks,
    projects: updatedProjects,
    labels,
    projectGroups,
    labelGroups,
  }
}

// =============================================================================
// 5. CLI LOGIC
// =============================================================================

/**
 * TaskTrove Test Data Generator CLI
 *
 * USAGE:
 *
 * From package.json script:
 *   pnpm generate-data [options]
 *
 * Direct execution:
 *   pnpm exec tsx scripts/generate-data-cli.ts [options]
 *
 * EXAMPLES:
 *
 * 1. Generate fresh data file with 100 tasks, 5 projects, and 20 labels:
 *    pnpm generate-data --tasks 100 --projects 5 --labels 20 --output data/data.json
 *
 * 2. Update existing file - replace tasks only (keeps existing projects/labels):
 *    pnpm generate-data --tasks 50 --input data/data.json --output data/data.json
 *
 * 3. Add more labels to existing data:
 *    pnpm generate-data --labels 30 --input data/data.json --output data/data.json
 *
 * 4. Generate new data to different file:
 *    pnpm generate-data --tasks 200 --projects 10 --input data/data.json --output data/large-data.json
 *
 * 5. Update multiple fields at once:
 *    pnpm generate-data --tasks 100 --labels 25 --input data/data.json --output data/data.json
 *
 * NOTES:
 * - At least one of --tasks, --projects, or --labels must be specified
 * - Unspecified fields are preserved when using --input
 * - Generated data is validated against DataFileSchema before writing
 * - All IDs use proper branded types from @tasktrove/types
 * - Tasks are automatically distributed across existing/new projects
 * - Project sections are updated with task assignments
 */

const program = new Command()

program
  .name("ts-data-generator")
  .description(
    "A CLI to generate or update test data for TaskTrove. Specify which fields to generate/update.",
  )
  .version("1.0.0")

program
  .option("-t, --tasks <number>", "Number of tasks to generate (replaces existing tasks)")
  .option("-p, --projects <number>", "Number of projects to generate (replaces existing projects)")
  .option("-l, --labels <number>", "Number of labels to generate (replaces existing labels)")
  .option("-i, --input <path>", "Input file path to update (preserves unspecified fields)")
  .option("-o, --output <path>", "Output file path", "data/data.json")
  .action((options) => {
    const numTasks = options.tasks ? parseInt(options.tasks, 10) : undefined
    const numProjects = options.projects ? parseInt(options.projects, 10) : undefined
    const numLabels = options.labels ? parseInt(options.labels, 10) : undefined
    const inputPath = options.input
    const outputPath = options.output

    // Validate that at least one option is specified
    if (numTasks === undefined && numProjects === undefined && numLabels === undefined) {
      console.error("Error: You must specify at least one of --tasks, --projects, or --labels.")
      console.error("Example: generate-data-cli --tasks 50 --projects 5")
      process.exit(1)
    }

    // Validate number inputs
    if (
      (numTasks !== undefined && isNaN(numTasks)) ||
      (numProjects !== undefined && isNaN(numProjects)) ||
      (numLabels !== undefined && isNaN(numLabels))
    ) {
      console.error("Error: Tasks, projects, and labels must be valid numbers.")
      process.exit(1)
    }

    // Read existing data if input file is provided
    let existingData: DataFile | undefined
    if (inputPath) {
      try {
        console.log(`📖 Reading existing data from ${path.resolve(inputPath)}...`)
        const fileContent = fs.readFileSync(inputPath, "utf-8")
        const rawData = JSON.parse(fileContent)

        // Validate and parse with DataFileSchema (handles date conversion automatically)
        const parseResult = DataFileSchema.safeParse(rawData)
        if (!parseResult.success) {
          console.error("❌ Input file validation failed:")
          console.error(parseResult.error.format())
          process.exit(1)
        }
        existingData = parseResult.data
      } catch (e) {
        console.error(`❌ Error reading input file: ${e instanceof Error ? e.message : e}`)
        process.exit(1)
      }
    }

    // Build message about what's being generated
    const updates: string[] = []
    if (numTasks !== undefined) updates.push(`${numTasks} tasks`)
    if (numProjects !== undefined) updates.push(`${numProjects} projects`)
    if (numLabels !== undefined) updates.push(`${numLabels} labels`)

    console.log(`🔨 Generating ${updates.join(", ")}...`)
    if (existingData) {
      console.log("📦 Preserving existing data for unspecified fields...")
    }

    const config: GenerateConfig = { numTasks, numProjects, numLabels }

    try {
      const data = generateTestData(config, existingData)

      // Validate generated data against schema (in-memory with Date objects)
      console.log("🔍 Validating generated data...")
      const validationResult = DataFileSchema.safeParse(data)
      if (!validationResult.success) {
        console.error("❌ Generated data validation failed:")
        console.error(validationResult.error.format())
        process.exit(1)
      }

      // Use DataFileSerializationSchema to properly transform Date objects to ISO strings
      const serializationResult = DataFileSerializationSchema.safeParse(data)
      if (!serializationResult.success) {
        console.error("❌ Serialization transformation failed:")
        console.error(serializationResult.error.format())
        process.exit(1)
      }

      // Now stringify the properly serialized data
      const jsonOutput = JSON.stringify(serializationResult.data, null, 2)

      // Ensure the directory exists before writing the file
      const dir = path.dirname(outputPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      fs.writeFileSync(outputPath, jsonOutput)
      console.log(`✅ Success! Data written to ${path.resolve(outputPath)}`)

      // Show summary
      console.log("\n📊 Summary:")
      console.log(`   Tasks: ${data.tasks.length}`)
      console.log(`   Projects: ${data.projects.length}`)
      console.log(`   Labels: ${data.labels.length}`)
    } catch (e) {
      console.error("❌ Error:", e instanceof Error ? e.message : e)
      process.exit(1)
    }
  })

program.parse(process.argv)
