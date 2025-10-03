import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { TaskSectionPopover } from "./task-section-popover"
import { projectsAtom } from "@/lib/atoms"
import { createProjectId, createSectionId, createTaskId } from "@/lib/types"

const mockProject = {
  id: createProjectId("123e4567-e89b-12d3-a456-426614174000"),
  name: "Test Project",
  slug: "test-project",
  color: "#3b82f6",
  sections: [
    {
      id: createSectionId("123e4567-e89b-12d3-a456-426614174001"),
      name: "Test Section",
      color: "#ef4444",
    },
    {
      id: createSectionId("123e4567-e89b-12d3-a456-426614174002"),
      name: "Another Section",
      color: "#10b981",
    },
  ],
}

describe("TaskSectionPopover", () => {
  const renderWithProvider = (ui: React.ReactElement, initialProjects = [mockProject]) => {
    return render(ui, {
      initialAtomValues: [[projectsAtom, initialProjects]],
    })
  }

  describe("Rendering", () => {
    it("renders the trigger button", () => {
      renderWithProvider(
        <TaskSectionPopover projectId={mockProject.id}>
          <button>Select Section</button>
        </TaskSectionPopover>,
      )

      expect(screen.getByText("Select Section")).toBeInTheDocument()
    })

    it("renders with no project selected", () => {
      renderWithProvider(
        <TaskSectionPopover>
          <button>Select Section</button>
        </TaskSectionPopover>,
      )

      expect(screen.getByText("Select Section")).toBeInTheDocument()
    })
  })

  describe("Basic Functionality", () => {
    it("renders trigger element correctly", () => {
      renderWithProvider(
        <TaskSectionPopover projectId={mockProject.id}>
          <button>Select Section</button>
        </TaskSectionPopover>,
      )

      expect(screen.getByText("Select Section")).toBeInTheDocument()
    })

    it("renders when no project is selected", () => {
      renderWithProvider(
        <TaskSectionPopover>
          <button>Select Section</button>
        </TaskSectionPopover>,
      )

      expect(screen.getByText("Select Section")).toBeInTheDocument()
    })

    it("renders when project is not found", () => {
      const nonExistentProjectId = createProjectId("999e4567-e89b-12d3-a456-426614174999")

      renderWithProvider(
        <TaskSectionPopover projectId={nonExistentProjectId}>
          <button>Select Section</button>
        </TaskSectionPopover>,
      )

      expect(screen.getByText("Select Section")).toBeInTheDocument()
    })

    it("renders with taskId provided", () => {
      const mockTaskId = createTaskId("123e4567-e89b-12d3-a456-426614174000")

      renderWithProvider(
        <TaskSectionPopover projectId={mockProject.id} taskId={mockTaskId}>
          <button>Select Section</button>
        </TaskSectionPopover>,
      )

      expect(screen.getByText("Select Section")).toBeInTheDocument()
    })

    it("renders with custom props", () => {
      renderWithProvider(
        <TaskSectionPopover
          projectId={mockProject.id}
          className="custom-class"
          align="start"
          contentClassName="w-64 p-2"
        >
          <button>Select Section</button>
        </TaskSectionPopover>,
      )

      expect(screen.getByText("Select Section")).toBeInTheDocument()
    })

    it("opens popover when trigger is clicked", () => {
      renderWithProvider(
        <TaskSectionPopover projectId={mockProject.id}>
          <button>Select Section</button>
        </TaskSectionPopover>,
      )

      // Click to open popover
      fireEvent.click(screen.getByText("Select Section"))

      // Check that popover opened (dialog role appears)
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })
  })

  describe("Error Handling", () => {
    it("handles empty projects array gracefully", () => {
      renderWithProvider(
        <TaskSectionPopover projectId={mockProject.id}>
          <button>Select Section</button>
        </TaskSectionPopover>,
        [], // empty projects array
      )

      expect(screen.getByText("Select Section")).toBeInTheDocument()
    })

    it("handles project with no sections", () => {
      const projectWithNoSections = {
        ...mockProject,
        sections: [],
      }

      renderWithProvider(
        <TaskSectionPopover projectId={projectWithNoSections.id}>
          <button>Select Section</button>
        </TaskSectionPopover>,
        [projectWithNoSections],
      )

      // Should render without crashing
      expect(screen.getByText("Select Section")).toBeInTheDocument()

      // Can open popover without crashing
      fireEvent.click(screen.getByText("Select Section"))
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })
  })
})
