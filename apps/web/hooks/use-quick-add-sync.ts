import { useEffect, useRef } from "react"
import type { SetStateAction } from "jotai"
import { isValidPriority } from "@/lib/types"
import { convertTimeToHHMMSS, type ParsedTask } from "@/lib/utils/enhanced-natural-language-parser"
import { calculateNextDueDate } from "@tasktrove/utils"

interface UseQuickAddSyncParams {
  parsed: ParsedTask | null
  nlpEnabled: boolean
  updateNewTask: (update: any) => void
  newTask: any
  projects: Array<{ id: string; name: string }>
  labels: Array<{ id: string; name: string }>
  users?: Array<{ id: string; username: string }> // Optional, used by Pro
}

export interface QuickAddSyncRefs {
  projectSetByParsingRef: React.MutableRefObject<boolean>
  prioritySetByParsingRef: React.MutableRefObject<boolean>
  dueDateSetByParsingRef: React.MutableRefObject<boolean>
  dueDateSetByRecurringRef: React.MutableRefObject<boolean>
  dueTimeSetByParsingRef: React.MutableRefObject<boolean>
  recurringSetByParsingRef: React.MutableRefObject<boolean>
  labelsSetByParsingRef: React.MutableRefObject<boolean>
  estimationSetByParsingRef: React.MutableRefObject<boolean>
}

