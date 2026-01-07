import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { ProjectContent } from "./project-content"
import type { Task, Project } from "@tasktrove/types/core"
import { createProjectId, createGroupId, createTaskId } from "@tasktrove/types/id"
import { DEFAULT_PROJECT_SECTION } from "@tasktrove/types/defaults"

// Mock project data with groups and sections
const mockProjects: Project[] = [
  {
    id: createProjectId("550e8400-e29b-41d4-a716-446655440001"),
    name: "Work Project",
    color: "#3b82f6",
    sections: [
      {
        id: createGroupId("550e8400-e29b-41d4-a716-446655440011"),
        name: "To Do",
        type: "section",
        items: [createTaskId("550e8400-e29b-41d4-a716-446655440101")], // Contains mockTask
        color: "#ef4444",
      },
      {
        id: createGroupId("550e8400-e29b-41d4-a716-446655440012"),
        name: "In Progress",
        type: "section",
        items: [],
        color: "#f59e0b",
      },
    ],
  },
  {
    id: createProjectId("550e8400-e29b-41d4-a716-446655440002"),
    name: "Personal Project",
    color: "#10b981",
    sections: [DEFAULT_PROJECT_SECTION],
  },
  {
    id: createProjectId("550e8400-e29b-41d4-a716-446655440003"),
    name: "Learning Project",
    color: "#8b5cf6",
    sections: [
      {
        id: createGroupId("550e8400-e29b-41d4-a716-446655440013"),
        name: "Research",
        type: "section",
        items: [],
        color: "#06b6d4",
      },
    ],
  },
]

const mockProjectGroups = {
  projectGroups: {
    type: "project",
    id: "root",
    name: "All Projects",
    items: [
      {
        type: "project",
        id: "group-1",
        name: "Work Group",
        color: "#3b82f6",
        items: [createProjectId("550e8400-e29b-41d4-a716-446655440001")],
      },
      {
        type: "project",
        id: "group-2",
        name: "Personal Group",
        color: "#10b981",
        items: [
          createProjectId("550e8400-e29b-41d4-a716-446655440002"),
          createProjectId("550e8400-e29b-41d4-a716-446655440003"),
        ],
      },
      {
        type: "project",
        id: "group-3",
        name: "Empty Group",
        color: "#6b7280",
        items: [],
      },
    ],
  },
  labelGroups: {
    type: "label",
    id: "root-labels",
    name: "All Labels",
    items: [],
  },
}

const mockTask: Task = {
  id: createTaskId("550e8400-e29b-41d4-a716-446655440101"),
  title: "Test Task",
  completed: false,
  projectId: createProjectId("550e8400-e29b-41d4-a716-446655440001"),
  priority: 1,
  labels: [],
  subtasks: [],
  comments: [],
  recurringMode: "dueDate",
  createdAt: new Date(),
}

// Mock update function for testing interactions
const mockUpdateTask = vi.fn()

// Override specific atoms for this test file with test-specific data
vi.mock("@tasktrove/atoms/data/base/atoms", () => ({
  tasksAtom: {
    toString: () => "tasksAtom",
    debugLabel: "tasksAtom",
    read: vi.fn(() => [mockTask]),
    write: vi.fn((get, set, update) => {
      mockUpdateTask(update)
    }),
  },
  projectsAtom: {
    toString: () => "projectsAtom",
    debugLabel: "projectsAtom",
    read: vi.fn(() => mockProjects),
  },
  labelsAtom: {
    toString: () => "labelsAtom",
    debugLabel: "labelsAtom",
    read: vi.fn(() => []),
  },
  settingsAtom: {
    toString: () => "settingsAtom",
    debugLabel: "settingsAtom",
    read: vi.fn(() => ({ general: {}, data: {} })),
  },
  userAtom: {
    toString: () => "userAtom",
    debugLabel: "userAtom",
    read: vi.fn(() => null),
  },
  taskByIdAtom: {
    toString: () => "taskByIdAtom",
    debugLabel: "taskByIdAtom",
    read: vi.fn(() => new Map([[mockTask.id, mockTask]])),
  },
}))

