import { safeReadUserFile } from "@/lib/utils/safe-file-operations"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

interface EnsureUserFileProps {
  children: React.ReactNode
}

/**
 * Server component that checks if the user file is readable and shows a banner if not.
 * Always renders children, but displays an error banner at the top if the file is unreadable.
 *
 * This component:
 * - Reads and validates the user file using safeReadUserFile
 * - Shows an error banner if the file is unreadable
 * - Always renders children (e.g., the login page) regardless of file status
 */
export async function EnsureUserFile({ children }: EnsureUserFileProps) {
  const userFile = await safeReadUserFile()

  return (
    <>
      {!userFile && (
        <div className="w-full p-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Data File Error</AlertTitle>
            <AlertDescription>
              <p className="mb-3">
                Unable to read or validate the user data file. The application may not function
                correctly.
              </p>
              <div className="text-sm">
                <p className="font-medium mb-1">Possible causes:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>Data file does not exist</li>
                  <li>Data file is corrupted or has invalid format</li>
                  <li>Insufficient file permissions</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
      {children}
    </>
  )
}
