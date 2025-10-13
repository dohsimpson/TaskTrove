import type { Task } from "@/lib/types"
import { StubIndicator } from "@/components/debug"

export interface AssigneeBadgesProps {
  task: Task
  maxDisplay?: number
  className?: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AssigneeBadges(_props: AssigneeBadgesProps) {
  return <StubIndicator />
}