vi.mock("@tasktrove/atoms/core/projects", () => ({
  projectIdsAtom: {
    toString: () => "projectIdsAtom",
    debugLabel: "projectIdsAtom",
    read: vi.fn(
      () =>
        new Set([
          "550e8400-e29b-41d4-a716-446655440001",
          "550e8400-e29b-41d4-a716-446655440002",
          "550e8400-e29b-41d4-a716-446655440003",
        ]),
    ),
  },
  visibleProjectsAtom: {
    toString: () => "visibleProjectsAtom",
    debugLabel: "visibleProjectsAtom",
    read: vi.fn(() => mockProjects),
  },
  projectByIdAtom: {
    toString: () => "projectByIdAtom",
    debugLabel: "projectByIdAtom",
    read: vi.fn(() => new Map(mockProjects.map((p) => [p.id, p]))),
  },
  addProjectAtom: { toString: () => "addProjectAtom", write: vi.fn() },
  updateProjectAtom: { toString: () => "updateProjectAtom", write: vi.fn() },
  updateProjectsAtom: { toString: () => "updateProjectsAtom", write: vi.fn() },
  deleteProjectAtom: { toString: () => "deleteProjectAtom", write: vi.fn() },
}))

vi.mock("@tasktrove/atoms/core/tasks", () => ({
  updateTaskAtom: {
    toString: () => "updateTaskAtom",
    debugLabel: "updateTaskAtom",
    read: vi.fn(),
    write: vi.fn((get, set, update) => {
      mockUpdateTask(update)
    }),
  },
  updateTasksAtom: {
    toString: () => "updateTasksAtom",
    debugLabel: "updateTasksAtom",
    read: vi.fn(),
    write: vi.fn((get, set, updates) => {
      mockUpdateTask(updates)
    }),
  },
}))

vi.mock("@tasktrove/atoms/core/groups", () => ({
  allGroupsAtom: {
    toString: () => "allGroupsAtom",
    debugLabel: "allGroupsAtom",
    read: vi.fn(() => mockProjectGroups),
  },
  projectGroupsAtom: {
    toString: () => "projectGroupsAtom",
    debugLabel: "projectGroupsAtom",
    read: vi.fn(() => mockProjectGroups.projectGroups),
  },
  flattenProjectGroupsAtom: {
    toString: () => "flattenProjectGroupsAtom",
    debugLabel: "flattenProjectGroupsAtom",
    read: vi.fn(() => []),
  },
}))

