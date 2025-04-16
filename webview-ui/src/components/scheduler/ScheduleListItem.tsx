import React, { useState } from "react"
import { Button } from "../../components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card"
import ConfirmationDialog from "../../components/ui/ConfirmationDialog"
import { Schedule } from "./types"

interface ScheduleListItemProps {
  schedule: Schedule;
  onEdit: (scheduleId: string) => void;
  onDelete: (scheduleId: string) => void;
}

const ScheduleListItem: React.FC<ScheduleListItemProps> = ({ schedule, onEdit, onDelete }) => {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Card key={schedule.id} className="border border-vscode-input-border">
        <CardHeader className="pb-2 relative">
          <div className="absolute top-3 right-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setDialogOpen(true)}
                    aria-label="Delete schedule"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-vscode-errorForeground"
                    >
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete this schedule</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardTitle className="text-vscode-foreground">{schedule.name}</CardTitle>
          <CardDescription>
            Mode: {schedule.modeDisplayName || schedule.mode} • Type: {schedule.scheduleType === "time" ? "Time Schedule" : "After Task Completion"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <p className="text-sm text-vscode-descriptionForeground" style={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {schedule.taskInstructions}
          </p>
          {schedule.scheduleType === "time" && (
            <div className="mt-2 text-xs text-vscode-descriptionForeground">
              Every {schedule.timeInterval} {schedule.timeUnit}(s)
              {Object.values(schedule.selectedDays || {}).filter(Boolean).length > 0 && (
                <span> • {Object.values(schedule.selectedDays || {}).filter(Boolean).length} days selected</span>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-2 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(schedule.id)}
          >
            Edit
          </Button>
        </CardFooter>
      </Card>
      <ConfirmationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Delete Schedule"
        description="Are you sure you want to delete this schedule? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          onDelete(schedule.id)
          setDialogOpen(false)
        }}
        onCancel={() => setDialogOpen(false)}
        confirmClassName="bg-vscode-errorForeground hover:bg-vscode-errorForeground/90"
      />
    </>
  )
}

export default ScheduleListItem