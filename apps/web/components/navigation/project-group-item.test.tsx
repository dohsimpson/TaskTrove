import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen } from "@/test-utils"
import { render } from "@/test-utils/render-with-providers"
import { SidebarProvider } from "@/components/ui/custom/sidebar"
import { ProjectGroupItem } from "./project-group-item"
import { TEST_PROJECT_ID_1, TEST_PROJECT_ID_2 } from "@tasktrove/types/test-constants"
import { DEFAULT_PROJECT_SECTION } from "@tasktrove/types/defaults"
import type { ProjectGroup } from "@tasktrove/types/group"
import { createGroupId, createProjectId } from "@tasktrove/types/id"

// Mock the context menu components
vi.mock("./project-group-context-menu", () => ({
  ProjectGroupContextMenu: ({ groupId, isVisible }: { groupId: string; isVisible: boolean }) => (
    <div data-testid="project-group-context-menu" data-group-id={groupId} data-visible={isVisible}>
      Context Menu
    </div>
  ),
}))

vi.mock("./project-context-menu", () => ({
  ProjectContextMenu: ({ projectId, isVisible }: { projectId: string; isVisible: boolean }) => (
    <div data-testid="project-context-menu" data-project-id={projectId} data-visible={isVisible}>
      Project Action Menu
    </div>
  ),
}))

// Mock icons
vi.mock("lucide-react", () => ({
  ChevronDown: () => <span data-testid="chevron-down" />,
  ChevronRight: () => <span data-testid="chevron-right" />,
  Folder: () => <span data-testid="folder-icon" />,
  FolderOpen: () => <span data-testid="folder-open-icon" />,
}))