export function useQuickAddSync({
  parsed,
  nlpEnabled,
  updateNewTask,
  newTask,
  projects,
  labels,
}: UseQuickAddSyncParams): QuickAddSyncRefs {
  // Track whether values were set by parsing
  const projectSetByParsingRef = useRef(false)
  const prioritySetByParsingRef = useRef(false)
  const dueDateSetByParsingRef = useRef(false)
  const dueDateSetByRecurringRef = useRef(false)
  const dueTimeSetByParsingRef = useRef(false)
  const recurringSetByParsingRef = useRef(false)
  const labelsSetByParsingRef = useRef(false)
  const estimationSetByParsingRef = useRef(false)

  // Clear values set by parsing when NLP is disabled
  useEffect(() => {
    if (!nlpEnabled) {
      if (prioritySetByParsingRef.current) {
        prioritySetByParsingRef.current = false
        updateNewTask({ updateRequest: { priority: undefined } })
      }
      if (dueDateSetByParsingRef.current || dueDateSetByRecurringRef.current) {
        dueDateSetByParsingRef.current = false
        dueDateSetByRecurringRef.current = false
        updateNewTask({ updateRequest: { dueDate: undefined } })
      }
      if (dueTimeSetByParsingRef.current) {
        dueTimeSetByParsingRef.current = false
        updateNewTask({ updateRequest: { dueTime: undefined } })
      }
      if (recurringSetByParsingRef.current) {
        recurringSetByParsingRef.current = false
        updateNewTask({ updateRequest: { recurring: undefined } })
      }
      if (projectSetByParsingRef.current) {
        projectSetByParsingRef.current = false
        updateNewTask({ updateRequest: { projectId: undefined } })
      }
      if (labelsSetByParsingRef.current) {
        labelsSetByParsingRef.current = false
        updateNewTask({ updateRequest: { labels: [] } })
      }
      if (estimationSetByParsingRef.current) {
        estimationSetByParsingRef.current = false
        updateNewTask({ updateRequest: { estimation: undefined } })
      }
    }
  }, [nlpEnabled, updateNewTask])

  // Sync priority
  useEffect(() => {
    if (parsed?.priority && isValidPriority(parsed.priority)) {
      prioritySetByParsingRef.current = true
      updateNewTask({ updateRequest: { priority: parsed.priority } })
    } else if (!parsed?.priority && prioritySetByParsingRef.current) {
      prioritySetByParsingRef.current = false
      updateNewTask({ updateRequest: { priority: undefined } })
    }
  }, [parsed?.priority, updateNewTask])

  // Sync due date
  useEffect(() => {
    if (parsed?.dueDate) {
      dueDateSetByParsingRef.current = true
      updateNewTask({ updateRequest: { dueDate: parsed.dueDate } })
    } else if (!parsed?.dueDate && dueDateSetByParsingRef.current) {
      dueDateSetByParsingRef.current = false
      updateNewTask({ updateRequest: { dueDate: undefined } })
    }
  }, [parsed?.dueDate, updateNewTask])

  // Sync time
  useEffect(() => {
    if (parsed?.time) {
      dueTimeSetByParsingRef.current = true
      const timeDate = new Date()
      const timeFormatted = convertTimeToHHMMSS(parsed.time)
      if (timeFormatted) {
        const timeParts = timeFormatted.split(":").map(Number)
        const hours = timeParts[0] ?? 0
        const minutes = timeParts[1] ?? 0
        timeDate.setHours(hours, minutes, 0, 0)
        updateNewTask({ updateRequest: { dueTime: timeDate } })
      }
    } else if (!parsed?.time && dueTimeSetByParsingRef.current) {
      dueTimeSetByParsingRef.current = false
      updateNewTask({ updateRequest: { dueTime: undefined } })
    }
  }, [parsed?.time, updateNewTask])

  // Sync recurring
  useEffect(() => {
    if (parsed?.recurring) {
      let dueDate = newTask.dueDate
      let setDueDateByRecurring = false
      if (!dueDate) {
        const calculatedDueDate = calculateNextDueDate(parsed.recurring, new Date(), true)
        if (calculatedDueDate) {
          dueDate = calculatedDueDate
          setDueDateByRecurring = true
        }
      }

      recurringSetByParsingRef.current = true
      if (setDueDateByRecurring) {
        dueDateSetByRecurringRef.current = true
      }
      updateNewTask({
        updateRequest: {
          recurring: parsed.recurring,
          ...(dueDate && !newTask.dueDate ? { dueDate } : {}),
        },
      })
    } else if (!parsed?.recurring && recurringSetByParsingRef.current) {
      recurringSetByParsingRef.current = false
      const updateRequest: { recurring: undefined; dueDate?: undefined } = { recurring: undefined }
      if (dueDateSetByRecurringRef.current) {
        dueDateSetByRecurringRef.current = false
        updateRequest.dueDate = undefined
      }
      updateNewTask({ updateRequest })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed?.recurring, updateNewTask])

  // Sync project
  useEffect(() => {
    if (parsed?.project && parsed.project.trim()) {
      const foundProject = projects.find(
        (p) => p.name.toLowerCase() === parsed.project?.toLowerCase(),
      )
      if (foundProject) {
        projectSetByParsingRef.current = true
        updateNewTask({ updateRequest: { projectId: foundProject.id } })
      }
    } else if (!parsed?.project && projectSetByParsingRef.current) {
      projectSetByParsingRef.current = false
      updateNewTask({ updateRequest: { projectId: undefined } })
    }
  }, [parsed?.project, projects, updateNewTask])

  // Sync labels
  useEffect(() => {
    if (parsed?.labels && parsed.labels.length > 0) {
      const parsedLabelIds: string[] = []
      parsed.labels.forEach((labelName) => {
        const existingLabel = labels.find((l) => l.name.toLowerCase() === labelName.toLowerCase())
        if (existingLabel) {
          parsedLabelIds.push(existingLabel.id)
        }
      })
      if (parsedLabelIds.length > 0) {
        const currentLabels = newTask.labels || []
        const hasChanged =
          parsedLabelIds.length !== currentLabels.length ||
          parsedLabelIds.some((id) => !currentLabels.includes(id))

        if (hasChanged) {
          labelsSetByParsingRef.current = true
          updateNewTask({ updateRequest: { labels: parsedLabelIds } })
        }
      }
    } else if ((!parsed?.labels || parsed.labels.length === 0) && labelsSetByParsingRef.current) {
      labelsSetByParsingRef.current = false
      updateNewTask({ updateRequest: { labels: [] } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed?.labels, labels, updateNewTask])

  // Sync estimation
  useEffect(() => {
    if (parsed?.estimation) {
      estimationSetByParsingRef.current = true
      updateNewTask({ updateRequest: { estimation: parsed.estimation } })
    } else if (!parsed?.estimation && estimationSetByParsingRef.current) {
      estimationSetByParsingRef.current = false
      updateNewTask({ updateRequest: { estimation: undefined } })
    }
  }, [parsed?.estimation, updateNewTask])

  return {
    projectSetByParsingRef,
    prioritySetByParsingRef,
    dueDateSetByParsingRef,
    dueDateSetByRecurringRef,
    dueTimeSetByParsingRef,
    recurringSetByParsingRef,
    labelsSetByParsingRef,
    estimationSetByParsingRef,
  }
}
