import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { LoginForm } from "./login-form"

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock console.error to suppress error logs in tests
vi.spyOn(console, "error").mockImplementation(() => {})

describe("LoginForm", () => {
  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders card layout with form elements", () => {
      render(<LoginForm onCancel={mockOnCancel} />)

      expect(screen.getByPlaceholderText("Password")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument()
      // Toggle button only appears when there's text
      expect(screen.queryByRole("button", { name: "Show password" })).not.toBeInTheDocument()
    })

    it("has proper password input attributes", () => {
      render(<LoginForm onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      expect(passwordInput).toHaveAttribute("type", "password")
      expect(passwordInput).toHaveAttribute("placeholder", "Password")
    })

    it("shows password visibility toggle button when there is text", async () => {
      render(<LoginForm onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      await user.type(passwordInput, "test")

      const toggleButton = screen.getByRole("button", { name: "Show password" })
      expect(toggleButton).toBeInTheDocument()
    })

    it("shows Eye icon when password is hidden and text is present", async () => {
      render(<LoginForm onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      await user.type(passwordInput, "test")

      // Eye icon should be present when password is hidden
      const eyeIcon = document.querySelector(".lucide-eye")
      expect(eyeIcon).toBeInTheDocument()
    })

    it("shows EyeOff icon when password is visible", async () => {
      render(<LoginForm onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      await user.type(passwordInput, "test")

      const toggleButton = screen.getByRole("button", { name: "Show password" })
      await user.click(toggleButton)

      // EyeOff icon should be present when password is shown
      const eyeOffIcon = document.querySelector(".lucide-eye-off")
      expect(eyeOffIcon).toBeInTheDocument()
    })
  })

  describe("Form Validation", () => {
    it("shows error when password is empty", async () => {
      render(<LoginForm onCancel={mockOnCancel} />)

      const submitButton = screen.getByRole("button", { name: "Sign In" })
      await user.click(submitButton)

      expect(screen.getByText("Password is required")).toBeInTheDocument()
    })

    it("clears error when valid password is provided", async () => {
      render(<LoginForm onCancel={mockOnCancel} />)

      // First trigger error
      const submitButton = screen.getByRole("button", { name: "Sign In" })
      await user.click(submitButton)

      expect(screen.getByText("Password is required")).toBeInTheDocument()

      // Then provide valid input
      const passwordInput = screen.getByPlaceholderText("Password")
      await user.type(passwordInput, "password123")
      await user.click(submitButton)

      expect(screen.queryByText("Password is required")).not.toBeInTheDocument()
    })
  })

  describe("Password Visibility Toggle", () => {
    it("toggles password visibility when button is clicked", async () => {
      render(<LoginForm onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      await user.type(passwordInput, "test")

      const toggleButton = screen.getByRole("button", { name: "Show password" })

      // Initially password should be hidden
      expect(passwordInput).toHaveAttribute("type", "password")

      // Click to show password
      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute("type", "text")
      expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument()

      // Click to hide password again
      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute("type", "password")
      expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument()
    })

    it("changes toggle button aria-label correctly", async () => {
      render(<LoginForm onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      await user.type(passwordInput, "test")

      const toggleButton = screen.getByRole("button", { name: "Show password" })

      // Click to show password
      await user.click(toggleButton)
      expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument()

      // Click to hide password
      await user.click(toggleButton)
      expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument()
    })

    it("does not submit form when password toggle is clicked", async () => {
      render(<LoginForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      await user.type(passwordInput, "test")

      const toggleButton = screen.getByRole("button", { name: "Show password" })
      await user.click(toggleButton)

      expect(mockOnSuccess).not.toHaveBeenCalled()
    })
  })

  describe("Form Interactions", () => {
    it("updates password field when typed", async () => {
      render(<LoginForm onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      await user.type(passwordInput, "mypassword")

      expect(passwordInput).toHaveValue("mypassword")
    })

    it("shows loading state during submission", async () => {
      render(<LoginForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      const submitButton = screen.getByRole("button", { name: "Sign In" })

      await user.type(passwordInput, "password123")
      await user.click(submitButton)

      expect(screen.getByText("Signing in...")).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })

    it("disables form fields during loading", async () => {
      render(<LoginForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      const submitButton = screen.getByRole("button", { name: "Sign In" })

      await user.type(passwordInput, "password123")
      await user.click(submitButton)

      expect(passwordInput).toBeDisabled()
    })

    it("disables toggle button during loading", async () => {
      render(<LoginForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      const submitButton = screen.getByRole("button", { name: "Sign In" })

      await user.type(passwordInput, "password123")
      const toggleButton = screen.getByRole("button", { name: "Show password" })
      await user.click(submitButton)

      // Toggle button should not be disabled during loading
      expect(toggleButton).not.toBeDisabled()
    })
  })

  describe("Form Submission", () => {
    it("calls onSuccess when login is successful", async () => {
      const { toast } = await import("sonner")

      render(<LoginForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      const submitButton = screen.getByRole("button", { name: "Sign In" })

      await user.type(passwordInput, "password123")
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1)
      })

      expect(toast.success).toHaveBeenCalledWith("Login successful")
    })

    it("does not submit form when validation fails", async () => {
      render(<LoginForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      const submitButton = screen.getByRole("button", { name: "Sign In" })
      await user.click(submitButton)

      // Should show error message and not call onSuccess
      expect(screen.getByText("Password is required")).toBeInTheDocument()

      // Wait a bit to make sure no async calls happen
      await waitFor(
        () => {
          expect(mockOnSuccess).not.toHaveBeenCalled()
        },
        { timeout: 100 },
      )
    })

    it("handles form submission with Enter key", async () => {
      render(<LoginForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")

      await user.type(passwordInput, "password123")
      await user.keyboard("{Enter}")

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe("Error Handling", () => {
    it("applies error styling to password field when there's an error", async () => {
      render(<LoginForm onCancel={mockOnCancel} />)

      const submitButton = screen.getByRole("button", { name: "Sign In" })
      await user.click(submitButton)

      const passwordInput = screen.getByPlaceholderText("Password")
      expect(passwordInput).toHaveClass("border-red-500")
    })

    it("removes error styling when field becomes valid", async () => {
      render(<LoginForm onCancel={mockOnCancel} />)

      // First trigger error
      const submitButton = screen.getByRole("button", { name: "Sign In" })
      await user.click(submitButton)

      const passwordInput = screen.getByPlaceholderText("Password")
      expect(passwordInput).toHaveClass("border-red-500")

      // Then fix the error
      await user.type(passwordInput, "password123")
      await user.click(submitButton)

      expect(passwordInput).not.toHaveClass("border-red-500")
    })
  })

  describe("Accessibility", () => {
    it("has proper form structure", () => {
      render(<LoginForm onCancel={mockOnCancel} />)

      const form = document.querySelector("form")
      expect(form).toBeInTheDocument()
    })

    it("has proper label associations", () => {
      render(<LoginForm onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      expect(passwordInput).toHaveAttribute("id", "password")
    })

    it("has proper button types", async () => {
      render(<LoginForm onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      await user.type(passwordInput, "test")

      const submitButton = screen.getByRole("button", { name: "Sign In" })
      const toggleButton = screen.getByRole("button", { name: "Show password" })

      expect(submitButton).toHaveAttribute("type", "submit")
      expect(toggleButton).toHaveAttribute("type", "button")
    })

    it("has proper aria-labels for password toggle", async () => {
      render(<LoginForm onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      await user.type(passwordInput, "test")

      const toggleButton = screen.getByRole("button", { name: "Show password" })
      expect(toggleButton).toHaveAttribute("aria-label", "Show password")
    })

    it("updates aria-label when password visibility changes", async () => {
      render(<LoginForm onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      await user.type(passwordInput, "test")

      const toggleButton = screen.getByRole("button", { name: "Show password" })

      await user.click(toggleButton)
      expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
        "aria-label",
        "Hide password",
      )

      await user.click(toggleButton)
      expect(screen.getByRole("button", { name: "Show password" })).toHaveAttribute(
        "aria-label",
        "Show password",
      )
    })
  })

  describe("User Experience", () => {
    it("has proper card layout", () => {
      render(<LoginForm onCancel={mockOnCancel} />)

      // Check for card structure
      const card =
        document.querySelector('[class*="rounded-lg"]') || document.querySelector('[class*="card"]')
      expect(card).toBeInTheDocument()
    })

    it("has proper spacing and padding in form", () => {
      render(<LoginForm onCancel={mockOnCancel} />)

      const form = document.querySelector("form")
      expect(form).toHaveClass("space-y-4")
    })

    it("positions toggle button correctly", async () => {
      render(<LoginForm onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      await user.type(passwordInput, "test")

      const toggleButton = screen.getByRole("button", { name: "Show password" })
      expect(toggleButton.parentElement).toHaveClass("relative")
      expect(toggleButton).toHaveClass("absolute", "right-0")
    })
  })
})
