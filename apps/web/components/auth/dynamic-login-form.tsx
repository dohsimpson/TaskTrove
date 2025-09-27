"use client"

import dynamic from "next/dynamic"
import { LoginFormProps } from "./login-form"

// Dynamically import the LoginForm with SSR disabled
const LoginForm = dynamic(
  () => import("./login-form").then((mod) => ({ default: mod.LoginForm })),
  {
    ssr: false,
  },
)

/**
 * Dynamic wrapper for LoginForm that prevents SSR
 * This is needed because LoginForm uses translation hooks that require client-side rendering
 */
export function DynamicLoginForm(props: LoginFormProps) {
  return <LoginForm {...props} />
}
