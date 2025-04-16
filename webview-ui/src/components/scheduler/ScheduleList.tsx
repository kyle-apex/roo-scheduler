import React, { useState } from "react"
import { ScrollArea } from "../../components/ui/scroll-area"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog"
import { Schedule } from "./types"
import ScheduleListItem from "./ScheduleListItem"

interface ScheduleListProps {
  schedules: Schedule[]
  onEdit: (scheduleId: string) => void
  onDelete: (scheduleId: string) => void
}

const ScheduleList: React.FC<ScheduleListProps> = ({ schedules, onEdit, onDelete }) => {
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null)

  if (schedules.length === 0) {
    return (
      <div className="text-center py-8 text-vscode-descriptionForeground">
        No schedules found. Create your first schedule to get started.
      </div>
    )
  }

  return (
    <>
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {schedules.map(schedule => (
            <ScheduleListItem
              key={schedule.id}
              schedule={schedule}
              onEdit={onEdit}
              onDeleteRequest={() => setScheduleToDelete(schedule.id)}
            />
          ))}
        </div>
      </ScrollArea>

      <AlertDialog
        open={scheduleToDelete !== null}
        onOpenChange={open => !open && setScheduleToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this schedule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (scheduleToDelete) {
                  onDelete(scheduleToDelete)
                  setScheduleToDelete(null)
                }
              }}
              className="bg-vscode-errorForeground hover:bg-vscode-errorForeground/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default ScheduleList