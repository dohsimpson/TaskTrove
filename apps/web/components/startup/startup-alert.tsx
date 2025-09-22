"use client"

import { ReactNode } from "react"
import { LucideIcon, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface StartupAlertProps {
  icon: LucideIcon
  title: string
  variant?: "default" | "destructive" | "warning" | "info"
  children: ReactNode
  actions?: {
    primary?: {
      label: string
      onClick: () => void
      loading?: boolean
      loadingLabel?: string
      confirmDialog?: {
        title: string
        description: ReactNode
        confirmLabel: string
        confirmVariant?: "default" | "destructive"
      }
    }
    secondary?: {
      label: string
      onClick: () => void
      loading?: boolean
    }
    recheck?: {
      onClick: () => void
      loading?: boolean
    }
  }
  links?: Array<{
    href: string
    label: string
  }>
  showConfirmDialog?: boolean
  onConfirmDialogChange?: (open: boolean) => void
}

const variantStyles = {
  default: "",
  destructive: "",
  warning: "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950",
  info: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
}

const iconStyles = {
  default: "",
  destructive: "",
  warning: "text-yellow-600 dark:text-yellow-400",
  info: "text-blue-600 dark:text-blue-400",
}

const titleStyles = {
  default: "",
  destructive: "font-bold",
  warning: "text-yellow-800 dark:text-yellow-200",
  info: "text-blue-800 dark:text-blue-200",
}

const descriptionStyles = {
  default: "",
  destructive: "",
  warning: "text-yellow-700 dark:text-yellow-300",
  info: "text-blue-700 dark:text-blue-300",
}

const linkStyles = {
  default: "underline hover:text-foreground/80",
  destructive: "underline hover:text-red-300",
  warning: "underline hover:text-yellow-600 dark:hover:text-yellow-200",
  info: "underline hover:text-blue-600 dark:hover:text-blue-200",
}

export function StartupAlert({
  icon: Icon,
  title,
  variant = "default",
  children,
  actions,
  links,
  showConfirmDialog = false,
  onConfirmDialogChange,
}: StartupAlertProps) {
  const alertVariant = variant === "warning" || variant === "info" ? undefined : variant

  return (
    <>
      <Alert variant={alertVariant} className={`mb-4 ${variantStyles[variant]}`}>
        <Icon className={`h-4 w-4 ${iconStyles[variant]}`} />
        <AlertTitle className={titleStyles[variant]}>{title}</AlertTitle>
        <AlertDescription className={`mt-2 ${descriptionStyles[variant]}`}>
          <div className="space-y-3">
            <div>
              {children}
              {links && links.length > 0 && (
                <p className="text-sm mt-1">
                  {links.map((link, index) => (
                    <span key={link.href}>
                      {index > 0 && " • "}
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={linkStyles[variant]}
                      >
                        {link.label}
                      </a>
                    </span>
                  ))}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex gap-2">
                {actions.primary && (
                  <Button
                    onClick={
                      actions.primary.confirmDialog
                        ? () => onConfirmDialogChange?.(true)
                        : actions.primary.onClick
                    }
                    disabled={
                      actions.primary.loading ||
                      actions.secondary?.loading ||
                      actions.recheck?.loading
                    }
                    size="sm"
                    variant={variant === "warning" || variant === "info" ? "default" : "outline"}
                  >
                    {actions.primary.loading ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                        {actions.primary.loadingLabel || "Processing..."}
                      </>
                    ) : (
                      actions.primary.label
                    )}
                  </Button>
                )}
                {actions.secondary && (
                  <Button
                    onClick={actions.secondary.onClick}
                    disabled={
                      actions.primary?.loading ||
                      actions.secondary.loading ||
                      actions.recheck?.loading
                    }
                    variant="outline"
                    size="sm"
                  >
                    {actions.secondary.loading ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      actions.secondary.label
                    )}
                  </Button>
                )}
                {actions.recheck && (
                  <Button
                    onClick={actions.recheck.onClick}
                    disabled={
                      actions.primary?.loading ||
                      actions.secondary?.loading ||
                      actions.recheck.loading
                    }
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {actions.recheck.loading ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>Checking...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3" />
                        <span>Recheck</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {actions?.primary?.confirmDialog && (
        <AlertDialog open={showConfirmDialog} onOpenChange={onConfirmDialogChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{actions.primary.confirmDialog.title}</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>{actions.primary.confirmDialog.description}</div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  variant={
                    actions.primary.confirmDialog.confirmVariant === "destructive"
                      ? "outline"
                      : "default"
                  }
                  className={
                    actions.primary.confirmDialog.confirmVariant === "destructive"
                      ? "border border-red-600 text-red-600 hover:text-red-700 bg-transparent hover:bg-transparent cursor-pointer"
                      : ""
                  }
                  onClick={() => {
                    onConfirmDialogChange?.(false)
                    actions.primary?.onClick()
                  }}
                >
                  {actions.primary.confirmDialog.confirmLabel}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
