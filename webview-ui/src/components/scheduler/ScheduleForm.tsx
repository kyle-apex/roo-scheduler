import React from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Badge } from "../../components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { AutosizeTextarea } from "../../components/ui/autosize-textarea"
import { ModeConfig } from "../../../../src/shared/modes"
import { Schedule } from "./types"

interface ScheduleFormProps {
  // Form data
  scheduleName: string;
  selectedMode: string;
  taskInstructions: string;
  scheduleType: string;
  timeInterval: string;
  timeUnit: string;
  selectedDays: Record<string, boolean>;
  startDate: string;
  startHour: string;
  startMinute: string;
  expirationDate: string;
  expirationHour: string;
  expirationMinute: string;
  requireActivity: boolean;
  isEditing: boolean;
  
  // Available modes for the dropdown
  availableModes: ModeConfig[];
  
  // Validation
  validateExpirationTime: () => boolean;
  
  // Callbacks
  onScheduleNameChange: (value: string) => void;
  onSelectedModeChange: (value: string) => void;
  onTaskInstructionsChange: (value: string) => void;
  onScheduleTypeChange: (value: string) => void;
  onTimeIntervalChange: (value: string) => void;
  onTimeUnitChange: (value: string) => void;
  onToggleDay: (day: string) => void;
  onStartDateChange: (value: string) => void;
  onStartHourChange: (value: string) => void;
  onStartMinuteChange: (value: string) => void;
  onExpirationDateChange: (value: string) => void;
  onExpirationHourChange: (value: string) => void;
  onExpirationMinuteChange: (value: string) => void;
  onRequireActivityChange: (value: boolean) => void;
  
