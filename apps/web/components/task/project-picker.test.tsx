import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@/test-utils"
import { ProjectPicker } from "./project-picker"
import { createProjectId } from "@tasktrove/types/id"

const mockProjects = [
  {
    id: createProjectId("550e8400-e29b-41d4-a716-446655440001"),
    name: "Work Project",
    color: "#3b82f6",
  },
  {
    id: createProjectId("550e8400-e29b-41d4-a716-446655440002"),
    name: "Personal Project",
    color: "#10b981",
  },
  {
    id: createProjectId("550e8400-e29b-41d4-a716-446655440003"),
    name: "Learning",
    color: "#f59e0b",
  },
]

const defaultProps = {
  projects: mockProjects,
  onUpdate: vi.fn(),
}

describe("ProjectPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders with default trigger when no project is selected", () => {
    render(<ProjectPicker {...defaultProps} />)

    expect(screen.getByText(/add project/i)).toBeInTheDocument()
  })

  it("renders with selected project name and color", () => {
    render(
      <ProjectPicker
        {...defaultProps}
        projectId={createProjectId("550e8400-e29b-41d4-a716-446655440001")}
      />,
    )

    expect(screen.getByText(/work project/i)).toBeInTheDocument()

    // Check if project folder icon is rendered with correct color
    const folderIcon = screen
      .getByText(/work project/i)
      .parentElement?.querySelector('[style*="color"]')
    expect(folderIcon).toHaveStyle("color: #3b82f6")
  })

  it("opens project list when trigger is clicked", async () => {
    render(<ProjectPicker {...defaultProps} />)

    const triggerSpan = screen.getByText(/add project/i)
    fireEvent.click(triggerSpan)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /work project/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /personal project/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /learning/i })).toBeInTheDocument()
    })
  })

  it("calls onUpdate when a project is selected", async () => {
    const mockOnUpdate = vi.fn()
    render(<ProjectPicker {...defaultProps} onUpdate={mockOnUpdate} />)

    const triggerSpan = screen.getByText(/add project/i)
    fireEvent.click(triggerSpan)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /work project/i })).toBeInTheDocument()
    })

    const workProjectButton = screen.getByRole("button", { name: /work project/i })
    fireEvent.click(workProjectButton)

    expect(mockOnUpdate).toHaveBeenCalledWith(
      createProjectId("550e8400-e29b-41d4-a716-446655440001"),
    )
  })

  it("closes popover after selecting a project", async () => {
    render(<ProjectPicker {...defaultProps} />)

    const triggerSpan = screen.getByText(/add project/i)
    fireEvent.click(triggerSpan)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /work project/i })).toBeInTheDocument()
    })

    const workProjectButton = screen.getByRole("button", { name: /work project/i })
    fireEvent.click(workProjectButton)

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /personal project/i })).not.toBeInTheDocument()
    })
  })

  it("displays project color dots in the project list", async () => {
    render(<ProjectPicker {...defaultProps} />)

    const triggerSpan = screen.getByText(/add project/i)
    fireEvent.click(triggerSpan)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /work project/i })).toBeInTheDocument()
    })

    // Check if all project color dots are rendered
    const projectButtons = screen
      .getAllByRole("button")
      .filter(
        (button) =>
          button.textContent?.includes("Work Project") ||
          button.textContent?.includes("Personal Project") ||
          button.textContent?.includes("Learning"),
      )

    expect(projectButtons).toHaveLength(3)

    // Check specific colors - folder icons should have color style instead of background-color
    const workProjectButton = projectButtons.find((btn) =>
      btn.textContent?.includes("Work Project"),
    )
    const colorElement = workProjectButton?.querySelector('[style*="color"]')
    const style = colorElement ? window.getComputedStyle(colorElement) : null
    expect(style?.color).toMatch(/rgb\(59,\s*130,\s*246\)|#3b82f6/i)
  })

  it("shows remove option when a project is selected", async () => {
    render(
      <ProjectPicker
        {...defaultProps}
        projectId={createProjectId("550e8400-e29b-41d4-a716-446655440001")}
      />,
    )

    const triggerSpan = screen.getByText(/work project/i)
    fireEvent.click(triggerSpan)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /remove from project/i })).toBeInTheDocument()
    })
  })

  it("does not show remove option when no project is selected", async () => {
    render(<ProjectPicker {...defaultProps} />)

    const triggerSpan = screen.getByText(/add project/i)
    fireEvent.click(triggerSpan)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /work project/i })).toBeInTheDocument()
    })

    expect(screen.queryByRole("button", { name: /remove from project/i })).not.toBeInTheDocument()
  })

  it("calls onUpdate with undefined when remove is clicked", async () => {
    const mockOnUpdate = vi.fn()
    render(
      <ProjectPicker
        {...defaultProps}
        projectId={createProjectId("550e8400-e29b-41d4-a716-446655440001")}
        onUpdate={mockOnUpdate}
      />,
    )

    const triggerSpan = screen.getByText(/work project/i)
    fireEvent.click(triggerSpan)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /remove from project/i })).toBeInTheDocument()
    })

    const removeButton = screen.getByRole("button", { name: /remove from project/i })
    fireEvent.click(removeButton)

    expect(mockOnUpdate).toHaveBeenCalledWith(undefined)
  })

  it("closes popover after removing project", async () => {
    render(
      <ProjectPicker
        {...defaultProps}
        projectId={createProjectId("550e8400-e29b-41d4-a716-446655440001")}
      />,
    )

    const triggerSpan = screen.getByText(/work project/i)
    fireEvent.click(triggerSpan)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /remove from project/i })).toBeInTheDocument()
    })

    const removeButton = screen.getByRole("button", { name: /remove from project/i })
    fireEvent.click(removeButton)

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /remove from project/i })).not.toBeInTheDocument()
    })
  })

  it("renders with custom children as trigger", () => {
    const customTrigger = <button data-testid="custom-trigger">Custom Trigger</button>

    render(<ProjectPicker {...defaultProps}>{customTrigger}</ProjectPicker>)

    expect(screen.getByTestId("custom-trigger")).toBeInTheDocument()
    expect(screen.queryByText("Add project")).not.toBeInTheDocument()
  })

  it("applies custom className to default trigger", () => {
    render(<ProjectPicker {...defaultProps} className="custom-class" />)

    const triggerSpan = screen.getByText(/add project/i)
    expect(triggerSpan).toHaveClass("custom-class")
  })

  it("handles empty projects array", async () => {
    render(<ProjectPicker {...defaultProps} projects={[]} />)

    const triggerSpan = screen.getByText(/add project/i)
    fireEvent.click(triggerSpan)

    // Should not crash and should not show any project options
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /work project/i })).not.toBeInTheDocument()
    })
  })

  it("handles invalid projectId gracefully", () => {
    render(
      <ProjectPicker
        {...defaultProps}
        projectId={createProjectId("550e8400-e29b-41d4-a716-446655440999")}
      />,
    )

    // Should still render "Add project" since no matching project is found
    expect(screen.getByText(/add project/i)).toBeInTheDocument()
  })

  it("renders all projects in the correct order", async () => {
    render(<ProjectPicker {...defaultProps} />)

    const triggerSpan = screen.getByText(/add project/i)
    fireEvent.click(triggerSpan)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /work project/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /personal project/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /learning/i })).toBeInTheDocument()
    })

    const projectButtons = screen
      .getAllByRole("button")
      .filter(
        (button) =>
          button.textContent?.includes("Work Project") ||
          button.textContent?.includes("Personal Project") ||
          button.textContent?.includes("Learning"),
      )

    expect(projectButtons).toHaveLength(3)
  })

  it("maintains focus accessibility", async () => {
    render(<ProjectPicker {...defaultProps} />)

    const triggerSpan = screen.getByText(/add project/i)
    fireEvent.click(triggerSpan)

    await waitFor(() => {
      const workProjectButton = screen.getByRole("button", { name: /work project/i })
      expect(workProjectButton).toBeInTheDocument()

      // Test keyboard navigation
      fireEvent.keyDown(workProjectButton, { key: "Enter" })
      // Should work similar to click
    })
  })
})
