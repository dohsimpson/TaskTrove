import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { AdvancedSearch } from "./advanced-search"

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  X: () => <div data-testid="x-icon" />,
  CalendarIcon: () => <div data-testid="calendar-icon" />,
  Flag: () => <div data-testid="flag-icon" />,
  Tag: () => <div data-testid="tag-icon" />,
  User: () => <div data-testid="user-icon" />,
  CheckSquare: () => <div data-testid="check-square-icon" />,
  Paperclip: () => <div data-testid="paperclip-icon" />,
  ChevronDownIcon: () => <div data-testid="chevron-down-icon" />,
  ChevronUpIcon: () => <div data-testid="chevron-up-icon" />,
  CheckIcon: () => <div data-testid="check-icon" />,
  FolderOpen: () => <div data-testid="folder-open-icon" />,
  Folder: () => <div data-testid="folder-icon" />,
}))

describe("AdvancedSearch", () => {
  const mockOnSearch = vi.fn()

  const mockProjects = [
    { id: "1", name: "Project Alpha", color: "#ff0000" },
    { id: "2", name: "Project Beta", color: "#00ff00" },
    { id: "3", name: "Project Gamma", color: "#0000ff" },
  ]

  const mockLabels = [
    { name: "urgent", color: "#red" },
    { name: "work", color: "#blue" },
    { name: "personal", color: "#green" },
  ]

  const mockAssignees = [
    { id: "1", name: "John Doe", avatar: "/avatar1.jpg" },
    { id: "2", name: "Jane Smith", avatar: "/avatar2.jpg" },
    { id: "3", name: "Bob Johnson" },
  ]

  const defaultProps = {
    onSearch: mockOnSearch,
    projects: mockProjects,
    labels: mockLabels,
    assignees: mockAssignees,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders search interface correctly", () => {
    render(<AdvancedSearch {...defaultProps} />)

    expect(screen.getByTestId("search-icon")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Search tasks...")).toBeInTheDocument()
    expect(screen.getByTestId("filter-icon")).toBeInTheDocument()
    expect(screen.getByText("Search")).toBeInTheDocument()
  })

  it("handles search input changes", () => {
    render(<AdvancedSearch {...defaultProps} />)

    const searchInput = screen.getByPlaceholderText("Search tasks...")
    fireEvent.change(searchInput, { target: { value: "test search" } })

    expect(searchInput).toHaveValue("test search")
  })

  it("triggers search on Enter key press", () => {
    render(<AdvancedSearch {...defaultProps} />)

    const searchInput = screen.getByPlaceholderText("Search tasks...")
    fireEvent.change(searchInput, { target: { value: "test query" } })
    fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" })

    expect(mockOnSearch).toHaveBeenCalledWith("test query", [])
  })

  it("triggers search on Search button click", () => {
    render(<AdvancedSearch {...defaultProps} />)

    const searchInput = screen.getByPlaceholderText("Search tasks...")
    fireEvent.change(searchInput, { target: { value: "test query" } })

    const searchButton = screen.getByText("Search")
    fireEvent.click(searchButton)

    expect(mockOnSearch).toHaveBeenCalledWith("test query", [])
  })

  it("toggles advanced search panel", () => {
    render(<AdvancedSearch {...defaultProps} />)

    const filterButton = screen.getByTestId("filter-icon").closest("button")
    expect(screen.queryByText("Advanced Search")).not.toBeInTheDocument()

    if (filterButton) fireEvent.click(filterButton)
    expect(screen.getByText("Advanced Search")).toBeInTheDocument()

    if (filterButton) fireEvent.click(filterButton)
    expect(screen.queryByText("Advanced Search")).not.toBeInTheDocument()
  })

  it("displays advanced search panel with quick filters", () => {
    render(<AdvancedSearch {...defaultProps} />)

    const filterButton = screen.getByTestId("filter-icon").closest("button")
    if (filterButton) fireEvent.click(filterButton)

    expect(screen.getByText("Priority 1")).toBeInTheDocument()
    expect(screen.getByText("Due today")).toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()
    expect(screen.getByText("Has files")).toBeInTheDocument()
  })

  it("adds priority filter when Priority 1 button is clicked", () => {
    render(<AdvancedSearch {...defaultProps} />)

    const filterButton = screen.getByTestId("filter-icon").closest("button")
    if (filterButton) fireEvent.click(filterButton)

    const priority1Button = screen.getByRole("button", { name: /priority 1/i })
    fireEvent.click(priority1Button)

    // Should show active filter badge
    expect(screen.getAllByText("Priority 1")).toHaveLength(2) // button + badge
    expect(screen.getByTestId("x-icon")).toBeInTheDocument()
  })

  it("adds due today filter when Due today button is clicked", () => {
    render(<AdvancedSearch {...defaultProps} />)

    const filterButton = screen.getByTestId("filter-icon").closest("button")
    if (filterButton) fireEvent.click(filterButton)

    const dueTodayButton = screen.getByRole("button", { name: /due today/i })
    fireEvent.click(dueTodayButton)

    expect(screen.getAllByText("Due today")).toHaveLength(2) // button + badge
    expect(screen.getByTestId("x-icon")).toBeInTheDocument()
  })

  it("adds active status filter when Active button is clicked", () => {
    render(<AdvancedSearch {...defaultProps} />)

    const filterButton = screen.getByTestId("filter-icon").closest("button")
    if (filterButton) fireEvent.click(filterButton)

    const activeButton = screen.getByRole("button", { name: /active/i })
    fireEvent.click(activeButton)

    expect(screen.getByText("Not completed")).toBeInTheDocument() // badge shows different text
    expect(screen.getByTestId("x-icon")).toBeInTheDocument()
  })

  it("adds attachments filter when Has files button is clicked", () => {
    render(<AdvancedSearch {...defaultProps} />)

    const filterButton = screen.getByTestId("filter-icon").closest("button")
    if (filterButton) fireEvent.click(filterButton)

    const hasFilesButton = screen.getByRole("button", { name: /has files/i })
    fireEvent.click(hasFilesButton)

    expect(screen.getByText("Has attachments")).toBeInTheDocument() // badge shows different text
    expect(screen.getByTestId("x-icon")).toBeInTheDocument()
  })

  it("displays project, label, and assignee select dropdowns", () => {
    render(<AdvancedSearch {...defaultProps} />)

    const filterButton = screen.getByTestId("filter-icon").closest("button")
    if (filterButton) fireEvent.click(filterButton)

    expect(screen.getByText("Project")).toBeInTheDocument()
    expect(screen.getByText("Label")).toBeInTheDocument()
    expect(screen.getByText("Assignee")).toBeInTheDocument()
  })

  it("removes filter when X button is clicked", () => {
    render(<AdvancedSearch {...defaultProps} />)

    const filterButton = screen.getByTestId("filter-icon").closest("button")
    if (filterButton) fireEvent.click(filterButton)

    const priority1Button = screen.getByRole("button", { name: /priority 1/i })
    fireEvent.click(priority1Button)

    const removeButton = screen.getByTestId("x-icon").closest("button")
    if (removeButton) {
      fireEvent.click(removeButton)
    }

    // Should find only the button text, not the badge
    expect(screen.getAllByText("Priority 1")).toHaveLength(1)
  })

  it("clears all filters when Clear all button is clicked", () => {
    render(<AdvancedSearch {...defaultProps} />)

    const filterButton = screen.getByTestId("filter-icon").closest("button")
    if (filterButton) fireEvent.click(filterButton)

    // Add multiple filters
    const priority1Button = screen.getByRole("button", { name: /priority 1/i })
    fireEvent.click(priority1Button)

    const dueTodayButton = screen.getByRole("button", { name: /due today/i })
    fireEvent.click(dueTodayButton)

    // Check filters are added
    expect(screen.getAllByText("Priority 1")).toHaveLength(2)
    expect(screen.getAllByText("Due today")).toHaveLength(2)

    // Clear all filters
    const clearAllButton = screen.getByRole("button", { name: /clear all/i })
    fireEvent.click(clearAllButton)

    expect(mockOnSearch).toHaveBeenCalledWith("", [])
  })

  it("works with controlled query prop", () => {
    const mockOnQueryChange = vi.fn()

    render(
      <AdvancedSearch
        {...defaultProps}
        controlledQuery="controlled query"
        onQueryChange={mockOnQueryChange}
      />,
    )

    const searchInput = screen.getByPlaceholderText("Search tasks...")
    expect(searchInput).toHaveValue("controlled query")

    // Should not show Search button in controlled mode
    expect(screen.queryByText("Search")).not.toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: "new query" } })
    expect(mockOnQueryChange).toHaveBeenCalledWith("new query")
  })

  it("works with controlled filters prop", () => {
    const mockOnFiltersChange = vi.fn()
    const controlledFilters = [
      {
        type: "priority" as const,
        field: "priority",
        operator: "equals" as const,
        value: 1,
        label: "Priority 1",
      },
    ]

    render(
      <AdvancedSearch
        {...defaultProps}
        controlledFilters={controlledFilters}
        onFiltersChange={mockOnFiltersChange}
      />,
    )

    // Only the badge should be visible (since advanced panel is closed)
    expect(screen.getByText("Priority 1")).toBeInTheDocument()

    const filterButton = screen.getByTestId("filter-icon").closest("button")
    if (filterButton) fireEvent.click(filterButton)

    const dueTodayButton = screen.getByRole("button", { name: /due today/i })
    fireEvent.click(dueTodayButton)

    expect(mockOnFiltersChange).toHaveBeenCalledWith([
      ...controlledFilters,
      {
        type: "date",
        field: "dueDate",
        operator: "equals",
        value: expect.any(Date),
        label: "Due today",
      },
    ])
  })

  it("displays filter icons correctly", () => {
    render(<AdvancedSearch {...defaultProps} />)

    const filterButton = screen.getByTestId("filter-icon").closest("button")
    if (filterButton) fireEvent.click(filterButton)

    // Add different types of filters and check their icons
    const priority1Button = screen.getByRole("button", { name: /priority 1/i })
    fireEvent.click(priority1Button)

    const dueTodayButton = screen.getByRole("button", { name: /due today/i })
    fireEvent.click(dueTodayButton)

    const activeButton = screen.getByRole("button", { name: /active/i })
    fireEvent.click(activeButton)

    const hasFilesButton = screen.getByRole("button", { name: /has files/i })
    fireEvent.click(hasFilesButton)

    // Check that different filter icons are displayed (multiple of each since they appear in both button and badge)
    expect(screen.getAllByTestId("flag-icon")).toHaveLength(2)
    expect(screen.getAllByTestId("calendar-icon")).toHaveLength(2)
    expect(screen.getAllByTestId("check-square-icon")).toHaveLength(2)
    expect(screen.getAllByTestId("paperclip-icon")).toHaveLength(2)
  })

  it("does not trigger search on Enter in controlled mode", () => {
    const mockOnQueryChange = vi.fn()

    render(
      <AdvancedSearch {...defaultProps} controlledQuery="" onQueryChange={mockOnQueryChange} />,
    )

    const searchInput = screen.getByPlaceholderText("Search tasks...")
    fireEvent.change(searchInput, { target: { value: "test" } })
    fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" })

    expect(mockOnSearch).not.toHaveBeenCalled()
    expect(mockOnQueryChange).toHaveBeenCalledWith("test")
  })

  it("does not trigger search when query is empty and no filters", () => {
    render(<AdvancedSearch {...defaultProps} />)

    const searchButton = screen.getByText("Search")
    fireEvent.click(searchButton)

    expect(mockOnSearch).not.toHaveBeenCalled()
  })

  it("triggers search when query is empty but filters exist", () => {
    render(<AdvancedSearch {...defaultProps} />)

    const filterButton = screen.getByTestId("filter-icon").closest("button")
    if (filterButton) fireEvent.click(filterButton)

    const priority1Button = screen.getByRole("button", { name: /priority 1/i })
    fireEvent.click(priority1Button)

    const searchButton = screen.getByRole("button", { name: /search/i })
    fireEvent.click(searchButton)

    expect(mockOnSearch).toHaveBeenCalledWith("", [
      {
        type: "priority",
        field: "priority",
        operator: "equals",
        value: 1,
        label: "Priority 1",
      },
    ])
  })
})
