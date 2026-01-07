"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { Task } from "@tasktrove/types/core"

export const METADATA_FLASH_DURATION = 900
export type TaskFlashKey =
  | "schedule"
  | "priority"
  | "project"
  | "labels"
  | "comments"
  | "subtasks"
  | "assignees"

export function useFlashOnChange(valueKey: string, duration = METADATA_FLASH_DURATION) {
  const [isFlashing, setIsFlashing] = useState(false)
  const previousValue = useRef<string | undefined>(undefined)

  useEffect(() => {
    const lastValue = previousValue.current
    previousValue.current = valueKey

    if (lastValue !== undefined && lastValue !== valueKey) {
      setIsFlashing(true)
      const timeout = window.setTimeout(() => setIsFlashing(false), duration)
      return () => window.clearTimeout(timeout)
    }
  }, [valueKey, duration])

  return isFlashing
}

export function useFlashClasses(
  values: Record<TaskFlashKey, string>,
  duration = METADATA_FLASH_DURATION,
) {
  const serializedValues = useMemo(
    () =>
      Object.entries(values)
        .map(([key, value]) => `${key}:${value}`)
        .join("|"),
    [values],
  )
  const [flashing, setFlashing] = useState<Partial<Record<TaskFlashKey, boolean>>>({})
  const previousValues = useRef<Partial<Record<TaskFlashKey, string>>>({})
  const timeouts = useRef<Partial<Record<TaskFlashKey, number>>>({})

  useEffect(() => {
    const entries: Array<[TaskFlashKey, string]> = [
      ["schedule", values.schedule],
      ["priority", values.priority],
      ["project", values.project],
      ["labels", values.labels],
      ["comments", values.comments],
      ["subtasks", values.subtasks],
      ["assignees", values.assignees],
    ]

    entries.forEach(([key, value]) => {
      const prev = previousValues.current[key]
      previousValues.current[key] = value

      if (prev !== undefined && prev !== value) {
        setFlashing((current) => ({ ...current, [key]: true }))

        // Clear any existing timeout for this key before setting a new one
        if (timeouts.current[key]) {
          window.clearTimeout(timeouts.current[key])
        }

        timeouts.current[key] = window.setTimeout(() => {
          setFlashing((current) => ({ ...current, [key]: false }))
          timeouts.current[key] = undefined
        }, duration)
      }
    })

    return () => {
      Object.values(timeouts.current).forEach((timeoutId) => window.clearTimeout(timeoutId))
      timeouts.current = {}
    }
    // Track dependency via serializedValues so we don't reset timeouts every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializedValues, duration])

  const getFlashClass = useCallback(
    (key: TaskFlashKey) => metadataFlashClass(Boolean(flashing[key])),
    [flashing],
  )

  return getFlashClass
}

export function useTaskMetadataFlash(task?: Task, duration = METADATA_FLASH_DURATION) {
  const flashValues = useMemo(() => {
    if (!task) {
      return {
        schedule: "",
        priority: "",
        project: "",
        labels: "",
        comments: "",
        subtasks: "",
        assignees: "",
      }
    }

    const assigneeValue = Reflect.get(task, "assignees")
    const assignees = Array.isArray(assigneeValue) ? assigneeValue : []

    return {
      schedule: [task.dueDate, task.dueTime, task.recurring, task.recurringMode]
        .map((value) => String(value ?? ""))
        .join("|"),
      priority: String(task.priority),
      project: String(task.projectId ?? "none"),
      labels: [...task.labels].sort().join("|"),
      comments: String(task.comments.length),
      subtasks: `${task.subtasks.length}:${task.subtasks.filter((s) => s.completed).length}`,
      assignees: assignees.slice().sort().join("|"),
    }
  }, [task])

  return useFlashClasses(flashValues, duration)
}

export const metadataFlashClass = (isFlashing: boolean) =>
  cn(
    "rounded-sm transition-[background-color,box-shadow] duration-500 ease-out",
    isFlashing && "bg-primary/20",
  )
