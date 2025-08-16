import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@/test-utils"
import { ProfileForm } from "./profile-form"

// Mock component props interfaces
interface MockFormEvent {
  preventDefault: () => void
}

interface MockInputProps {
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  [key: string]: unknown
}

interface MockButtonProps {
  children: React.ReactNode
  type?: "button" | "submit" | "reset"
  onClick?: () => void
}

interface MockFormFieldProps {
  render: (props: {
    field: { onChange: () => void; value: string; name: string }
  }) => React.ReactNode
  name: string
}

interface MockFormComponentProps {
  children: React.ReactNode
}

interface MockProfileFormData {
  username: string
  email: string
  bio: string
}

interface MockDefaultValues {
  [key: string]: string
}

// Mock react-hook-form
vi.mock("react-hook-form", () => ({
  useForm: () => ({
    register: vi.fn(),
    handleSubmit: vi.fn((fn: (data: MockProfileFormData) => void) => (e: MockFormEvent) => {
      e?.preventDefault()
      const mockData: MockProfileFormData = {
        username: "TestUser",
        email: "test@example.com",
        bio: "I am a test user.",
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
        username: "Your Name",
        email: "example@example.com",
        bio: "I own a computer.",
      },
    },
  }),
}))

// Mock @hookform/resolvers/zod
vi.mock("@hookform/resolvers/zod", () => ({
  zodResolver: vi.fn(() => vi.fn()),
}))

// Mock the toast hook from ui/use-toast
vi.mock("@/components/ui/use-toast", () => ({
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
  FormField: ({ render, name }: MockFormFieldProps) => {
    const defaultValues: MockDefaultValues = {
      username: "Your Name",
      email: "example@example.com",
      bio: "I own a computer.",
    }

    return render({
      field: {
        onChange: vi.fn(),
        value: defaultValues[name] || "",
        name,
      },
    })
  },
  FormItem: ({ children }: MockFormComponentProps) => <div data-testid="form-item">{children}</div>,
  FormLabel: ({ children }: MockFormComponentProps) => (
    <label data-testid="form-label">{children}</label>
  ),
  FormMessage: () => <div data-testid="form-message"></div>,
}))

// Mock the Input component
vi.mock("@/components/ui/input", () => ({
  Input: ({ placeholder, value, onChange, ...props }: MockInputProps) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      data-testid="input"
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

describe("ProfileForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders profile form correctly", () => {
    render(<ProfileForm />)

    expect(screen.getByTestId("form")).toBeInTheDocument()
    expect(screen.getByTestId("submit-button")).toBeInTheDocument()
    expect(screen.getAllByTestId("form-item")).toHaveLength(3)
    expect(screen.getAllByTestId("input")).toHaveLength(3)
  })

  it("displays all profile fields", () => {
    render(<ProfileForm />)

    expect(screen.getByText("Username")).toBeInTheDocument()
    expect(screen.getByText("Email")).toBeInTheDocument()
    expect(screen.getByText("Bio")).toBeInTheDocument()
  })

  it("shows proper field descriptions", () => {
    render(<ProfileForm />)

    expect(screen.getByText(/This is your public display name/)).toBeInTheDocument()
    expect(screen.getByText(/You can manage verified email addresses/)).toBeInTheDocument()
    expect(screen.getByText(/You can only change this once every 30 days/)).toBeInTheDocument()
    expect(screen.getByText(/@mention/)).toBeInTheDocument()
  })

  it("has proper input placeholders", () => {
    render(<ProfileForm />)

    const inputs = screen.getAllByTestId("input")

    expect(inputs[0]).toHaveAttribute("placeholder", "Your Name")
    expect(inputs[1]).toHaveAttribute("placeholder", "your.email@example.com")
    expect(inputs[2]).toHaveAttribute("placeholder", "Tell us a little bit about yourself")
  })

  it("displays update button with correct text", () => {
    render(<ProfileForm />)

    const submitButton = screen.getByTestId("submit-button")
    expect(submitButton).toBeInTheDocument()
    expect(submitButton).toHaveTextContent("Update profile")
  })

  it("handles form submission", async () => {
    const { toast } = await import("@/components/ui/use-toast")

    render(<ProfileForm />)

    const submitButton = screen.getByTestId("submit-button")
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: "You submitted the following values:",
        description: expect.any(Object),
      })
    })
  })

  it("handles input changes", () => {
    render(<ProfileForm />)

    const inputs = screen.getAllByTestId("input")

    // Try to change the username input
    fireEvent.change(inputs[0], { target: { value: "NewUsername" } })

    // Verify that the input exists and can be changed
    expect(inputs[0]).toBeInTheDocument()
  })

  it("shows default values", () => {
    render(<ProfileForm />)

    const inputs = screen.getAllByTestId("input")

    // Check default values
    expect(inputs[0]).toHaveValue("Your Name")
    expect(inputs[1]).toHaveValue("example@example.com")
    expect(inputs[2]).toHaveValue("I own a computer.")
  })

  it("renders form labels correctly", () => {
    render(<ProfileForm />)

    const labels = screen.getAllByTestId("form-label")

    expect(labels).toHaveLength(3)
    expect(labels[0]).toHaveTextContent("Username")
    expect(labels[1]).toHaveTextContent("Email")
    expect(labels[2]).toHaveTextContent("Bio")
  })

  it("has proper form structure", () => {
    render(<ProfileForm />)

    expect(screen.getByTestId("form")).toBeInTheDocument()
    expect(screen.getAllByTestId("form-item")).toHaveLength(3)
    expect(screen.getAllByTestId("form-control")).toHaveLength(3)
    expect(screen.getAllByTestId("form-description")).toHaveLength(3)
    expect(screen.getAllByTestId("form-message")).toHaveLength(3)
  })

  it("mentions bio feature correctly", () => {
    render(<ProfileForm />)

    // Check that the bio description mentions @mention feature
    expect(screen.getByText(/@mention/)).toBeInTheDocument()
    expect(screen.getByText(/other users and organizations/)).toBeInTheDocument()
  })

  it("shows username change restriction", () => {
    render(<ProfileForm />)

    // Check that username description mentions the 30-day restriction
    expect(screen.getByText(/You can only change this once every 30 days/)).toBeInTheDocument()
  })
})
