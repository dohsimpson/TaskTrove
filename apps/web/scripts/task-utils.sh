#!/bin/bash

# Task utility functions for analyzing data.json

DATA_FILE="${DATA_FILE:-data/data.json}"

# Get all task IDs from the data file
get_task_ids() {
  jq -r '.tasks[].id' "$DATA_FILE"
}

# Get task IDs filtered by project ID
# Usage: get_task_ids_by_project <projectId>
get_task_ids_by_project() {
  local project_id="$1"

  if [ -z "$project_id" ]; then
    echo "Error: projectId is required" >&2
    return 1
  fi

  jq -r --arg pid "$project_id" \
    '.tasks[] | select(.projectId == $pid) | .id' \
    "$DATA_FILE"
}

# Get orphaned task IDs by project (tasks assigned to project but not in any section.items)
# Usage: get_orphaned_tasks_by_project <projectId>
get_orphaned_tasks_by_project() {
  local project_id="$1"

  if [ -z "$project_id" ]; then
    echo "Error: projectId is required" >&2
    return 1
  fi

  jq -r --arg pid "$project_id" '
    # Get all task IDs in sections for this project
    [.projects[] | select(.id == $pid) | .sections[]?.items[]?] as $section_task_ids |

    # Get all tasks for this project and filter out those in sections
    .tasks[] |
    select(.projectId == $pid) |
    .id |
    select(. as $tid | $section_task_ids | index($tid) == null)
  ' "$DATA_FILE" | sort -u
}

# If script is executed directly, show usage
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  echo "Task utility functions for TaskTrove data.json"
  echo ""
  echo "Usage: source $0"
  echo ""
  echo "Available functions:"
  echo "  get_task_ids                          - Get all task IDs"
  echo "  get_task_ids_by_project <projectId>   - Get task IDs for a specific project"
  echo "  get_orphaned_tasks_by_project <projectId> - Get orphaned task IDs for a project"
  echo ""
  echo "Environment variables:"
  echo "  DATA_FILE - Path to data.json (default: data/data.json)"
fi
