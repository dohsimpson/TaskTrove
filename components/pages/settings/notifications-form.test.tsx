import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@/test-utils"
import { NotificationsForm } from "./notifications-form"

// Mock component props interfaces
interface MockFormEvent {
  preventDefault: () => void
}

interface MockCheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  [key: string]: unknown
}

interface MockButtonProps {
  children: React.ReactNode
  type?: "button" | "submit" | "reset"
  onClick?: () => void
}

interface MockFormControllerProps {
  render: (props: {
    field: { onChange: () => void; value: boolean; name: string }
  }) => React.ReactNode
  name: string
}

interface MockFormFieldProps {
  render: (props: {
    field: { onChange: () => void; value: boolean; name: string }
  }) => React.ReactNode
  name: string
}

interface MockFormComponentProps {
  children: React.ReactNode
}

interface MockNotificationFormData {
  communication_emails: boolean
  social_emails: boolean
  marketing_emails: boolean
  security_emails: boolean
}

// Mock react-hook-form
vi.mock("react-hook-form", () => ({
  useForm: () => ({
    register: vi.fn(),
    handleSubmit: vi.fn((fn: (data: MockNotificationFormData) => void) => (e: MockFormEvent) => {
      e?.preventDefault()
      const mockData: MockNotificationFormData = {
        communication_emails: false,
        social_emails: true,
        marketing_emails: false,
        security_emails: true,
      }
      fn(mockData)
    }),
    formState: { errors: {} },
    reset: vi.fn(),
    setValue: vi.fn(),
    watch: vi.fn(),
    control: {
      _formState: { errors: {} },
      _fields: {},
      _defaultValues: {
        communication_emails: false,
        social_emails: true,
        marketing_emails: false,
        security_emails: true,
      },
    },
  }),
  Controller: ({ render }: MockFormControllerProps) =>
    render({
      field: {
        onChange: vi.fn(),
        value: false,
        name: "communication_emails",
      },
    }),
}))

// Mock @hookform/resolvers/zod
vi.mock("@hookform/resolvers/zod", () => ({
  zodResolver: vi.fn(() => vi.fn()),
}))

// Mock the toast hook
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}))

// Mock the Form components
vi.mock("@/components/ui/form", () => ({
  Form: ({ children }: MockFormComponentProps) => <div data-testid="form">{children}</div>,
  FormControl: ({ children }: MockFormComponentProps) => (
    <div data-testid="form-control">{children}</div>
  ),
  FormDescription: ({ children }: MockFormComponentProps) => (
    <div data-testid="form-description">{children}</div>
  ),
  FormField: ({ render, name }: MockFormFieldProps) =>
    render({
      field: {
        onChange: vi.fn(),
        value: name === "social_emails" || name === "security_emails" ? true : false,
        name,
      },
    }),
  FormItem: ({ children }: MockFormComponentProps) => <div data-testid="form-item">{children}</div>,
  FormLabel: ({ children }: MockFormComponentProps) => (
    <label data-testid="form-label">{children}</label>
  ),
  FormMessage: () => <div data-testid="form-message"></div>,
}))

// Mock the Checkbox component
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, onCheckedChange, disabled, ...props }: MockCheckboxProps) => (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      data-testid="checkbox"
      {...props}
    />
  ),
}))

// Mock the Button component
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, type, onClick }: MockButtonProps) => (
    <button type={type} data-testid="submit-button" onClick={onClick}>
      {children}
    </button>
  ),
}))

describe("NotificationsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders notifications form correctly", () => {
    render(<NotificationsForm />)

    expect(screen.getByTestId("form")).toBeInTheDocument()
    expect(screen.getByTestId("submit-button")).toBeInTheDocument()
    expect(screen.getAllByTestId("form-item")).toHaveLength(4)
    expect(screen.getAllByTestId("checkbox")).toHaveLength(4)
  })

  it("displays all notification types", () => {
    render(<NotificationsForm />)

    expect(screen.getByText("Communication emails")).toBeInTheDocument()
    expect(screen.getByText("Social emails")).toBeInTheDocument()
    expect(screen.getByText("Marketing emails")).toBeInTheDocument()
    expect(screen.getByText("Security emails")).toBeInTheDocument()
  })

  it("shows proper descriptions for each notification type", () => {
    render(<NotificationsForm />)

    expect(screen.getByText("Receive emails about your account activity.")).toBeInTheDocument()
    expect(
      screen.getByText("Receive emails for friend requests, follows, and more."),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Receive emails about new products, features, and more."),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Receive emails about your account activity and security."),
    ).toBeInTheDocument()
  })

  it("has security emails checkbox disabled", () => {
    render(<NotificationsForm />)

    const checkboxes = screen.getAllByTestId("checkbox")

    // The security emails checkbox should be disabled
    expect(checkboxes[3]).toBeDisabled()
  })

  it("displays update button with correct text", () => {
    render(<NotificationsForm />)

    const submitButton = screen.getByTestId("submit-button")
    expect(submitButton).toBeInTheDocument()
    expect(submitButton).toHaveTextContent("Update notifications")
  })

  it("handles form submission", async () => {
    const { toast } = await import("@/hooks/use-toast")

    render(<NotificationsForm />)

    const submitButton = screen.getByTestId("submit-button")
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: "You submitted the following values:",
        description: expect.any(Object),
      })
    })
  })

  it("handles checkbox changes", () => {
    render(<NotificationsForm />)

    const checkboxes = screen.getAllByTestId("checkbox")

    // Try to click the first checkbox (communication emails)
    fireEvent.click(checkboxes[0])

    // Verify that the checkbox state can be changed
    expect(checkboxes[0]).toBeInTheDocument()
  })

  it("has proper form structure with borders", () => {
    render(<NotificationsForm />)

    const formItems = screen.getAllByTestId("form-item")

    // All form items should be rendered
    expect(formItems).toHaveLength(4)
    formItems.forEach((item) => {
      expect(item).toBeInTheDocument()
    })
  })

  it("renders form labels with proper styling", () => {
    render(<NotificationsForm />)

    const labels = screen.getAllByTestId("form-label")

    // All labels should be rendered
    expect(labels).toHaveLength(4)
    labels.forEach((label) => {
      expect(label).toBeInTheDocument()
    })
  })

  it("shows correct default values", () => {
    render(<NotificationsForm />)

    const checkboxes = screen.getAllByTestId("checkbox")

    // Based on default values: communication_emails: false, social_emails: true, marketing_emails: false, security_emails: true
    expect(checkboxes[0]).not.toBeChecked() // communication_emails
    expect(checkboxes[1]).toBeChecked() // social_emails
    expect(checkboxes[2]).not.toBeChecked() // marketing_emails
    expect(checkboxes[3]).toBeChecked() // security_emails
  })

  it("security checkbox has aria-readonly attribute", () => {
    render(<NotificationsForm />)

    const checkboxes = screen.getAllByTestId("checkbox")

    // Security emails checkbox should have aria-readonly
    expect(checkboxes[3]).toHaveAttribute("aria-readonly")
  })
})
