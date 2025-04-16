import React from "react"
import { ScrollArea } from "../../components/ui/scroll-area"
import { Schedule } from "./types"
import ScheduleListItem from "./ScheduleListItem"

interface ScheduleListProps {
  schedules: Schedule[]
  onEdit: (scheduleId: string) => void
  onDelete: (scheduleId: string) => void
}

const ScheduleList: React.FC<ScheduleListProps> = ({ schedules, onEdit, onDelete }) => {
  if (schedules.length === 0) {
    return (
      <div className="text-center py-8 text-vscode-descriptionForeground">
        No schedules found. Create your first schedule to get started.
      </div>
    )
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3">
        {schedules.map(schedule => (
          <ScheduleListItem
            key={schedule.id}
            schedule={schedule}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </ScrollArea>
  )
}

export default ScheduleList