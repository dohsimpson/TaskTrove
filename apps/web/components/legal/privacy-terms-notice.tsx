import Link from "next/link"
import { cn } from "@/lib/utils"

interface PrivacyTermsNoticeProps {
  className?: string
}

export function PrivacyTermsNotice({ className }: PrivacyTermsNoticeProps) {
  return (
    <p className={cn("text-center text-xs text-muted-foreground", className)}>
      <Link
        href="https://tasktrove.io/toc"
        target="_blank"
        rel="noreferrer"
        className="underline-offset-2 hover:underline"
      >
        Terms
      </Link>{" "}
      -{" "}
      <Link
        href="https://tasktrove.io/privacy"
        target="_blank"
        rel="noreferrer"
        className="underline-offset-2 hover:underline"
      >
        Privacy
      </Link>
    </p>
  )
}
