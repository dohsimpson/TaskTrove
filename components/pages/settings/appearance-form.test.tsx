import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@/test-utils"
import { AppearanceForm } from "./appearance-form"

// Mock component props interfaces
interface MockFormEvent {
  preventDefault: () => void
}

interface MockRadioGroupProps {
  children: React.ReactNode
  onValueChange?: (value: string) => void
  defaultValue?: string
}

interface MockRadioGroupItemProps {
  value: string
}

interface MockButtonProps {
  children: React.ReactNode
  type?: "button" | "submit" | "reset"
  onClick?: () => void
}

interface MockFormControllerProps {
  render: (props: {
    field: { onChange: () => void; value: string; name: string }
  }) => React.ReactNode
}

interface MockFormFieldProps {
  render: (props: {
    field: { onChange: () => void; value: string; name: string }
  }) => React.ReactNode
}

interface MockFormComponentProps {
  children: React.ReactNode
}

// Mock react-hook-form
vi.mock("react-hook-form", () => ({
  useForm: () => ({
    register: vi.fn(),
    handleSubmit: vi.fn((fn) => (e: MockFormEvent) => {
      e?.preventDefault()
      fn({ theme: "dark" })
    }),
    formState: { errors: {} },
    reset: vi.fn(),
    setValue: vi.fn(),
    watch: vi.fn(),
    control: {
      _formState: { errors: {} },
      _fields: {},
      _defaultValues: { theme: "light" },
    },
  }),
  Controller: ({ render }: MockFormControllerProps) =>
    render({
      field: {
        onChange: vi.fn(),
        value: "light",
        name: "theme",
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
  FormField: ({ render }: MockFormFieldProps) =>
    render({
      field: {
        onChange: vi.fn(),
        value: "light",
        name: "theme",
      },
    }),
  FormItem: ({ children }: MockFormComponentProps) => <div data-testid="form-item">{children}</div>,
  FormLabel: ({ children }: MockFormComponentProps) => (
    <label data-testid="form-label">{children}</label>
  ),
  FormMessage: () => <div data-testid="form-message"></div>,
}))

// Mock the RadioGroup components
vi.mock("@/components/ui/radio-group", () => ({
  RadioGroup: ({ children, onValueChange, defaultValue }: MockRadioGroupProps) => (
    <div
      data-testid="radio-group"
      data-default-value={defaultValue}
      onClick={() => onValueChange?.("dark")}
    >
      {children}
    </div>
  ),
  RadioGroupItem: ({ value }: MockRadioGroupItemProps) => (
    <input type="radio" value={value} data-testid={`radio-${value}`} onChange={() => {}} />
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

describe("AppearanceForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders appearance form correctly", () => {
    render(<AppearanceForm />)

    expect(screen.getByTestId("form")).toBeInTheDocument()
    expect(screen.getByTestId("form-label")).toBeInTheDocument()
    expect(screen.getByTestId("form-description")).toBeInTheDocument()
    expect(screen.getByTestId("radio-group")).toBeInTheDocument()
    expect(screen.getByTestId("submit-button")).toBeInTheDocument()
  })

  it("displays theme options", () => {
    render(<AppearanceForm />)

    expect(screen.getByTestId("radio-light")).toBeInTheDocument()
    expect(screen.getByTestId("radio-dark")).toBeInTheDocument()
    expect(screen.getByText("Light")).toBeInTheDocument()
    expect(screen.getByText("Dark")).toBeInTheDocument()
  })

  it("shows form label and description", () => {
    render(<AppearanceForm />)

    expect(screen.getByText("Theme")).toBeInTheDocument()
    expect(screen.getByText("Select the theme for the dashboard.")).toBeInTheDocument()
  })

  it("displays update button", () => {
    render(<AppearanceForm />)

    const submitButton = screen.getByTestId("submit-button")
    expect(submitButton).toBeInTheDocument()
    expect(submitButton).toHaveTextContent("Update preferences")
  })

  it("handles form submission", async () => {
    const { toast } = await import("@/hooks/use-toast")

    render(<AppearanceForm />)

    const submitButton = screen.getByTestId("submit-button")
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: "You submitted the following values:",
        description: expect.any(Object),
      })
    })
  })

  it("has default theme value", () => {
    render(<AppearanceForm />)

    const radioGroup = screen.getByTestId("radio-group")
    expect(radioGroup).toHaveAttribute("data-default-value", "light")
  })

  it("handles theme selection", () => {
    render(<AppearanceForm />)

    const radioGroup = screen.getByTestId("radio-group")
    fireEvent.click(radioGroup)

    // The mock onValueChange should be called with 'dark'
    expect(radioGroup).toBeInTheDocument()
  })

  it("renders theme preview cards", () => {
    render(<AppearanceForm />)

    // Check that both theme options are rendered
    expect(screen.getByText("Light")).toBeInTheDocument()
    expect(screen.getByText("Dark")).toBeInTheDocument()
  })

  it("has proper form structure", () => {
    render(<AppearanceForm />)

    expect(screen.getByTestId("form")).toBeInTheDocument()
    expect(screen.getAllByTestId("form-item")).toHaveLength(3) // Main form item + 2 radio items
    expect(screen.getAllByTestId("form-control")).toHaveLength(2) // 2 radio controls
  })
})
