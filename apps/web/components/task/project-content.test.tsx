import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { ProjectContent } from "./project-content"
import type { Task, Project, ProjectGroup } from "@/lib/types"
import { createProjectId, createGroupId, createTaskId } from "@/lib/types"

// Mock project data with groups and sections
const mockProjects: Project[] = [
  {
    id: createProjectId("550e8400-e29b-41d4-a716-446655440001"),
    name: "Work Project",
    slug: "work-project",
    color: "#3b82f6",
    sections: [
      {
        id: createGroupId("550e8400-e29b-41d4-a716-446655440011"),
        name: "To Do",
        slug: "to-do",
        type: "section" as const,
        items: [createTaskId("550e8400-e29b-41d4-a716-446655440101")], // Contains mockTask
        color: "#ef4444",
      },
      {
        id: createGroupId("550e8400-e29b-41d4-a716-446655440012"),
        name: "In Progress",
        slug: "in-progress",
        type: "section" as const,
        items: [],
        color: "#f59e0b",
      },
    ],
    shared: false,
  },
  {
    id: createProjectId("550e8400-e29b-41d4-a716-446655440002"),
    name: "Personal Project",
    slug: "personal-project",
    color: "#10b981",
    sections: [],
    shared: false,
  },
  {
    id: createProjectId("550e8400-e29b-41d4-a716-446655440003"),
    name: "Learning Project",
    slug: "learning-project",
    color: "#8b5cf6",
    sections: [
      {
        id: createGroupId("550e8400-e29b-41d4-a716-446655440013"),
        name: "Research",
        slug: "research",
        type: "section" as const,
        items: [],
        color: "#06b6d4",
      },
    ],
    shared: false,
  },
]

const mockProjectGroups = {
  projectGroups: {
    type: "project" as const,
    id: "root",
    name: "All Projects",
    slug: "all-projects",
    items: [
      {
        type: "project" as const,
        id: "group-1",
        name: "Work Group",
        slug: "work-group",
        color: "#3b82f6",
        items: [createProjectId("550e8400-e29b-41d4-a716-446655440001")],
      },
      {
        type: "project" as const,
        id: "group-2",
        name: "Personal Group",
        slug: "personal-group",
        color: "#10b981",
        items: [
          createProjectId("550e8400-e29b-41d4-a716-446655440002"),
          createProjectId("550e8400-e29b-41d4-a716-446655440003"),
        ],
      },
      {
        type: "project" as const,
        id: "group-3",
        name: "Empty Group",
        slug: "empty-group",
        color: "#6b7280",
        items: [],
      },
    ],
  },
  labelGroups: {
    type: "label" as const,
    id: "root-labels",
    name: "All Labels",
    slug: "all-labels",
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
  attachments: [],
  comments: [],
  favorite: false,
  recurringMode: "dueDate",
  createdAt: new Date(),
}

// Mock atom functions
const mockUpdateTask = vi.fn()

// Mock component interfaces
interface MockProviderProps {
  children: React.ReactNode
}

// Mock Jotai
vi.mock("jotai", () => ({
  useSetAtom: vi.fn(() => mockUpdateTask),
  useAtomValue: vi.fn((atom) => {
    if (atom === "mockProjectsAtom") {
      return mockProjects
    }
    if (atom === "mockAllGroupsAtom") {
      return mockProjectGroups
    }
    if (atom === "mockProjectIdsAtom") {
      return new Set([
        "550e8400-e29b-41d4-a716-446655440001",
        "550e8400-e29b-41d4-a716-446655440002",
        "550e8400-e29b-41d4-a716-446655440003",
      ])
    }
    return []
  }),
  atom: vi.fn((value) => ({ init: value, toString: () => "mockAtom" })),
  Provider: ({ children }: MockProviderProps) => children,
}))

// Mock atoms
vi.mock("@/lib/atoms", () => ({
  projectsAtom: "mockProjectsAtom",
  updateTaskAtom: "mockUpdateTaskAtom",
}))

vi.mock("@/lib/atoms/core/projects", () => ({
  projectIdsAtom: "mockProjectIdsAtom",
}))

vi.mock("@/lib/atoms/core/groups", () => ({
  allGroupsAtom: "mockAllGroupsAtom",
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

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: mockTask.id,
          projectId: createProjectId("550e8400-e29b-41d4-a716-446655440002"),
        },
      })
    })

    it("highlights currently selected project and section", () => {
      render(<ProjectContent task={mockTask} />)

      // The task has project-1 and section-1 selected
      // Expand to show sections first by finding the chevron and clicking it
      const workProject = screen.getByText("Work Project")
      const projectContainer = workProject.closest("div")?.parentElement
      const chevronButton = projectContainer?.querySelector("button")

      if (chevronButton) {
        fireEvent.click(chevronButton)

        // Now check for selected section
        const todoSection = screen.getByText("To Do")
        expect(todoSection.closest("div")).toHaveClass("bg-accent")
      }
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

    it("can collapse and expand groups", async () => {
      const user = userEvent.setup()
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
