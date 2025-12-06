"use client"

import { useState } from "react"
import { FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { ProjectId } from "@tasktrove/types/id"

interface ProjectInfo {
  id: ProjectId
  name: string
  color: string
}

interface ProjectPickerProps {
  projectId?: ProjectId
  projects: ProjectInfo[]
  onUpdate: (projectId: ProjectId | undefined) => void
  className?: string
  children?: React.ReactNode
}

export function ProjectPicker({
  projectId,
  projects,
  onUpdate,
  className,
  children,
}: ProjectPickerProps) {
  const [showProjectPicker, setShowProjectPicker] = useState(false)

  const project = projects.find((p) => p.id === projectId)

  return (
    <Popover open={showProjectPicker} onOpenChange={setShowProjectPicker}>
      <PopoverTrigger asChild>
        {children || (
          <span
            className={`flex items-center gap-1 cursor-pointer hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md transition-colors text-sm text-gray-600 ${className || ""}`}
          >
            {project ? (
              <>
                <FolderOpen className="h-3 w-3 flex-shrink-0" style={{ color: project.color }} />
                {project.name}
              </>
            ) : (
              <>
                <FolderOpen className="h-3 w-3" />
                Add project
              </>
            )}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        {projects.map((proj) => (
          <Button
            key={proj.id}
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8"
            onClick={() => {
              onUpdate(proj.id)
              setShowProjectPicker(false)
            }}
          >
            <FolderOpen className="w-3 h-3 mr-2" style={{ color: proj.color }} />
            {proj.name}
          </Button>
        ))}
        {projectId && (
          <>
            <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs text-gray-500"
              onClick={() => {
                onUpdate(undefined)
                setShowProjectPicker(false)
              }}
            >
              Remove from project
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
