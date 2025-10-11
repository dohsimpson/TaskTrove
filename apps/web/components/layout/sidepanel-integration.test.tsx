import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@/test-utils"
import { Provider, createStore } from "jotai"
import {
  currentViewAtom,
  currentViewStateAtom,
  updateViewStateAtom,
  viewStatesAtom,
} from "@tasktrove/atoms"
import type { ViewId } from "@/lib/types"
import { mockUseToast, mockNextThemes } from "@/test-utils"

// Mock Next.js themes
mockNextThemes()

// Mock the toast hook
mockUseToast()

// Create a test component that uses the sidepanel functionality
const TestSidePanelComponent: React.FC<{ initialView?: ViewId }> = ({ initialView = "inbox" }) => {
  const [currentView, setCurrentView] = useAtom(currentViewAtom)
  const [currentViewState] = useAtom(currentViewStateAtom)
  const updateViewState = useSetAtom(updateViewStateAtom)

  // Set the initial view on mount
  React.useEffect(() => {
    setCurrentView(initialView)
  }, [initialView, setCurrentView])

  const handleShowSidePanelChange = (show: boolean) => {
    updateViewState({ viewId: currentView, updates: { showSidePanel: show } })
  }

  return (
    <div>
      <div data-testid="current-view">{currentView}</div>
      <div data-testid="show-side-panel">{String(currentViewState.showSidePanel)}</div>
      <button
        data-testid="toggle-side-panel"
        onClick={() => handleShowSidePanelChange(!currentViewState.showSidePanel)}
      >
        Toggle Side Panel
      </button>
      <button data-testid="show-side-panel-true" onClick={() => handleShowSidePanelChange(true)}>
        Show Side Panel
      </button>
      <button data-testid="show-side-panel-false" onClick={() => handleShowSidePanelChange(false)}>
        Hide Side Panel
      </button>
      <button data-testid="switch-to-today" onClick={() => setCurrentView("today")}>
        Switch to Today
      </button>
      <button data-testid="switch-to-inbox" onClick={() => setCurrentView("inbox")}>
        Switch to Inbox
      </button>
    </div>
  )
}

// Import after mocking
import { useAtom, useSetAtom } from "jotai"

describe("SidePanel Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should toggle side panel state in inbox view", async () => {
    const store = createStore()
    render(
      <Provider store={store}>
        <TestSidePanelComponent initialView="inbox" />
      </Provider>,
    )

    // Wait for initial state to be set
    await waitFor(() => {
      expect(screen.getByTestId("current-view")).toHaveTextContent("inbox")
    })

    // Initially should be false (default state)
    expect(screen.getByTestId("show-side-panel")).toHaveTextContent("false")

    // Toggle to true
    fireEvent.click(screen.getByTestId("show-side-panel-true"))
    await waitFor(() => {
      expect(screen.getByTestId("show-side-panel")).toHaveTextContent("true")
    })

    // Toggle to false
    fireEvent.click(screen.getByTestId("show-side-panel-false"))
    await waitFor(() => {
      expect(screen.getByTestId("show-side-panel")).toHaveTextContent("false")
    })

    // Use the toggle button
    fireEvent.click(screen.getByTestId("toggle-side-panel"))
    await waitFor(() => {
      expect(screen.getByTestId("show-side-panel")).toHaveTextContent("true")
    })

    fireEvent.click(screen.getByTestId("toggle-side-panel"))
    await waitFor(() => {
      expect(screen.getByTestId("show-side-panel")).toHaveTextContent("false")
    })
  })

  it("should maintain separate side panel state per view", async () => {
    const store = createStore()
    render(
      <Provider store={store}>
        <TestSidePanelComponent initialView="inbox" />
      </Provider>,
    )

    // Start in inbox, wait for it to be set
    await waitFor(() => {
      expect(screen.getByTestId("current-view")).toHaveTextContent("inbox")
    })

    // Set side panel to true for inbox
    fireEvent.click(screen.getByTestId("show-side-panel-true"))
    await waitFor(() => {
      expect(screen.getByTestId("show-side-panel")).toHaveTextContent("true")
    })

    // Switch to today view
    fireEvent.click(screen.getByTestId("switch-to-today"))
    await waitFor(() => {
      expect(screen.getByTestId("current-view")).toHaveTextContent("today")
    })

    // Today view should have default state (false)
    await waitFor(() => {
      expect(screen.getByTestId("show-side-panel")).toHaveTextContent("false")
    })

    // Set today view side panel to true
    fireEvent.click(screen.getByTestId("show-side-panel-true"))
    await waitFor(() => {
      expect(screen.getByTestId("show-side-panel")).toHaveTextContent("true")
    })

    // Switch back to inbox - should remember the true state
    fireEvent.click(screen.getByTestId("switch-to-inbox"))
    await waitFor(() => {
      expect(screen.getByTestId("current-view")).toHaveTextContent("inbox")
    })
    await waitFor(() => {
      expect(screen.getByTestId("show-side-panel")).toHaveTextContent("true")
    })
  })

  it("should update currentViewStateAtom when side panel is toggled", async () => {
    const store = createStore()
    // Initialize the store with a specific view
    store.set(currentViewAtom, "today")
    // Initialize view states with the today view
    store.set(viewStatesAtom, {
      today: {
        viewMode: "list" as const,
        sortBy: "created",
        sortDirection: "desc" as const,
        showCompleted: false,
        showOverdue: false,
        searchQuery: "",
        showSidePanel: false,
        compactView: false,
        collapsedSections: [],
        activeFilters: { labels: null },
      },
    })

    const TestComponent: React.FC = () => {
      const [currentView] = useAtom(currentViewAtom)
      const [currentViewState] = useAtom(currentViewStateAtom)
      const [viewStates] = useAtom(viewStatesAtom)
      const updateViewState = useSetAtom(updateViewStateAtom)

      const handleToggle = () => {
        updateViewState({
          viewId: currentView,
          updates: { showSidePanel: !currentViewState.showSidePanel },
        })
      }

      return (
        <div>
          <div data-testid="current-view">{currentView}</div>
          <div data-testid="current-side-panel">{String(currentViewState.showSidePanel)}</div>
          <div data-testid="view-states-test">
            {String(viewStates["today"]?.showSidePanel ?? false)}
          </div>
          <button data-testid="toggle-button" onClick={handleToggle}>
            Toggle
          </button>
        </div>
      )
    }

    render(
      <Provider store={store}>
        <TestComponent />
      </Provider>,
    )

    // Should start with today and false side panel
    expect(screen.getByTestId("current-view")).toHaveTextContent("today")
    expect(screen.getByTestId("current-side-panel")).toHaveTextContent("false")

    // Toggle and check both currentViewState and viewStates are updated
    fireEvent.click(screen.getByTestId("toggle-button"))
    await waitFor(() => {
      expect(screen.getByTestId("current-side-panel")).toHaveTextContent("true")
    })
    await waitFor(() => {
      expect(screen.getByTestId("view-states-test")).toHaveTextContent("true")
    })

    // Toggle back
    fireEvent.click(screen.getByTestId("toggle-button"))
    await waitFor(() => {
      expect(screen.getByTestId("current-side-panel")).toHaveTextContent("false")
    })
    await waitFor(() => {
      expect(screen.getByTestId("view-states-test")).toHaveTextContent("false")
    })
  })
})
