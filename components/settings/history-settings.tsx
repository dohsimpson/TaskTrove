/**
 * History Settings Component
 *
 * Provides UI controls for managing undo/redo history settings including:
 * - History limits for different atom types
 * - Clear history action
 * - History status display
 */

import React, { useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { DeleteConfirmDialog } from "@/components/dialogs/delete-confirm-dialog"
import { historyStateAtom, clearHistoryAtom, historyAtoms } from "@/lib/atoms/core/history"
import { Trash2, Info, History } from "lucide-react"

interface HistorySettingsProps {
  className?: string
}

export const HistorySettings: React.FC<HistorySettingsProps> = ({ className }) => {
  const historyState = useAtomValue(historyStateAtom)
  const clearHistory = useSetAtom(clearHistoryAtom)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const handleClearHistory = () => {
    clearHistory()
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          History Settings
        </CardTitle>
        <CardDescription>
          Configure undo/redo history settings and view current status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* History Status */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Current History Status</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div>
                <div className="text-sm font-medium">Tasks</div>
                <div className="text-xs text-muted-foreground">History entries</div>
              </div>
              <Badge variant="secondary">
                {historyState.historyInfo.tasks.historyLength}/{historyAtoms.config.tasks}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div>
                <div className="text-sm font-medium">Projects</div>
                <div className="text-xs text-muted-foreground">History entries</div>
              </div>
              <Badge variant="secondary">
                {historyState.historyInfo.projects.historyLength}/{historyAtoms.config.projects}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div>
                <div className="text-sm font-medium">Labels</div>
                <div className="text-xs text-muted-foreground">History entries</div>
              </div>
              <Badge variant="secondary">
                {historyState.historyInfo.labels.historyLength}/{historyAtoms.config.labels}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* History Limits Configuration */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">History Limits</Label>
          <div className="text-sm text-muted-foreground mb-3">
            These limits are currently configured in the application code. Future versions may allow
            runtime configuration.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tasks-limit">Tasks History Limit</Label>
              <Input
                id="tasks-limit"
                type="number"
                value={historyAtoms.config.tasks}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projects-limit">Projects History Limit</Label>
              <Input
                id="projects-limit"
                type="number"
                value={historyAtoms.config.projects}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="labels-limit">Labels History Limit</Label>
              <Input
                id="labels-limit"
                type="number"
                value={historyAtoms.config.labels}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Last Operation */}
        {historyState.lastOperation && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Last Operation</Label>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{historyState.lastOperation}</span>
            </div>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Actions</Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={!historyState.canUndo}
              onClick={() => setShowClearConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
              Clear All History
            </Button>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Keyboard Shortcuts
              </div>
              <div className="text-blue-700 dark:text-blue-300 space-y-1">
                <div>
                  •{" "}
                  <kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">
                    Ctrl+Z
                  </kbd>{" "}
                  (or{" "}
                  <kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">
                    Cmd+Z
                  </kbd>
                  ) - Undo
                </div>
                <div>
                  •{" "}
                  <kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">
                    Ctrl+Y
                  </kbd>{" "}
                  (or{" "}
                  <kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">
                    Cmd+Y
                  </kbd>
                  ) - Redo
                </div>
                <div>
                  •{" "}
                  <kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">
                    Ctrl+Shift+Z
                  </kbd>{" "}
                  (or{" "}
                  <kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">
                    Cmd+Shift+Z
                  </kbd>
                  ) - Redo
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <DeleteConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        onConfirm={handleClearHistory}
        entityType="history"
        variant="default"
      />
    </Card>
  )
}

/**
 * Compact History Status Component
 * Can be used in other parts of the app to show history status
 */
export const HistoryStatus: React.FC<{ className?: string }> = ({ className }) => {
  const historyState = useAtomValue(historyStateAtom)

  if (!historyState.canUndo && !historyState.canRedo) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
      <History className="h-3 w-3" />
      {historyState.canUndo && <span>Can undo</span>}
      {historyState.canUndo && historyState.canRedo && <span>•</span>}
      {historyState.canRedo && <span>Can redo</span>}
      {historyState.lastOperation && (
        <>
          <span>•</span>
          <span className="truncate max-w-[200px]">{historyState.lastOperation}</span>
        </>
      )}
    </div>
  )
}

export default HistorySettings
