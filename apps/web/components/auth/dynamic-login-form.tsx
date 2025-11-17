"use client"

import { LoginForm, type LoginFormProps } from "./login-form"

/**
 * Client wrapper for LoginForm to ensure it renders on the client boundary.
 * LoginForm relies on client-only translation hooks, so keep this component client-only.
 */
export function DynamicLoginForm(props: LoginFormProps) {
  return <LoginForm {...props} />
}