  // Form actions
  onSave: () => void;
  onCancel: () => void;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({
  scheduleName,
  selectedMode,
  taskInstructions,
  scheduleType,
  timeInterval,
  timeUnit,
  selectedDays,
  startDate,
  startHour,
  startMinute,
  expirationDate,
  expirationHour,
  expirationMinute,
  requireActivity,
  isEditing,
  availableModes,
  validateExpirationTime,
  onScheduleNameChange,
  onSelectedModeChange,
  onTaskInstructionsChange,
  onScheduleTypeChange,
  onTimeIntervalChange,
  onTimeUnitChange,
  onToggleDay,
  onStartDateChange,
  onStartHourChange,
  onStartMinuteChange,
  onExpirationDateChange,
  onExpirationHourChange,
  onExpirationMinuteChange,
  onRequireActivityChange,
  onSave,
  onCancel
}) => {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <h4 className="text-vscode-foreground text-lg font-medium m-0">
          {isEditing ? "Edit Schedule" : "Create New Schedule"}
        </h4>
        
        <div className="flex flex-col gap-2">
          <label className="text-vscode-descriptionForeground text-sm">Schedule Name</label>
          <Input
            className="w-full"
            placeholder="Enter schedule name..."
            value={scheduleName}
            onChange={(e) => onScheduleNameChange(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col gap-3 mt-4">
          <h4 className="text-vscode-foreground text-lg font-medium m-0">Task</h4>
          
          <div className="flex flex-col gap-2">
            <label className="text-vscode-descriptionForeground text-sm">Mode</label>
            <Select value={selectedMode} onValueChange={onSelectedModeChange}>
              <SelectTrigger className="w-full bg-vscode-dropdown-background !bg-vscode-dropdown-background hover:!bg-vscode-dropdown-background border border-vscode-dropdown-border">
                <SelectValue placeholder="Select a mode" />
              </SelectTrigger>
              <SelectContent>
                {availableModes.map((mode) => (
                  <SelectItem key={mode.slug} value={mode.slug}>
                    {mode.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-vscode-descriptionForeground text-sm">Instructions</label>
            <AutosizeTextarea
              className="w-full p-3 bg-vscode-input-background !bg-vscode-input-background border border-vscode-input-border"
              minHeight={100}
              maxHeight={300}
              placeholder="Enter task instructions..."
              value={taskInstructions}
              onChange={(e) => onTaskInstructionsChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="text-vscode-foreground text-lg font-medium m-0">Schedule</h4>
        
        <div className="flex flex-col gap-2">
          <label className="text-vscode-descriptionForeground text-sm">Schedule Type</label>
          <Select value={scheduleType} onValueChange={onScheduleTypeChange}>
            <SelectTrigger className="w-full bg-vscode-dropdown-background !bg-vscode-dropdown-background hover:!bg-vscode-dropdown-background border border-vscode-dropdown-border">
              <SelectValue placeholder="Select a schedule type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time">Time Schedule</SelectItem>
              <SelectItem value="completion">After Task Completion</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {scheduleType === "time" && (
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-center gap-2">
              <label className="text-vscode-descriptionForeground text-sm">Every</label>
              <Input
                type="number"
                min="1"
                className="w-16 h-7"
                value={timeInterval}
                onChange={(e) => {
                  // Ensure positive numbers only
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    onTimeIntervalChange(value.toString());
                  } else if (e.target.value === '') {
                    onTimeIntervalChange('');
                  }
                }}
                aria-label="Time interval"
              />
              <Select value={timeUnit} onValueChange={onTimeUnitChange}>
                <SelectTrigger className="w-32 bg-vscode-dropdown-background !bg-vscode-dropdown-background hover:!bg-vscode-dropdown-background border border-vscode-dropdown-border">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minute">Minute(s)</SelectItem>
                  <SelectItem value="hour">Hour(s)</SelectItem>
                  <SelectItem value="day">Day(s)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label className="text-vscode-descriptionForeground text-sm">Days of the week</label>
                {Object.values(selectedDays).filter(Boolean).length > 0 && (
                  <Badge variant="outline" className="bg-vscode-badge-background text-vscode-badge-foreground">
                    {Object.values(selectedDays).filter(Boolean).length} {Object.values(selectedDays).filter(Boolean).length === 1 ? 'day' : 'days'} selected
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'S', day: 'sun' },
                  { label: 'M', day: 'mon' },
                  { label: 'T', day: 'tue' },
                  { label: 'W', day: 'wed' },
                  { label: 'Th', day: 'thu' },
                  { label: 'F', day: 'fri' },
                  { label: 'Sa', day: 'sat' }
                ].map(({ label, day }) => (
                  <Button
                    key={day}
                    variant={selectedDays[day] ? "default" : "outline"}
                    className={`min-w-8 h-8 p-0 ${selectedDays[day] ? 'bg-vscode-button-background text-vscode-button-foreground' : 'bg-transparent text-vscode-foreground'}`}
                    onClick={() => onToggleDay(day)}
                    aria-label={`Toggle ${day} selection`}
                    aria-pressed={selectedDays[day]}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Start Time */}
            <div className="flex flex-col gap-2">
              <label className="text-vscode-descriptionForeground text-sm">Start Time</label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  className="w-40"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  aria-label="Start date"
                />
                <Input
                  type="number"
                  min="0"
                  max="23"
                  className="w-16 h-7"
                  value={startHour}
                  placeholder="HH"
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 0 && value <= 23) {
                      onStartHourChange(value.toString().padStart(2, '0'));
                    } else if (e.target.value === '') {
                      onStartHourChange('');
                    }
                  }}
                  aria-label="Start hour"
                />
                <span className="text-vscode-descriptionForeground">:</span>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  className="w-16 h-7"
                  value={startMinute}
                  placeholder="MM"
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 0 && value <= 59) {
                      onStartMinuteChange(value.toString().padStart(2, '0'));
                    } else if (e.target.value === '') {
                      onStartMinuteChange('');
                    }
                  }}
                  aria-label="Start minute"
                />
              </div>
            </div>
            
            {/* Expiration Time */}
            <div className="flex flex-col gap-2">
              <label className="text-vscode-descriptionForeground text-sm">Expires</label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  className="w-40"
                  value={expirationDate}
                  min={startDate}
                  onChange={(e) => onExpirationDateChange(e.target.value)}
                  aria-label="Expiration date"
                />
                <Input
                  type="number"
                  min="0"
                  max="23"
                  className="w-16 h-7"
                  value={expirationHour}
                  placeholder="HH"
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 0 && value <= 23) {
                      onExpirationHourChange(value.toString().padStart(2, '0'));
                    } else if (e.target.value === '') {
                      onExpirationHourChange('');
                    }
                  }}
                  aria-label="Expiration hour"
                />
                <span className="text-vscode-descriptionForeground">:</span>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  className="w-16 h-7"
                  value={expirationMinute}
                  placeholder="MM"
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 0 && value <= 59) {
                      onExpirationMinuteChange(value.toString().padStart(2, '0'));
                    } else if (e.target.value === '') {
                      onExpirationMinuteChange('');
                    }
                  }}
                  aria-label="Expiration minute"
                />
              </div>
              {!validateExpirationTime() && (
                <p className="text-red-500 text-xs mt-1">
                  Expiration time must be after start time
                </p>
              )}
            </div>
            
            {/* Activity Requirement Checkbox */}
            <div className="flex items-center gap-2 mt-2">
              <div
                className="flex items-center cursor-pointer"
                onClick={() => onRequireActivityChange(!requireActivity)}
              >
                <div className={`w-4 h-4 border rounded-xs flex items-center justify-center mr-2 ${
                  requireActivity
                    ? "bg-vscode-button-background border-vscode-button-background"
                    : "border-vscode-input-border"
                }`}>
                  {requireActivity && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-vscode-button-foreground"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
                <label className="text-vscode-descriptionForeground text-sm cursor-pointer">
                  Only execute if I had activity since the last execution of this task
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end mt-6 gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave}>
          {isEditing ? "Update Schedule" : "Save Schedule"}
        </Button>
      </div>
    </div>
  )
}

export default ScheduleForm