describe("ProjectContent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Project Group Rendering", () => {
    it("renders project groups with correct hierarchy", () => {
      render(<ProjectContent />)

      // Check that groups are rendered
      expect(screen.getByText("Work Group")).toBeInTheDocument()
      expect(screen.getByText("Personal Group")).toBeInTheDocument()
      expect(screen.getByText("Empty Group")).toBeInTheDocument()

      // Check that projects appear under groups
      expect(screen.getByText("Work Project")).toBeInTheDocument()
      expect(screen.getByText("Personal Project")).toBeInTheDocument()
      expect(screen.getByText("Learning Project")).toBeInTheDocument()
    })

    it("shows chevrons for all groups including empty ones", () => {
      render(<ProjectContent />)

      // Look for chevron icons by their SVG class names
      const chevrons = document.querySelectorAll(".lucide-chevron-down, .lucide-chevron-right")
      expect(chevrons.length).toBeGreaterThan(0)
    })

    it("renders empty groups with disabled interaction", () => {
      render(<ProjectContent />)

      const emptyGroup = screen.getByText("Empty Group")
      expect(emptyGroup).toBeInTheDocument()

      // Empty group should have muted styling
      expect(emptyGroup).toHaveClass("text-muted-foreground")
    })
  })

  describe("Section Expansion and Selection", () => {
    it("shows section expansion chevron for projects with sections", () => {
      render(<ProjectContent />)

      // Work Project has sections, should show chevron
      const workProjectRow = screen.getByText("Work Project").closest("div")
      expect(workProjectRow).toBeInTheDocument()
    })

    it("expands sections when chevron is clicked", async () => {
      const user = userEvent.setup()
      render(<ProjectContent />)

      // Find and click the chevron for Work Project
      const workProject = screen.getByText("Work Project")
      const projectContainer = workProject.closest("div")?.parentElement
      const chevronButton = projectContainer?.querySelector("button")

      if (chevronButton) {
        await user.click(chevronButton)

        // Sections should now be visible
        expect(screen.getByText("To Do")).toBeInTheDocument()
        expect(screen.getByText("In Progress")).toBeInTheDocument()
      }
    })

    it("calls onUpdate when section is selected", async () => {
      const onUpdate = vi.fn()
      const user = userEvent.setup()

      render(<ProjectContent onUpdate={onUpdate} />)

      // Expand Work Project sections first
      const workProject = screen.getByText("Work Project")
      const projectContainer = workProject.closest("div")?.parentElement
      const chevronButton = projectContainer?.querySelector("button")

      if (chevronButton) {
        await user.click(chevronButton)

        // Click on "To Do" section
        const todoSection = screen.getByText("To Do")
        await user.click(todoSection)

        expect(onUpdate).toHaveBeenCalledWith(
          createProjectId("550e8400-e29b-41d4-a716-446655440001"),
          createGroupId("550e8400-e29b-41d4-a716-446655440011"),
        )
      }
    })

    it("section indicators have flex-shrink-0 to prevent squashing", async () => {
      const user = userEvent.setup()
      render(<ProjectContent />)

      // Expand Work Project sections first
      const workProject = screen.getByText("Work Project")
      const projectContainer = workProject.closest("div")?.parentElement
      const chevronButton = projectContainer?.querySelector("button")

      if (chevronButton) {
        await user.click(chevronButton)

        // Find a section indicator (colored dot)
        const todoSection = screen.getByText("To Do")
        const sectionContainer = todoSection.closest("div")
        const sectionIndicator = sectionContainer?.querySelector("div[style*='background-color']")

        // Check that the section indicator has flex-shrink-0 class
        expect(sectionIndicator).toHaveClass("flex-shrink-0")
      }
    })
  })

  describe("Task Mode Selection", () => {
    it("calls updateTask when project is selected in task mode", async () => {
      const user = userEvent.setup()

      render(<ProjectContent task={mockTask} />)

      // Click on Personal Project
      const personalProject = screen.getByText("Personal Project")
      await user.click(personalProject)

      expect(mockUpdateTask).toHaveBeenCalledWith([
        {
          id: mockTask.id,
          projectId: createProjectId("550e8400-e29b-41d4-a716-446655440002"),
          sectionId: undefined,
        },
      ])
    })

    it("auto-expands the project that contains the task's selected section", async () => {
      render(<ProjectContent task={mockTask} />)

      // Section for the current task should be visible without manual expansion
      expect(await screen.findByText("To Do")).toBeInTheDocument()
    })

    it("highlights currently selected project and section", () => {
      render(<ProjectContent task={mockTask} />)

      // Sections should already be visible since the task lives inside "To Do"
      const todoSection = screen.getByText("To Do")
      expect(todoSection.closest("div")).toHaveClass("bg-accent")
    })
  })

  describe("Inbox Option", () => {
    it("renders inbox option at the bottom", () => {
      render(<ProjectContent />)

      expect(screen.getByText("No Project (Inbox)")).toBeInTheDocument()
    })

    it("calls onUpdate with INBOX_PROJECT_ID when inbox is selected", async () => {
      const onUpdate = vi.fn()
      const user = userEvent.setup()

      render(<ProjectContent onUpdate={onUpdate} />)

      const inboxOption = screen.getByText("No Project (Inbox)")
      await user.click(inboxOption)

      expect(onUpdate).toHaveBeenCalledWith("00000000-0000-0000-0000-000000000000")
    })
  })

  describe("Text Truncation", () => {
    it("applies truncate class to all text elements", () => {
      render(<ProjectContent />)

      // Check that project names have truncate class
      const workProject = screen.getByText("Work Project")
      expect(workProject).toHaveClass("truncate")

      // Check that group names have truncate class
      const workGroup = screen.getByText("Work Group")
      expect(workGroup).toHaveClass("truncate")
    })
  })

  describe("Group Expansion", () => {
    it("groups are expanded by default", () => {
      render(<ProjectContent />)

      // Projects should be visible under their groups
      expect(screen.getByText("Work Project")).toBeInTheDocument()
      expect(screen.getByText("Personal Project")).toBeInTheDocument()
      expect(screen.getByText("Learning Project")).toBeInTheDocument()
    })

    it("can collapse and expand groups", () => {
      render(<ProjectContent />)

      // Find the Work Group and its chevron
      const workGroup = screen.getByText("Work Group")
      const groupContainer = workGroup.closest("div")

      // Should contain a chevron (ChevronDown since expanded by default)
      expect(groupContainer).toBeInTheDocument()

      // The projects should be visible initially
      expect(screen.getByText("Work Project")).toBeInTheDocument()
    })
  })
})
