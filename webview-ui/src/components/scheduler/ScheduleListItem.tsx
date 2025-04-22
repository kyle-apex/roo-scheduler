import React from "react";
import { Button } from "../../components/ui/button";
import { Schedule } from "./types";

type ScheduleListItemProps = {
  schedule: Schedule;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onResumeTask: (taskId: string) => void;
  formatDate: (dateString: string) => string;
};

const ScheduleListItem: React.FC<ScheduleListItemProps> = ({
  schedule,
  onEdit,
  onDelete,
  onToggleActive,
  onResumeTask,
  formatDate,
}) => {
  const expirationDateTime = new Date(
    `${schedule.expirationDate}T${schedule.expirationHour || "23"}:${schedule.expirationMinute || "59"}:00`
  );
  const nextExecutionDateTime = schedule.nextExecutionTime
    ? new Date(schedule.nextExecutionTime)
    : null;

  return (
    <div
      data-testid={`schedule-item-${schedule.id}`}
      className="cursor-pointer border-b border-vscode-panel-border"
      onClick={() => onEdit(schedule.id)}
    >
      <div className="flex items-start p-3 gap-2">
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <span className="text-vscode-foreground font-medium">{schedule.name}</span>
            <div className="flex flex-row gap-1">
              {/* Active/Inactive Status Indicator */}
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2 py-0 text-xs font-semibold rounded ${
                  schedule.active === false
                    ? "text-vscode-descriptionForeground"
                    : "text-green-600"
                }`}
                onClick={e => {
                  e.stopPropagation();
                  onToggleActive(schedule.id, !(schedule.active !== false));
                }}
                aria-label={schedule.active === false ? "Activate schedule" : "Deactivate schedule"}
              >
                <span className="flex items-center">
                  <span
                    className={`inline-block w-2 h-2 rounded-full mr-1 ${
                      schedule.active === false
                        ? "bg-vscode-descriptionForeground"
                        : "bg-green-600"
                    }`}
                  ></span>
                  {schedule.active === false ? "Inactive" : "Active"}
                </span>
              </Button>

              {/* Edit Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title="Edit schedule"
                data-testid="edit-schedule-button"
                onClick={e => {
                  e.stopPropagation();
                  onEdit(schedule.id);
                }}
                aria-label="Edit schedule"
              >
                <span className="codicon codicon-edit" />
              </Button>

              {/* Delete Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title="Delete schedule"
                data-testid="delete-schedule-button"
                onClick={e => {
                  e.stopPropagation();
                  onDelete(schedule.id);
                }}
                aria-label="Delete schedule"
              >
                <span className="codicon codicon-trash text-vscode-errorForeground" />
              </Button>
            </div>
          </div>

          <div
            className="text-sm text-vscode-descriptionForeground mt-2"
            style={{
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            <span className="font-bold">{schedule.modeDisplayName || schedule.mode}: </span>
            {schedule.taskInstructions}
          </div>

          {schedule.scheduleType === "time" && (
            <div className="mt-2 text-xs text-vscode-descriptionForeground">
              Every {schedule.timeInterval} {schedule.timeUnit}(s)
              {Object.values(schedule.selectedDays || {}).filter(Boolean).length > 0 && (
                <span>
                  {" "}
                  • {Object.values(schedule.selectedDays || {}).filter(Boolean).length} days selected
                </span>
              )}
            </div>
          )}

          {(schedule.lastExecutionTime || schedule.lastSkippedTime) && (
            <div className="mt-2 text-xs text-vscode-descriptionForeground flex items-center">
              <span className="codicon codicon-clock mr-1"></span>
              Last
              {(!schedule.lastSkippedTime ||
                (schedule.lastExecutionTime + "" > schedule.lastSkippedTime))
                ? " executed"
                : " skipped"}
              :{" "}
              {schedule.lastTaskId &&
              schedule.lastExecutionTime &&
              (!schedule.lastSkippedTime ||
                schedule.lastExecutionTime > schedule.lastSkippedTime) ? (
                <button
                  className="inline-flex items-center px-1 py-0.5 rounded hover:bg-vscode-button-hoverBackground text-vscode-linkForeground hover:underline cursor-pointer"
                  onClick={e => {
                    e.stopPropagation();
                    onResumeTask(schedule.lastTaskId!);
                  }}
                  title="Click to view/resume this task in Roo Code"
                >
                  {formatDate(schedule.lastExecutionTime)}
                </button>
              ) : (
                formatDate(
                  schedule.lastExecutionTime && schedule.lastSkippedTime
                    ? schedule.lastExecutionTime > schedule.lastSkippedTime
                      ? schedule.lastExecutionTime
                      : schedule.lastSkippedTime
                    : schedule.lastExecutionTime || schedule.lastSkippedTime || new Date().toISOString()
                )
              )}
            </div>
          )}

          {schedule.active !== false &&
            schedule.scheduleType === "time" &&
            !(expirationDateTime && nextExecutionDateTime && expirationDateTime < nextExecutionDateTime) && (
              <div className="mt-1 text-xs text-vscode-descriptionForeground flex items-center">
                <span className="codicon codicon-calendar mr-1"></span>
                Next execution: &nbsp;
                {nextExecutionDateTime ? (
                  <span className="text-vscode-linkForeground">
                    {formatDate(nextExecutionDateTime.toISOString())}
                  </span>
                ) : (
                  <span className="italic">Not scheduled</span>
                )}
              </div>
            )}

          {/* Expiration information */}
          {schedule.expirationDate && (
            <div className="mt-1 text-xs text-vscode-descriptionForeground flex items-center">
              <span className="codicon codicon-error mr-1"></span>
              {(() => {
                const now = new Date();
                const isExpired = now > expirationDateTime;
                return (
                  <>
                    <span>{isExpired ? "Expired: " : "Expires: "}</span>
                    <span className={isExpired ? "text-vscode-errorForeground ml-1" : "text-vscode-descriptionForeground ml-1"}>
                      {formatDate(expirationDateTime.toISOString())}
                    </span>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleListItem;