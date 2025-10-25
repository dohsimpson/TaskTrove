import type { CreateTaskRequest, User, UserId } from "@/lib/types"
import type { RouteContext } from "@tasktrove/atoms/ui/navigation"

export function getProViewUpdates(
  routeContext: RouteContext,
  users: User[],
  sessionUserId: UserId,
): Partial<CreateTaskRequest> {
  void routeContext
  void users
  void sessionUserId
  return {}
}
