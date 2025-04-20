import React, { useMemo } from "react";
import { Schedule } from "./types";

type SortMethod = "nextExecution" | "lastExecution" | "lastUpdated" | "created";
type SortDirection = "asc" | "desc";

interface ScheduleSortControlProps {
  schedules: Schedule[];
  sortMethod: SortMethod;
  setSortMethod: (method: SortMethod) => void;
  sortDirection: SortDirection;
  setSortDirection: (dir: SortDirection) => void;
  /** 
   * Render prop receives the sorted schedules.
   */
  children: (sortedSchedules: Schedule[]) => React.ReactNode;
}

const formatDateWithoutYearAndSeconds = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Helper function to get the last execution or skipped time, whichever is more recent
const getLastExecutionOrSkippedTime = (schedule: Schedule): string | null => {
  if (!schedule.lastExecutionTime && !schedule.lastSkippedTime) return null;
  if (!schedule.lastExecutionTime) return schedule.lastSkippedTime || null;
  if (!schedule.lastSkippedTime) return schedule.lastExecutionTime || null;
  // Return the more recent of the two
  return new Date(schedule.lastExecutionTime).getTime() > new Date(schedule.lastSkippedTime).getTime()
    ? schedule.lastExecutionTime
    : schedule.lastSkippedTime;
};

const ScheduleSortControl: React.FC<ScheduleSortControlProps> = ({
  schedules,
  sortMethod,
  setSortMethod,
  sortDirection,
  setSortDirection,
  children,
}) => {
  const sortedSchedules = useMemo(() => {
    if (!schedules.length) return [];
    return [...schedules].sort((a, b) => {
      // Determine sort direction multiplier (1 for ascending, -1 for descending)
      const directionMultiplier = sortDirection === "asc" ? 1 : -1;
      let comparison = 0;
      switch (sortMethod) {
        case "nextExecution":
          // Sort by next execution time
          if (!a.nextExecutionTime && !b.nextExecutionTime) return 0;
          if (!a.nextExecutionTime) comparison = 1;
          else if (!b.nextExecutionTime) comparison = -1;
          else comparison = new Date(a.nextExecutionTime).getTime() - new Date(b.nextExecutionTime).getTime();
          break;
        case "lastExecution":
          // Sort by last execution or skipped time
          const aLastTime = getLastExecutionOrSkippedTime(a);
          const bLastTime = getLastExecutionOrSkippedTime(b);
          if (!aLastTime && !bLastTime) return 0;
          if (!aLastTime) comparison = 1;
          else if (!bLastTime) comparison = -1;
          else comparison = new Date(aLastTime).getTime() - new Date(bLastTime).getTime();
          break;
        case "lastUpdated":
          // Sort by last updated time
          if (!a.updatedAt && !b.updatedAt) return 0;
          if (!a.updatedAt) comparison = 1;
          else if (!b.updatedAt) comparison = -1;
          else comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case "created":
          // Sort by creation time
          if (!a.createdAt && !b.createdAt) return 0;
          if (!a.createdAt) comparison = 1;
          else if (!b.createdAt) comparison = -1;
          else comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }
      return comparison * directionMultiplier;
    });
  }, [schedules, sortMethod, sortDirection]);

  return (
    <>
      <div className="flex items-center justify-between mb-2 px-2 text-xs text-vscode-descriptionForeground">
        <div className="flex items-center">
          <span className="mr-2">Sort by:</span>
          <select
            className="bg-vscode-dropdown-background text-vscode-dropdown-foreground border border-vscode-dropdown-border rounded px-2 py-1"
            value={sortMethod}
            onChange={(e) => setSortMethod(e.target.value as SortMethod)}
            title="Select sort method"
          >
            <option value="nextExecution">Next Execution</option>
            <option value="lastExecution">Last Executed</option>
            <option value="lastUpdated">Last Updated</option>
            <option value="created">Created</option>
          </select>
        </div>
        <div className="flex items-center">
          <button
            className="flex items-center px-2 py-1 rounded hover:bg-vscode-button-hoverBackground"
            onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
            title={`Currently sorted ${sortDirection === "asc" ? "ascending" : "descending"}. Click to toggle.`}
            type="button"
          >
            <span className="mr-1">
              {sortDirection === "asc" ? "Ascending" : "Descending"}
            </span>
            <span className={`codicon ${sortDirection === "asc" ? "codicon-arrow-up" : "codicon-arrow-down"}`}></span>
          </button>
        </div>
      </div>
      {children(sortedSchedules)}
    </>
  );
};

export default ScheduleSortControl;