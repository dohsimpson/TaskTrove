import type { AutocompleteType } from "@tasktrove/parser/types"
import type { User } from "@/lib/types"

interface AutocompleteItem {
  id: string
  label: string
  icon: React.ReactNode
  type: AutocompleteType
  value?: string
}

// Stub: Base version doesn't support assignees (Pro feature)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getAssigneeAutocompleteItems(_users: User[]): AutocompleteItem[] {
  return []
}
