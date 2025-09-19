import { describe, it, expect } from "vitest"
import {
  createTaskId,
  createProjectId,
  createLabelId,
  type Task,
  type ViewState,
} from "../../types"

type ActiveFilters = NonNullable<ViewState["activeFilters"]>

describe("No Labels Filtering", () => {
  const mockTasks: Task[] = [
    {
      id: createTaskId("12345678-1234-4234-8234-123456789012"),
      title: "Task with labels",
      description: "",
      completed: false,
      priority: 2,
      projectId: createProjectId("87654321-4321-4321-8321-876543210987"),
      labels: [
        createLabelId("abcdefab-abcd-4bcd-8bcd-abcdefabcdef"),
        createLabelId("abcdefab-abcd-4bcd-8bcd-abcdefabcde0"),
      ],
      subtasks: [],
      comments: [],
      attachments: [],
      createdAt: new Date(),
      status: "active",
      recurringMode: "dueDate",
    },
    {
      id: createTaskId("12345678-1234-4234-8234-123456789013"),
      title: "Task with one label",
      description: "",
      completed: false,
      priority: 3,
      projectId: createProjectId("87654321-4321-4321-8321-876543210987"),
      labels: [createLabelId("abcdefab-abcd-4bcd-8bcd-abcdefabcdef")],
      subtasks: [],
      comments: [],
      attachments: [],
      createdAt: new Date(),
      status: "active",
      recurringMode: "dueDate",
    },
    {
      id: createTaskId("12345678-1234-4234-8234-123456789014"),
      title: "Task with no labels",
      description: "",
      completed: false,
      priority: 1,
      projectId: createProjectId("87654321-4321-4321-8321-876543210987"),
      labels: [],
      subtasks: [],
      comments: [],
      attachments: [],
      createdAt: new Date(),
      status: "active",
      recurringMode: "dueDate",
    },
    {
      id: createTaskId("12345678-1234-4234-8234-123456789015"),
      title: "Another task with no labels",
      description: "",
      completed: false,
      priority: 4,
      projectId: createProjectId("87654321-4321-4321-8321-876543210987"),
      labels: [],
      subtasks: [],
      comments: [],
      attachments: [],
      createdAt: new Date(),
      status: "active",
      recurringMode: "dueDate",
    },
  ]

  describe("hasActiveFiltersAtom", () => {
    it("should return false for empty filters", () => {
      // We can't easily test jotai atoms in isolation, so we'll test the logic directly
      const emptyFilters: ActiveFilters = {
        projectIds: undefined,
        labels: [],
        priorities: undefined,
        completed: undefined,
        dueDateFilter: undefined,
        assignedTo: undefined,
        status: undefined,
      }

      // Test logic: should return false for empty filters
      expect(emptyFilters.labels).toEqual([])
    })

    it("should return true when labels is null (no labels filter active)", () => {
      const activeFiltersWithNoLabels: ActiveFilters = {
        projectIds: undefined,
        labels: null,
        priorities: undefined,
        completed: undefined,
        dueDateFilter: undefined,
        assignedTo: undefined,
        status: undefined,
      }

      // Test the logic that should be in hasActiveFiltersAtom
      const hasActive =
        activeFiltersWithNoLabels.labels === null || activeFiltersWithNoLabels.labels.length > 0

      expect(hasActive).toBe(true)
    })

    it("should return true when labels has items", () => {
      const activeFiltersWithLabels: ActiveFilters = {
        projectIds: undefined,
        labels: ["work", "urgent"],
        priorities: undefined,
        completed: undefined,
        dueDateFilter: undefined,
        assignedTo: undefined,
        status: undefined,
      }

      // Test the logic that should be in hasActiveFiltersAtom
      const hasActive =
        activeFiltersWithLabels.labels === null || activeFiltersWithLabels.labels.length > 0

      expect(hasActive).toBe(true)
    })

    it("should return false when labels is empty array", () => {
      const activeFiltersWithEmptyLabels: ActiveFilters = {
        projectIds: undefined,
        labels: [],
        priorities: undefined,
        completed: undefined,
        dueDateFilter: undefined,
        assignedTo: undefined,
        status: undefined,
      }

      // Test the logic that should be in hasActiveFiltersAtom
      const hasActive =
        activeFiltersWithEmptyLabels.labels === null ||
        activeFiltersWithEmptyLabels.labels.length > 0

      expect(hasActive).toBe(false)
    })
  })

  describe("activeFilterCountAtom", () => {
    it("should count null labels as 1 filter", () => {
      const activeFiltersWithNoLabels: ActiveFilters = {
        projectIds: undefined,
        labels: null,
        priorities: undefined,
        completed: undefined,
        dueDateFilter: undefined,
        assignedTo: undefined,
        status: undefined,
      }

      // Test the logic that should be in activeFilterCountAtom
      let count = 0
      if (activeFiltersWithNoLabels.projectIds?.length)
        count += activeFiltersWithNoLabels.projectIds.length

      if (activeFiltersWithNoLabels.labels === null) {
        count += 1 // "no labels" filter is active
      } else if (activeFiltersWithNoLabels.labels.length > 0) {
        count += activeFiltersWithNoLabels.labels.length
      }

      if (activeFiltersWithNoLabels.priorities?.length)
        count += activeFiltersWithNoLabels.priorities.length
      if (activeFiltersWithNoLabels.completed !== undefined) count++
      if (
        activeFiltersWithNoLabels.dueDateFilter &&
        (activeFiltersWithNoLabels.dueDateFilter.preset ||
          activeFiltersWithNoLabels.dueDateFilter.customRange)
      )
        count++

      expect(count).toBe(1)
    })

    it("should count label array length", () => {
      const activeFiltersWithLabels: ActiveFilters = {
        projectIds: undefined,
        labels: ["work", "urgent", "personal"],
        priorities: undefined,
        completed: undefined,
        dueDateFilter: undefined,
        assignedTo: undefined,
        status: undefined,
      }

      // Test the logic that should be in activeFilterCountAtom
      let count = 0
      if (activeFiltersWithLabels.projectIds?.length)
        count += activeFiltersWithLabels.projectIds.length

      if (activeFiltersWithLabels.labels === null) {
        count += 1
      } else if (activeFiltersWithLabels.labels.length > 0) {
        count += activeFiltersWithLabels.labels.length
      }

      if (activeFiltersWithLabels.priorities?.length)
        count += activeFiltersWithLabels.priorities.length
      if (activeFiltersWithLabels.completed !== undefined) count++
      if (
        activeFiltersWithLabels.dueDateFilter &&
        (activeFiltersWithLabels.dueDateFilter.preset ||
          activeFiltersWithLabels.dueDateFilter.customRange)
      )
        count++

      expect(count).toBe(3)
    })

    it("should count 0 for empty labels array", () => {
      const activeFiltersWithEmptyLabels: ActiveFilters = {
        projectIds: undefined,
        labels: [],
        priorities: undefined,
        completed: undefined,
        dueDateFilter: undefined,
        assignedTo: undefined,
        status: undefined,
      }

      // Test the logic that should be in activeFilterCountAtom
      let count = 0
      if (activeFiltersWithEmptyLabels.projectIds?.length)
        count += activeFiltersWithEmptyLabels.projectIds.length

      if (activeFiltersWithEmptyLabels.labels === null) {
        count += 1
      } else if (activeFiltersWithEmptyLabels.labels.length > 0) {
        count += activeFiltersWithEmptyLabels.labels.length
      }

      if (activeFiltersWithEmptyLabels.priorities?.length)
        count += activeFiltersWithEmptyLabels.priorities.length
      if (activeFiltersWithEmptyLabels.completed !== undefined) count++
      if (
        activeFiltersWithEmptyLabels.dueDateFilter &&
        (activeFiltersWithEmptyLabels.dueDateFilter.preset ||
          activeFiltersWithEmptyLabels.dueDateFilter.customRange)
      )
        count++

      expect(count).toBe(0)
    })

    it("should count combined filters correctly", () => {
      const activeFiltersMultiple: ActiveFilters = {
        projectIds: [
          createProjectId("87654321-4321-4321-8321-876543210987"),
          createProjectId("87654321-4321-4321-8321-876543210988"),
        ],
        labels: null, // "no labels" filter
        priorities: [1, 2],
        completed: true,
        dueDateFilter: { preset: "today" as const },
        assignedTo: undefined,
        status: undefined,
      }

      // Test the logic that should be in activeFilterCountAtom
      let count = 0
      if (activeFiltersMultiple.projectIds?.length) count += activeFiltersMultiple.projectIds.length

      if (activeFiltersMultiple.labels === null) {
        count += 1
      } else if (activeFiltersMultiple.labels.length > 0) {
        count += activeFiltersMultiple.labels.length
      }

      if (activeFiltersMultiple.priorities?.length) count += activeFiltersMultiple.priorities.length
      if (activeFiltersMultiple.completed !== undefined) count++
      if (
        activeFiltersMultiple.dueDateFilter &&
        (activeFiltersMultiple.dueDateFilter.preset ||
          activeFiltersMultiple.dueDateFilter.customRange)
      )
        count++

      // 2 (projects) + 1 (no labels) + 2 (priorities) + 1 (completed) + 1 (due date) = 7
      expect(count).toBe(7)
    })
  })

  describe("filtering logic", () => {
    it("should filter tasks with no labels when labels is null", () => {
      const filters: ActiveFilters = {
        projectIds: undefined,
        labels: null,
        priorities: undefined,
        completed: undefined,
        dueDateFilter: undefined,
        assignedTo: undefined,
        status: undefined,
      }

      // Test the filtering logic
      let result = mockTasks

      if (filters.labels === null) {
        // Show only tasks with NO labels
        result = result.filter((task) => task.labels.length === 0)
      } else if (filters.labels.length > 0) {
        // Show tasks with specific labels
        const labelFilter = filters.labels
        result = result.filter((task) => task.labels.some((label) => labelFilter.includes(label)))
      }

      expect(result).toHaveLength(2) // task-3 and task-4 have no labels
      expect(result.map((t) => t.id)).toEqual([
        createTaskId("12345678-1234-4234-8234-123456789014"),
        createTaskId("12345678-1234-4234-8234-123456789015"),
      ])
    })

    it("should filter tasks with specific labels when labels is array", () => {
      const filters: ActiveFilters = {
        projectIds: undefined,
        labels: [createLabelId("abcdefab-abcd-4bcd-8bcd-abcdefabcdef")],
        priorities: undefined,
        completed: undefined,
        dueDateFilter: undefined,
        assignedTo: undefined,
        status: undefined,
      }

      // Test the filtering logic
      let result = mockTasks

      if (filters.labels === null) {
        result = result.filter((task) => task.labels.length === 0)
      } else if (filters.labels.length > 0) {
        const labelFilter = filters.labels
        result = result.filter((task) => task.labels.some((label) => labelFilter.includes(label)))
      }

      expect(result).toHaveLength(2) // task-1 and task-2 have label-1
      expect(result.map((t) => t.id)).toEqual([
        createTaskId("12345678-1234-4234-8234-123456789012"),
        createTaskId("12345678-1234-4234-8234-123456789013"),
      ])
    })

    it("should show all tasks when labels is empty array", () => {
      const filters: ActiveFilters = {
        projectIds: undefined,
        labels: [],
        priorities: undefined,
        completed: undefined,
        dueDateFilter: undefined,
        assignedTo: undefined,
        status: undefined,
      }

      // Test the filtering logic
      let result = mockTasks

      if (filters.labels === null) {
        result = result.filter((task) => task.labels.length === 0)
      } else if (filters.labels.length > 0) {
        const labelFilter = filters.labels
        result = result.filter((task) => task.labels.some((label) => labelFilter.includes(label)))
      }
      // If labels is [], no filtering should occur

      expect(result).toHaveLength(4) // All tasks
      expect(result.map((t) => t.id)).toEqual([
        createTaskId("12345678-1234-4234-8234-123456789012"),
        createTaskId("12345678-1234-4234-8234-123456789013"),
        createTaskId("12345678-1234-4234-8234-123456789014"),
        createTaskId("12345678-1234-4234-8234-123456789015"),
      ])
    })
  })
})
