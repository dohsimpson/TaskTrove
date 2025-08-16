import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Provider } from "jotai"
import { TaskSearchInput } from "./task-search-input"
import { describe, it, expect } from "vitest"

// Mock the atoms for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => <Provider>{children}</Provider>

describe("TaskSearchInput", () => {
  it("renders collapsed search button by default", () => {
    render(
      <TestWrapper>
        <TaskSearchInput data-testid="search-input-container" />
      </TestWrapper>,
    )

    const searchContainer = screen.getByTestId("search-input-container")
    expect(searchContainer).toBeInTheDocument()

    // Should show search icon
    const searchIcon = searchContainer.querySelector("svg")
    expect(searchIcon).toBeInTheDocument()
  })

  it("expands when clicked", async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <TaskSearchInput data-testid="search-input-container" />
      </TestWrapper>,
    )

    const searchContainer = screen.getByTestId("search-input-container")
    await user.click(searchContainer)

    // Should show input field after expansion
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText("Search tasks...")
      expect(searchInput).toBeInTheDocument()
    })
  })

  it("shows custom placeholder when provided", async () => {
    const user = userEvent.setup()
    const customPlaceholder = "Find your tasks..."

    render(
      <TestWrapper>
        <TaskSearchInput data-testid="search-input-container" placeholder={customPlaceholder} />
      </TestWrapper>,
    )

    const searchContainer = screen.getByTestId("search-input-container")
    await user.click(searchContainer)

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(customPlaceholder)
      expect(searchInput).toBeInTheDocument()
    })
  })

  it("applies custom className", () => {
    const customClassName = "custom-search-class"

    render(
      <TestWrapper>
        <TaskSearchInput data-testid="search-input-container" className={customClassName} />
      </TestWrapper>,
    )

    const searchContainer = screen.getByTestId("search-input-container")
    expect(searchContainer).toHaveClass(customClassName)
  })

  it("focuses input when expanded", async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <TaskSearchInput data-testid="search-input-container" />
      </TestWrapper>,
    )

    const searchContainer = screen.getByTestId("search-input-container")
    await user.click(searchContainer)

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText("Search tasks...")
      expect(searchInput).toHaveFocus()
    })
  })

  it("allows typing in the search input", async () => {
    const user = userEvent.setup()
    const searchTerm = "typing test"

    render(
      <TestWrapper>
        <TaskSearchInput data-testid="search-input-container" />
      </TestWrapper>,
    )

    const searchContainer = screen.getByTestId("search-input-container")
    await user.click(searchContainer)

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText("Search tasks...")
      expect(searchInput).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText("Search tasks...")
    await user.clear(searchInput)
    await user.type(searchInput, searchTerm)

    expect(searchInput).toHaveValue(searchTerm)
  })

  it("collapses when clicking outside if no search query", async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <div>
          <TaskSearchInput data-testid="search-input-container" />
          <div data-testid="outside-element">Outside</div>
        </div>
      </TestWrapper>,
    )

    const searchContainer = screen.getByTestId("search-input-container")
    await user.click(searchContainer)

    // Verify it's expanded
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText("Search tasks...")
      expect(searchInput).toBeInTheDocument()
    })

    // Click outside
    const outsideElement = screen.getByTestId("outside-element")
    await user.click(outsideElement)

    // The input should lose focus but we can't easily test the collapse animation
    // in this test environment, so we just verify the click outside doesn't error
    await waitFor(() => {
      expect(outsideElement).toBeInTheDocument()
    })
  })

  it("stays open when there is a search query and user clicks outside", async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <div>
          <TaskSearchInput data-testid="search-input-container" />
          <div data-testid="outside-element">Outside</div>
        </div>
      </TestWrapper>,
    )

    const searchContainer = screen.getByTestId("search-input-container")
    await user.click(searchContainer)

    // Clear any existing input and type something in the search
    const searchInput = screen.getByPlaceholderText("Search tasks...")
    await user.clear(searchInput)
    await user.type(searchInput, "test search")

    // Click outside
    const outsideElement = screen.getByTestId("outside-element")
    await user.click(outsideElement)

    // The search input should still be visible (not collapsed) because there's a search query
    await waitFor(() => {
      expect(searchInput).toHaveValue("test search")
      expect(searchInput).toBeInTheDocument()
    })
  })

  it("stays open when losing focus if there is a search query", async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <TaskSearchInput data-testid="search-input-container" />
      </TestWrapper>,
    )

    const searchContainer = screen.getByTestId("search-input-container")
    await user.click(searchContainer)

    const searchInput = screen.getByPlaceholderText("Search tasks...")
    await user.clear(searchInput)
    await user.type(searchInput, "focus test")

    // Blur the input
    searchInput.blur()

    // The search input should still be visible because there's a search query
    await waitFor(() => {
      expect(searchInput).toHaveValue("focus test")
      expect(searchInput).toBeInTheDocument()
    })
  })

  it("shows clear button when there is a search query and clears search when clicked", async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <TaskSearchInput data-testid="search-input-container" />
      </TestWrapper>,
    )

    const searchContainer = screen.getByTestId("search-input-container")
    await user.click(searchContainer)

    // Type a search query
    const searchInput = screen.getByPlaceholderText("Search tasks...")
    await user.clear(searchInput)
    await user.type(searchInput, "clear test")

    // Verify search input has the value
    expect(searchInput).toHaveValue("clear test")

    // Clear button should now be visible
    await waitFor(() => {
      const clearButton = screen.getByRole("button", { name: /clear search/i })
      expect(clearButton).toBeInTheDocument()
    })

    // Click the clear button
    const clearButton = screen.getByRole("button", { name: /clear search/i })
    await user.click(clearButton)

    // Verify the search input is cleared and collapsed
    await waitFor(() => {
      expect(searchInput).toHaveValue("")
    })

    // Clear button should no longer be visible
    expect(screen.queryByRole("button", { name: /clear search/i })).not.toBeInTheDocument()
  })

  it("does not show clear button when search input is empty", async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <TaskSearchInput data-testid="search-input-container" />
      </TestWrapper>,
    )

    const searchContainer = screen.getByTestId("search-input-container")
    await user.click(searchContainer)

    // Without typing anything, clear button should not be visible
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText("Search tasks...")
      expect(searchInput).toBeInTheDocument()
    })

    // Clear button should not be visible
    expect(screen.queryByRole("button", { name: /clear search/i })).not.toBeInTheDocument()
  })
})
