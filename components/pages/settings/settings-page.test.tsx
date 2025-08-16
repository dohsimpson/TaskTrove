import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { SettingsPage } from "./settings-page"

// Mock component props interfaces
interface MockSeparatorProps {
  className?: string
}

interface MockSidebarNavItem {
  id: string
  title: string
}

interface MockSidebarNavProps {
  items: MockSidebarNavItem[]
  activeSection: string
  onSectionChange: (section: string) => void
}

// Mock the Separator component
vi.mock("@/components/ui/separator", () => ({
  Separator: ({ className }: MockSeparatorProps) => (
    <div data-testid="separator" className={className} />
  ),
}))

// Mock the SidebarNav component
vi.mock("@/components/pages/settings/sidebar-nav", () => ({
  SidebarNav: ({ items, activeSection, onSectionChange }: MockSidebarNavProps) => (
    <div data-testid="sidebar-nav">
      {items.map((item: MockSidebarNavItem) => (
        <button
          key={item.id}
          data-testid={`nav-${item.id}`}
          onClick={() => onSectionChange(item.id)}
          className={activeSection === item.id ? "active" : ""}
        >
          {item.title}
        </button>
      ))}
    </div>
  ),
}))

// Mock the ProfileForm component
vi.mock("@/components/pages/settings/profile-form", () => ({
  ProfileForm: () => <div data-testid="profile-form">Profile Form</div>,
}))

// Mock the NotificationsForm component
vi.mock("@/components/pages/settings/notifications-form", () => ({
  NotificationsForm: () => <div data-testid="notifications-form">Notifications Form</div>,
}))

