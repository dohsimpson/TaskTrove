// Unmock atoms - this test needs real atoms for store API
vi.unmock("@tasktrove/atoms/ui/views")

import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@/test-utils"
import { Provider, createStore } from "jotai"
import {
  currentViewAtom,
  currentViewStateAtom,
  globalViewOptionsAtom,
  setViewOptionsAtom,
} from "@tasktrove/atoms/ui/views"
import type { ViewId } from "@tasktrove/types/id"
import { mockUseToast, mockNextThemes } from "@/test-utils"

// Mock Next.js themes
mockNextThemes()

// Mock the toast hook
mockUseToast()

// Create a test component that uses the sidepanel functionality
const TestSidePanelComponent: React.FC<{ initialView?: ViewId }> = ({ initialView = "inbox" }) => {
  const [currentView, setCurrentView] = useAtom(currentViewAtom)
  const [currentViewState] = useAtom(currentViewStateAtom)
  const setViewOptions = useSetAtom(setViewOptionsAtom)

  // Set the initial view on mount
  React.useEffect(() => {
    setCurrentView(initialView)
  }, [initialView, setCurrentView])

  const handleShowSidePanelChange = (show: boolean) => {
    setViewOptions({ showSidePanel: show })
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

  it("should maintain global side panel state across views", async () => {
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

    // Today view should have the global state (true)
    await waitFor(() => {
      expect(screen.getByTestId("show-side-panel")).toHaveTextContent("true")
    })

    // Switch back to inbox - should reflect the global state change
    fireEvent.click(screen.getByTestId("switch-to-inbox"))
    await waitFor(() => {
      expect(screen.getByTestId("current-view")).toHaveTextContent("inbox")
    })
    await waitFor(() => {
      expect(screen.getByTestId("show-side-panel")).toHaveTextContent("true")
    })
  })

  it("should update global showSidePanel when side panel is toggled", async () => {
    const store = createStore()
    // Initialize the store with a specific view
    store.set(currentViewAtom, "today")
    // Initialize global view options with default values
    store.set(globalViewOptionsAtom, {
      sidePanelWidth: 25,
      sideBarWidth: 240,
      showSidePanel: false,
      peopleOwnerCollapsed: false,
      peopleAssigneesCollapsed: false,
      dismissedUi: {},
    })

    const TestComponent: React.FC = () => {
      const [currentView] = useAtom(currentViewAtom)
      const [currentViewState] = useAtom(currentViewStateAtom)
      const [globalViewOptions] = useAtom(globalViewOptionsAtom)
      const setViewOptions = useSetAtom(setViewOptionsAtom)

      const handleToggle = () => {
        setViewOptions({ showSidePanel: !currentViewState.showSidePanel })
      }

      return (
        <div>
          <div data-testid="current-view">{currentView}</div>
          <div data-testid="current-side-panel">{String(currentViewState.showSidePanel)}</div>
          <div data-testid="global-side-panel">{String(globalViewOptions.showSidePanel)}</div>
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
    expect(screen.getByTestId("global-side-panel")).toHaveTextContent("false")

    // Toggle and check both currentViewState (patched) and globalViewOptions are updated
    fireEvent.click(screen.getByTestId("toggle-button"))
    await waitFor(() => {
      expect(screen.getByTestId("current-side-panel")).toHaveTextContent("true")
    })
    await waitFor(() => {
      expect(screen.getByTestId("global-side-panel")).toHaveTextContent("true")
    })

    // Toggle back
    fireEvent.click(screen.getByTestId("toggle-button"))
    await waitFor(() => {
      expect(screen.getByTestId("current-side-panel")).toHaveTextContent("false")
    })
    await waitFor(() => {
      expect(screen.getByTestId("global-side-panel")).toHaveTextContent("false")
    })
  })
})