describe("ProjectGroupItem", () => {
  const mockTestGroup: ProjectGroup = {
    id: createGroupId("123e4567-e89b-12d3-a456-426614174001"),
    name: "Test Group",
    slug: "test-group",
    description: "Test group description",
    color: "#3b82f6",
    type: "project",
    items: [TEST_PROJECT_ID_1, TEST_PROJECT_ID_2],
  }

  const mockProjects = [
    {
      id: TEST_PROJECT_ID_1,
      name: "Project 1",
      slug: "project-1",
      color: "#ef4444",
      sections: [DEFAULT_PROJECT_SECTION],
    },
    {
      id: TEST_PROJECT_ID_2,
      name: "Project 2",
      slug: "project-2",
      color: "#10b981",
      sections: [DEFAULT_PROJECT_SECTION],
    },
  ]

  const defaultProps = {
    group: mockTestGroup,
    projects: mockProjects,
  }

  // No atom mocking needed - let the component use default atom values

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders group name and folder icon", () => {
    render(
      <SidebarProvider>
        <ProjectGroupItem {...defaultProps} />
      </SidebarProvider>,
    )

    expect(screen.getByText("Test Group")).toBeInTheDocument()
    expect(screen.getByTestId("folder-open-icon")).toBeInTheDocument()
  })

  it("displays task count for group", () => {
    render(
      <SidebarProvider>
        <ProjectGroupItem {...defaultProps} />
      </SidebarProvider>,
    )

    // Should show count badges for group and projects (will be 0 without real tasks)
    const countBadges = screen.getAllByText("0")
    expect(countBadges.length).toBeGreaterThan(0) // At least one count should be displayed
  })

  it("shows chevron down when expanded", () => {
    render(
      <SidebarProvider>
        <ProjectGroupItem {...defaultProps} />
      </SidebarProvider>,
    )

    expect(screen.getByTestId("chevron-down")).toBeInTheDocument()
    expect(screen.queryByTestId("chevron-right")).not.toBeInTheDocument()
  })

  it("renders projects within the group when expanded", () => {
    render(
      <SidebarProvider>
        <ProjectGroupItem {...defaultProps} />
      </SidebarProvider>,
    )

    expect(screen.getByText("Project 1")).toBeInTheDocument()
    expect(screen.getByText("Project 2")).toBeInTheDocument()
  })

  it("applies correct indentation for projects within groups", () => {
    render(
      <SidebarProvider>
        <ProjectGroupItem {...defaultProps} />
      </SidebarProvider>,
    )

    // Projects within groups should have ml-6 class (24px margin) on the button element
    const projectButton = screen.getByText("Project 1").closest("button")
    expect(projectButton).toHaveClass("ml-6")
  })

  it("renders context menu when visible", () => {
    render(
      <SidebarProvider>
        <ProjectGroupItem {...defaultProps} />
      </SidebarProvider>,
    )

    const contextMenu = screen.getByTestId("project-group-context-menu")
    expect(contextMenu).toHaveAttribute("data-group-id", "123e4567-e89b-12d3-a456-426614174001")
  })

  it("handles empty project group", () => {
    const emptyGroup: ProjectGroup = {
      ...mockTestGroup,
      items: [],
    }

    render(
      <SidebarProvider>
        <ProjectGroupItem {...defaultProps} group={emptyGroup} />
      </SidebarProvider>,
    )

    expect(screen.getByText("Test Group")).toBeInTheDocument()
    expect(screen.getByText("0")).toBeInTheDocument() // Task count should be 0
  })

  it("ignores nested project groups (single-layer only)", () => {
    const nestedGroup: ProjectGroup = {
      id: createGroupId("123e4567-e89b-12d3-a456-426614174002"),
      name: "Nested Group",
      slug: "nested-group",
      type: "project",
      color: "#f59e0b",
      items: [TEST_PROJECT_ID_1],
    }

    const groupWithNested: ProjectGroup = {
      ...mockTestGroup,
      items: [nestedGroup, TEST_PROJECT_ID_2],
    }

    render(
      <SidebarProvider>
        <ProjectGroupItem {...defaultProps} group={groupWithNested} />
      </SidebarProvider>,
    )

    expect(screen.getByText("Test Group")).toBeInTheDocument()
    // Nested groups should be ignored in simplified single-layer implementation
    expect(screen.queryByText("Nested Group")).not.toBeInTheDocument()
    // Only direct project IDs should be rendered
    expect(screen.getByText("Project 2")).toBeInTheDocument()
    // Project 1 should not appear since it's inside the nested group that's ignored
    expect(screen.queryByText("Project 1")).not.toBeInTheDocument()
  })

  it("calculates task count correctly (ignoring nested groups)", () => {
    const nestedGroup: ProjectGroup = {
      id: createGroupId("123e4567-e89b-12d3-a456-426614174002"),
      name: "Nested Group",
      slug: "nested-group",
      type: "project",
      color: "#f59e0b",
      items: [TEST_PROJECT_ID_1], // This should be ignored
    }

    const groupWithNested: ProjectGroup = {
      ...mockTestGroup,
      items: [nestedGroup, TEST_PROJECT_ID_2], // Only TEST_PROJECT_ID_2 should count
    }

    render(
      <SidebarProvider>
        <ProjectGroupItem {...defaultProps} group={groupWithNested} />
      </SidebarProvider>,
    )

    // Should show count badge for the group and the single direct project (both will be 0 without real task data)
    const countBadges = screen.getAllByText("0")
    expect(countBadges.length).toBe(2) // One for group, one for the direct project
  })

  it("handles missing projects gracefully", () => {
    const groupWithMissingProject: ProjectGroup = {
      ...mockTestGroup,
      items: [TEST_PROJECT_ID_1, createProjectId("123e4567-e89b-12d3-a456-426614174999")],
    }

    render(
      <SidebarProvider>
        <ProjectGroupItem {...defaultProps} group={groupWithMissingProject} />
      </SidebarProvider>,
    )

    expect(screen.getByText("Project 1")).toBeInTheDocument()
    expect(screen.queryByText("123e4567-e89b-12d3-a456-426614174999")).not.toBeInTheDocument()
  })

  it("renders project context menus for projects within groups", () => {
    render(
      <SidebarProvider>
        <ProjectGroupItem {...defaultProps} />
      </SidebarProvider>,
    )

    // Should render project context menus for each project in the group
    const projectContextMenus = screen.getAllByTestId("project-context-menu")
    expect(projectContextMenus).toHaveLength(2)

    // Check that each project has its own context menu with correct project ID
    expect(projectContextMenus[0]).toHaveAttribute("data-project-id", TEST_PROJECT_ID_1)
    expect(projectContextMenus[1]).toHaveAttribute("data-project-id", TEST_PROJECT_ID_2)
  })
})
