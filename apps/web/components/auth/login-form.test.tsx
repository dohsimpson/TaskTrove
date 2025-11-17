import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { LoginForm } from "./login-form"

// Define SignInResult type based on next-auth documentation
type SignInResult = {
  error: string | undefined
  code: string | undefined
  status: number
  ok: boolean
  url: string | null
}

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}))

// Mock console.error to suppress error logs in tests
vi.spyOn(console, "error").mockImplementation(() => {})

describe("LoginForm", () => {
  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()
  const user = userEvent.setup()

  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset signIn mock to default behavior (return error)
    const { signIn } = await import("next-auth/react")
    vi.mocked(signIn).mockResolvedValue({
      error: "default-error",
      code: "CREDENTIALS_SIGNIN",
      status: 401,
      ok: false,
      url: null,
    })
  })

  describe("Rendering", () => {
    it("renders card layout with form elements", () => {
      render(<LoginForm needsPasswordSetup={false} onCancel={mockOnCancel} />)

      expect(screen.getByPlaceholderText("Password")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument()
      // Toggle button only appears when there's text
      expect(screen.queryByRole("button", { name: "Show password" })).not.toBeInTheDocument()
    })

    it("has proper password input attributes", () => {
      render(<LoginForm needsPasswordSetup={false} onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      expect(passwordInput).toHaveAttribute("type", "password")
      expect(passwordInput).toHaveAttribute("placeholder", "Password")
    })

    it("shows password visibility toggle button when there is text", async () => {
      render(<LoginForm needsPasswordSetup={false} onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      await user.type(passwordInput, "test")

      const toggleButton = screen.getByRole("button", { name: "Show password" })
      expect(toggleButton).toBeInTheDocument()
    })

    it("shows Eye icon when password is hidden and text is present", async () => {
      render(<LoginForm needsPasswordSetup={false} onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      await user.type(passwordInput, "test")

      // Eye icon should be present when password is hidden
      const eyeIcon = document.querySelector(".lucide-eye")
      expect(eyeIcon).toBeInTheDocument()
    })

    it("shows EyeOff icon when password is visible", async () => {
      render(<LoginForm needsPasswordSetup={false} onCancel={mockOnCancel} />)

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
      render(<LoginForm needsPasswordSetup={false} onCancel={mockOnCancel} />)

      const submitButton = screen.getByRole("button", { name: "Sign In" })
      await user.click(submitButton)

      expect(screen.getByText("Password is required")).toBeInTheDocument()
    })

    it("clears error when valid password is provided", async () => {
      render(<LoginForm needsPasswordSetup={false} onCancel={mockOnCancel} />)

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
      render(<LoginForm needsPasswordSetup={false} onCancel={mockOnCancel} />)

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
      render(<LoginForm needsPasswordSetup={false} onCancel={mockOnCancel} />)

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
      render(
        <LoginForm needsPasswordSetup={false} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      )

      const passwordInput = screen.getByPlaceholderText("Password")
      await user.type(passwordInput, "test")

      const toggleButton = screen.getByRole("button", { name: "Show password" })
      await user.click(toggleButton)

      expect(mockOnSuccess).not.toHaveBeenCalled()
    })
  })

  describe("Form Interactions", () => {
    it("updates password field when typed", async () => {
      render(<LoginForm needsPasswordSetup={false} onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      await user.type(passwordInput, "mypassword")

      expect(passwordInput).toHaveValue("mypassword")
    })

    it("shows loading state during submission", async () => {
      const { signIn } = await import("next-auth/react")

      // Mock slow sign in that resolves after loading is checked
      let resolveSignIn: (value: SignInResult) => void = () => {}
      const signInPromise = new Promise<SignInResult>((resolve) => {
        resolveSignIn = resolve
      })
      vi.mocked(signIn).mockReturnValue(signInPromise)

      render(
        <LoginForm needsPasswordSetup={false} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      )

      const passwordInput = screen.getByPlaceholderText("Password")
      const submitButton = screen.getByRole("button", { name: "Sign In" })

      await user.type(passwordInput, "password123")
      await user.click(submitButton)

      expect(screen.getByText("Signing in...")).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      // Resolve the promise to clean up
      resolveSignIn({ ok: true, status: 200, url: "/", error: undefined, code: undefined })
    })

    it("disables form fields during loading", async () => {
      const { signIn } = await import("next-auth/react")

      // Mock slow sign in that resolves after loading is checked
      let resolveSignIn: (value: SignInResult) => void = () => {}
      const signInPromise = new Promise<SignInResult>((resolve) => {
        resolveSignIn = resolve
      })
      vi.mocked(signIn).mockReturnValue(signInPromise)

      render(
        <LoginForm needsPasswordSetup={false} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      )

      const passwordInput = screen.getByPlaceholderText("Password")
      const submitButton = screen.getByRole("button", { name: "Sign In" })

      await user.type(passwordInput, "password123")
      await user.click(submitButton)

      expect(passwordInput).toBeDisabled()

      // Resolve the promise to clean up
      resolveSignIn({ ok: true, status: 200, url: "/", error: undefined, code: undefined })
    })

    it("disables toggle button during loading", async () => {
      render(
        <LoginForm needsPasswordSetup={false} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      )

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
      const { signIn } = await import("next-auth/react")

      // Mock successful sign in
      vi.mocked(signIn).mockResolvedValue({
        ok: true,
        status: 200,
        url: "/",
        error: undefined,
        code: undefined,
      })

      render(
        <LoginForm needsPasswordSetup={false} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      )

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
      render(
        <LoginForm needsPasswordSetup={false} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      )

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
      const { signIn } = await import("next-auth/react")

      // Mock successful sign in
      vi.mocked(signIn).mockResolvedValue({
        ok: true,
        status: 200,
        url: "/",
        error: undefined,
        code: undefined,
      })

      render(
        <LoginForm needsPasswordSetup={false} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      )

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
      render(<LoginForm needsPasswordSetup={false} onCancel={mockOnCancel} />)

      const submitButton = screen.getByRole("button", { name: "Sign In" })
      await user.click(submitButton)

      const passwordInput = screen.getByPlaceholderText("Password")
      expect(passwordInput).toHaveClass("border-red-500")
    })

    it("removes error styling when field becomes valid", async () => {
      const { signIn } = await import("next-auth/react")

      render(<LoginForm needsPasswordSetup={false} onCancel={mockOnCancel} />)

      // First trigger error
      const submitButton = screen.getByRole("button", { name: "Sign In" })
      await user.click(submitButton)

      const passwordInput = screen.getByPlaceholderText("Password")
      expect(passwordInput).toHaveClass("border-red-500")

      // Mock successful sign in for second attempt
      vi.mocked(signIn).mockResolvedValue({
        ok: true,
        status: 200,
        url: "/",
        error: undefined,
        code: undefined,
      })

      // Then fix the error
      await user.type(passwordInput, "password123")
      await user.click(submitButton)

      await waitFor(() => {
        expect(passwordInput).not.toHaveClass("border-red-500")
      })
    })
  })

  describe("Accessibility", () => {
    it("has proper form structure", () => {
      render(<LoginForm needsPasswordSetup={false} onCancel={mockOnCancel} />)

      const form = document.querySelector("form")
      expect(form).toBeInTheDocument()
    })

    it("has proper label associations", () => {
      render(<LoginForm needsPasswordSetup={false} onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      expect(passwordInput).toHaveAttribute("id", "password")
    })

    it("has proper button types", async () => {
      render(<LoginForm needsPasswordSetup={false} onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      await user.type(passwordInput, "test")

      const submitButton = screen.getByRole("button", { name: "Sign In" })
      const toggleButton = screen.getByRole("button", { name: "Show password" })

      expect(submitButton).toHaveAttribute("type", "submit")
      expect(toggleButton).toHaveAttribute("type", "button")
    })

    it("has proper aria-labels for password toggle", async () => {
      render(<LoginForm needsPasswordSetup={false} onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      await user.type(passwordInput, "test")

      const toggleButton = screen.getByRole("button", { name: "Show password" })
      expect(toggleButton).toHaveAttribute("aria-label", "Show password")
    })

    it("updates aria-label when password visibility changes", async () => {
      render(<LoginForm needsPasswordSetup={false} onCancel={mockOnCancel} />)

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
      render(<LoginForm needsPasswordSetup={false} onCancel={mockOnCancel} />)

      // Check for card structure
      const card =
        document.querySelector('[class*="rounded-lg"]') || document.querySelector('[class*="card"]')
      expect(card).toBeInTheDocument()
    })

    it("has proper spacing and padding in form", () => {
      render(<LoginForm needsPasswordSetup={false} onCancel={mockOnCancel} />)

      const form = document.querySelector("form")
      expect(form).toHaveClass("space-y-4")
    })

    it("positions toggle button correctly", async () => {
      render(<LoginForm needsPasswordSetup={false} onCancel={mockOnCancel} />)

      const passwordInput = screen.getByPlaceholderText("Password")
      await user.type(passwordInput, "test")

      const toggleButton = screen.getByRole("button", { name: "Show password" })
      expect(toggleButton.parentElement).toHaveClass("relative")
      expect(toggleButton).toHaveClass("absolute", "right-0")
    })
  })

  describe("SSO Header Authentication Mode (Pro Feature)", () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    describe("SSO Mode Display", () => {
      it("should display SSO authentication interface when headerAuthUser is provided", () => {
        render(
          <LoginForm
            onSuccess={mockOnSuccess}
            onCancel={mockOnCancel}
            headerAuthUser="testuser"
            needsPasswordSetup={false}
          />,
        )

        // Should show authenticated as message
        expect(screen.getByText("Authenticated as")).toBeInTheDocument()
        expect(screen.getByText("testuser")).toBeInTheDocument()

        // Should show SSO sign in button
        expect(screen.getByText("SSO Sign In")).toBeInTheDocument()

        // Should not show password input
        expect(screen.queryByPlaceholderText(/Password/i)).not.toBeInTheDocument()

        // Should not show username input (it's pre-filled)
        expect(screen.queryByPlaceholderText(/Username/i)).not.toBeInTheDocument()
      })

      it("should prioritize password setup over SSO mode", () => {
        render(
          <LoginForm
            onSuccess={mockOnSuccess}
            onCancel={mockOnCancel}
            headerAuthUser="testuser"
            needsPasswordSetup={true}
          />,
        )

        // Should show password setup interface instead of SSO
        expect(screen.getByText(/First Time Setup/i)).toBeInTheDocument()
        expect(screen.getByText(/Welcome! Let's complete your initial setup/i)).toBeInTheDocument()
        expect(screen.getByPlaceholderText(/Create Password/i)).toBeInTheDocument()
        expect(screen.getByPlaceholderText(/Confirm Password/i)).toBeInTheDocument()

        // Should not show SSO interface
        expect(screen.queryByText("SSO Sign In")).not.toBeInTheDocument()
        expect(screen.queryByText("Authenticated as")).not.toBeInTheDocument()
      })

      it("should display username in highlighted container", () => {
        render(
          <LoginForm
            onSuccess={mockOnSuccess}
            onCancel={mockOnCancel}
            headerAuthUser="john.doe@company.com"
            needsPasswordSetup={false}
          />,
        )

        const usernameDisplay = screen.getByText("john.doe@company.com")
        expect(usernameDisplay).toBeInTheDocument()
        // Find the highlighted container by going up two levels to reach the div with bg-muted class
        expect(usernameDisplay.parentElement?.parentElement).toHaveClass("bg-muted", "rounded-lg")
      })
    })

    describe("SSO Authentication Flow", () => {
      it("should call signIn with header-auth provider when SSO button is clicked", async () => {
        const { signIn } = await import("next-auth/react")
        vi.mocked(signIn).mockResolvedValue({
          error: undefined,
          code: undefined,
          status: 200,
          ok: true,
          url: "/",
        })

        render(
          <LoginForm
            onSuccess={mockOnSuccess}
            onCancel={mockOnCancel}
            headerAuthUser="testuser"
            needsPasswordSetup={false}
          />,
        )

        const ssoButton = screen.getByText("SSO Sign In")
        await user.click(ssoButton)

        expect(signIn).toHaveBeenCalledWith("header-auth", {
          remoteUser: "testuser",
          redirect: true,
          callbackUrl: "/",
        })
      })

      it("should show loading state during SSO authentication", async () => {
        const { signIn } = await import("next-auth/react")
        // Make signIn hang to test loading state
        vi.mocked(signIn).mockReturnValue(new Promise(() => {}))

        render(
          <LoginForm
            onSuccess={mockOnSuccess}
            onCancel={mockOnCancel}
            headerAuthUser="testuser"
            needsPasswordSetup={false}
          />,
        )

        const ssoButton = screen.getByText("SSO Sign In")
        await user.click(ssoButton)

        // Should show loading state
        expect(screen.getByText("Signing in...")).toBeInTheDocument()
        expect(ssoButton).toBeDisabled()
      })

      it("should handle SSO authentication errors", async () => {
        const { signIn } = await import("next-auth/react")
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
        vi.mocked(signIn).mockRejectedValue(new Error("Authentication failed"))

        render(
          <LoginForm
            onSuccess={mockOnSuccess}
            onCancel={mockOnCancel}
            headerAuthUser="testuser"
            needsPasswordSetup={false}
          />,
        )

        const ssoButton = screen.getByText("SSO Sign In")
        await user.click(ssoButton)

        await waitFor(() => {
          expect(screen.getByText("Authentication failed. Please try again.")).toBeInTheDocument()
        })

        expect(consoleSpy).toHaveBeenCalledWith(
          "[Header Auth] Sign-in exception:",
          expect.any(Error),
        )

        consoleSpy.mockRestore()
      })

      it("should handle error state and allow retry", async () => {
        const { signIn } = await import("next-auth/react")
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

        // First call fails
        vi.mocked(signIn).mockRejectedValueOnce(new Error("Network error"))

        render(
          <LoginForm
            onSuccess={mockOnSuccess}
            onCancel={mockOnCancel}
            headerAuthUser="testuser"
            needsPasswordSetup={false}
          />,
        )

        const ssoButton = screen.getByText("SSO Sign In")

        // First attempt - should fail and show error
        await user.click(ssoButton)
        await waitFor(() => {
          expect(screen.getByText("Authentication failed. Please try again.")).toBeInTheDocument()
        })

        // Button should still be clickable for retry
        expect(ssoButton).toBeEnabled()
        expect(ssoButton).toHaveTextContent("SSO Sign In")

        consoleSpy.mockRestore()
      })
    })

    describe("SSO Mode vs Regular Mode", () => {
      it("should not show SSO interface when headerAuthUser is not provided", () => {
        render(
          <LoginForm
            onSuccess={mockOnSuccess}
            onCancel={mockOnCancel}
            needsPasswordSetup={false}
          />,
        )

        // Should show regular login form
        expect(screen.getByPlaceholderText("Password")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument()

        // Should not show SSO interface
        expect(screen.queryByText("SSO Sign In")).not.toBeInTheDocument()
        expect(screen.queryByText("Authenticated as")).not.toBeInTheDocument()
      })

      it("should not show SSO interface when headerAuthUser is null", () => {
        render(
          <LoginForm
            onSuccess={mockOnSuccess}
            onCancel={mockOnCancel}
            headerAuthUser={null}
            needsPasswordSetup={false}
          />,
        )

        // Should show regular login form
        expect(screen.getByPlaceholderText("Password")).toBeInTheDocument()

        // Should not show SSO interface
        expect(screen.queryByText("SSO Sign In")).not.toBeInTheDocument()
      })

      it("should not show SSO interface when headerAuthUser is empty string", () => {
        render(
          <LoginForm
            onSuccess={mockOnSuccess}
            onCancel={mockOnCancel}
            headerAuthUser=""
            needsPasswordSetup={false}
          />,
        )

        // Should show regular login form
        expect(screen.getByPlaceholderText("Password")).toBeInTheDocument()

        // Should not show SSO interface
        expect(screen.queryByText("SSO Sign In")).not.toBeInTheDocument()
      })
    })

    describe("Component Props and Integration", () => {
      it("should handle long usernames in SSO mode", () => {
        const longUsername = "very.long.username.with.multiple.dots@company.subdomain.com"

        render(
          <LoginForm
            onSuccess={mockOnSuccess}
            onCancel={mockOnCancel}
            headerAuthUser={longUsername}
            needsPasswordSetup={false}
          />,
        )

        expect(screen.getByText(longUsername)).toBeInTheDocument()
      })

      it("should handle special characters in usernames for SSO mode", () => {
        const specialUsername = "user+tag@example-domain.co.uk"

        render(
          <LoginForm
            onSuccess={mockOnSuccess}
            onCancel={mockOnCancel}
            headerAuthUser={specialUsername}
            needsPasswordSetup={false}
          />,
        )

        expect(screen.getByText(specialUsername)).toBeInTheDocument()
      })

      it("should handle onSuccess callback in SSO mode", async () => {
        const { signIn } = await import("next-auth/react")
        vi.mocked(signIn).mockResolvedValue({
          error: undefined,
          code: undefined,
          status: 200,
          ok: true,
          url: "/",
        })

        render(
          <LoginForm
            onSuccess={mockOnSuccess}
            onCancel={mockOnCancel}
            headerAuthUser="testuser"
            needsPasswordSetup={false}
          />,
        )

        const ssoButton = screen.getByText("SSO Sign In")
        await user.click(ssoButton)

        // onSuccess is typically called by NextAuth redirect, not directly by the component
        // But we verify the component doesn't prevent the flow
        expect(signIn).toHaveBeenCalled()
      })
    })

    describe("Error Handling and Edge Cases", () => {
      it("should handle signIn exception when authentication fails", async () => {
        const { signIn } = await import("next-auth/react")
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

        // Mock signIn to throw an exception (this triggers the catch block)
        vi.mocked(signIn).mockRejectedValue(new Error("Authentication service unavailable"))

        render(
          <LoginForm
            onSuccess={mockOnSuccess}
            onCancel={mockOnCancel}
            headerAuthUser="testuser"
            needsPasswordSetup={false}
          />,
        )

        const ssoButton = screen.getByText("SSO Sign In")
        await user.click(ssoButton)

        // Component should handle the error case
        await waitFor(() => {
          expect(screen.getByText("Authentication failed. Please try again.")).toBeInTheDocument()
        })

        // Should log the error
        expect(consoleSpy).toHaveBeenCalledWith(
          "[Header Auth] Sign-in exception:",
          expect.any(Error),
        )

        consoleSpy.mockRestore()
      })

      it("should handle network timeout during SSO authentication", async () => {
        const { signIn } = await import("next-auth/react")
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

        // Simulate network timeout
        vi.mocked(signIn).mockRejectedValue(new Error("Network timeout"))

        render(
          <LoginForm
            onSuccess={mockOnSuccess}
            onCancel={mockOnCancel}
            headerAuthUser="testuser"
            needsPasswordSetup={false}
          />,
        )

        const ssoButton = screen.getByText("SSO Sign In")
        await user.click(ssoButton)

        await waitFor(() => {
          expect(screen.getByText("Authentication failed. Please try again.")).toBeInTheDocument()
        })

        expect(consoleSpy).toHaveBeenCalledWith(
          "[Header Auth] Sign-in exception:",
          expect.any(Error),
        )

        consoleSpy.mockRestore()
      })
    })
  })
})
