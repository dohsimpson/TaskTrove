import type { CreateTaskRequest } from "@tasktrove/types/api-requests"
import type { User } from "@tasktrove/types/core"
import type { UserId } from "@tasktrove/types/id"
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