// Mock the AppearanceForm component
vi.mock("@/components/pages/settings/appearance-form", () => ({
  AppearanceForm: () => <div data-testid="appearance-form">Appearance Form</div>,
}))

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders settings page correctly", () => {
    render(<SettingsPage />)

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument()
    expect(
      screen.getByText("Manage your account settings and set e-mail preferences."),
    ).toBeInTheDocument()
    expect(screen.getByTestId("separator")).toBeInTheDocument()
    expect(screen.getByTestId("sidebar-nav")).toBeInTheDocument()
  })

  it("renders sidebar navigation with correct items", () => {
    render(<SettingsPage />)

    expect(screen.getByTestId("nav-profile")).toBeInTheDocument()
    expect(screen.getByTestId("nav-notifications")).toBeInTheDocument()
    expect(screen.getByTestId("nav-appearance")).toBeInTheDocument()

    expect(screen.getByTestId("nav-profile")).toHaveTextContent("Profile")
    expect(screen.getByTestId("nav-notifications")).toHaveTextContent("Notifications")
    expect(screen.getByTestId("nav-appearance")).toHaveTextContent("Appearance")
  })

  it("shows profile section by default", () => {
    render(<SettingsPage />)

    expect(screen.getByTestId("profile-form")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument()
    expect(screen.getByText("This is how others will see you on the site.")).toBeInTheDocument()
  })

  it("switches to notifications section when clicked", () => {
    render(<SettingsPage />)

    fireEvent.click(screen.getByTestId("nav-notifications"))

    expect(screen.getByTestId("notifications-form")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Notifications" })).toBeInTheDocument()
    expect(screen.getByText("Configure how you receive notifications.")).toBeInTheDocument()
  })

  it("switches to appearance section when clicked", () => {
    render(<SettingsPage />)

    fireEvent.click(screen.getByTestId("nav-appearance"))

    expect(screen.getByTestId("appearance-form")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Appearance" })).toBeInTheDocument()
    expect(
      screen.getByText(
        "Customize the appearance of the app. Automatically switch between day and night themes.",
      ),
    ).toBeInTheDocument()
  })

  it("switches back to profile section", () => {
    render(<SettingsPage />)

    // Switch to notifications first
    fireEvent.click(screen.getByTestId("nav-notifications"))
    expect(screen.getByTestId("notifications-form")).toBeInTheDocument()

    // Switch back to profile
    fireEvent.click(screen.getByTestId("nav-profile"))
    expect(screen.getByTestId("profile-form")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument()
  })

  it("has proper section titles and descriptions", () => {
    render(<SettingsPage />)

    // Profile section (default)
    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument()
    expect(screen.getByText("This is how others will see you on the site.")).toBeInTheDocument()

    // Switch to notifications
    fireEvent.click(screen.getByTestId("nav-notifications"))
    expect(screen.getByRole("heading", { name: "Notifications" })).toBeInTheDocument()
    expect(screen.getByText("Configure how you receive notifications.")).toBeInTheDocument()

    // Switch to appearance
    fireEvent.click(screen.getByTestId("nav-appearance"))
    expect(screen.getByRole("heading", { name: "Appearance" })).toBeInTheDocument()
    expect(
      screen.getByText(
        "Customize the appearance of the app. Automatically switch between day and night themes.",
      ),
    ).toBeInTheDocument()
  })

  it("has proper responsive classes", () => {
    render(<SettingsPage />)

    const mainContainer = screen
      .getByRole("heading", { name: "Settings" })
      .closest("div")?.parentElement
    expect(mainContainer).toHaveClass("hidden", "md:block")
  })

  it("has proper layout structure", () => {
    render(<SettingsPage />)

    // Check main sections exist
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument()
    expect(screen.getByTestId("separator")).toBeInTheDocument()
    expect(screen.getByTestId("sidebar-nav")).toBeInTheDocument()

    // Check sidebar nav items exist
    expect(screen.getByTestId("nav-profile")).toBeInTheDocument()
    expect(screen.getByTestId("nav-notifications")).toBeInTheDocument()
    expect(screen.getByTestId("nav-appearance")).toBeInTheDocument()
  })

  it("passes correct props to SidebarNav", () => {
    render(<SettingsPage />)

    const sidebarNav = screen.getByTestId("sidebar-nav")
    expect(sidebarNav).toBeInTheDocument()

    // Check that navigation items are rendered
    expect(screen.getByTestId("nav-profile")).toBeInTheDocument()
    expect(screen.getByTestId("nav-notifications")).toBeInTheDocument()
    expect(screen.getByTestId("nav-appearance")).toBeInTheDocument()
  })

  it("renders only one form at a time", () => {
    render(<SettingsPage />)

    // Initially shows profile form
    expect(screen.getByTestId("profile-form")).toBeInTheDocument()
    expect(screen.queryByTestId("notifications-form")).not.toBeInTheDocument()
    expect(screen.queryByTestId("appearance-form")).not.toBeInTheDocument()

    // Switch to notifications
    fireEvent.click(screen.getByTestId("nav-notifications"))
    expect(screen.queryByTestId("profile-form")).not.toBeInTheDocument()
    expect(screen.getByTestId("notifications-form")).toBeInTheDocument()
    expect(screen.queryByTestId("appearance-form")).not.toBeInTheDocument()

    // Switch to appearance
    fireEvent.click(screen.getByTestId("nav-appearance"))
    expect(screen.queryByTestId("profile-form")).not.toBeInTheDocument()
    expect(screen.queryByTestId("notifications-form")).not.toBeInTheDocument()
    expect(screen.getByTestId("appearance-form")).toBeInTheDocument()
  })

  it("has correct default section state", () => {
    render(<SettingsPage />)

    // Profile nav should be active by default
    const profileNav = screen.getByTestId("nav-profile")
    expect(profileNav).toHaveClass("active")

    // Other navs should not be active
    const notificationsNav = screen.getByTestId("nav-notifications")
    const appearanceNav = screen.getByTestId("nav-appearance")
    expect(notificationsNav).not.toHaveClass("active")
    expect(appearanceNav).not.toHaveClass("active")
  })
})
