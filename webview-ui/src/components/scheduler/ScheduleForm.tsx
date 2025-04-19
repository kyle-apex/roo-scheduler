import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Badge } from "../../components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { AutosizeTextarea } from "../../components/ui/autosize-textarea"
import { ModeConfig } from "../../../../src/shared/modes"
import { Schedule } from "./types"
import LabeledInput from "./LabeledInput"
import TimeInput from "./TimeInput"
import DaySelector from "./DaySelector"
import DateTimeSelector from "./DateTimeSelector"

export type ScheduleFormData = Omit<Schedule, 'id' | 'createdAt' | 'updatedAt' | 'modeDisplayName'>;

// Make all fields required and non-undefined for local form state
type RequiredScheduleFormData = {
  [K in keyof ScheduleFormData]-?: NonNullable<ScheduleFormData[K]>
}

interface ScheduleFormProps {
  initialData?: Partial<ScheduleFormData>;
  isEditing: boolean;
  availableModes: ModeConfig[];
  onSave: (formData: ScheduleFormData) => void;
  onCancel: () => void;
  onValidityChange?: (isValid: boolean) => void;
}

export interface ScheduleFormHandle {
  submitForm: () => void;
}
const TIME_UNITS = [
  { value: "minute", label: "Minute(s)" },
  { value: "hour", label: "Hour(s)" },
  { value: "day", label: "Day(s)" }
];

const defaultDays: Record<string, boolean> = { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false };
const allDaysSelected: Record<string, boolean> = { sun: true, mon: true, tue: true, wed: true, thu: true, fri: true, sat: true };

const getDefinedForm = (initialData?: Partial<ScheduleFormData>): RequiredScheduleFormData => ({
  name: initialData?.name ?? "",
  mode: initialData?.mode ?? "code",
  taskInstructions: initialData?.taskInstructions ?? "",
  scheduleType: initialData?.scheduleType ?? "time",
  timeInterval: initialData?.timeInterval ?? "1",
  timeUnit: initialData?.timeUnit ?? "hour",
  selectedDays: initialData?.selectedDays ?? { ...defaultDays },
  startDate: initialData?.startDate ?? "",
  startHour: initialData?.startHour ?? "00",
  startMinute: initialData?.startMinute ?? "00",
  expirationDate: initialData?.expirationDate ?? "",
  expirationHour: initialData?.expirationHour ?? "00",
  expirationMinute: initialData?.expirationMinute ?? "00",
  requireActivity: initialData?.requireActivity ?? false,
  active: initialData?.active ?? true,
  taskInteraction: initialData?.taskInteraction ?? "wait",
  inactivityDelay: initialData?.inactivityDelay ?? "10", // Default to 10 minutes
  lastExecutionTime: initialData?.lastExecutionTime ?? "",
  lastSkippedTime: initialData?.lastSkippedTime ?? "",
  lastTaskId: initialData?.lastTaskId ?? ""
});

const ScheduleForm = forwardRef<ScheduleFormHandle, ScheduleFormProps>(
  ({ initialData, isEditing, availableModes, onSave, onCancel, onValidityChange }, ref) => {
  // If creating (not editing) and no selectedDays provided, default to all days selected
  const initialFormData = (!isEditing && (!initialData || !initialData.selectedDays))
    ? { ...initialData, selectedDays: { ...allDaysSelected } }
    : initialData;
  const [form, setForm] = useState<RequiredScheduleFormData>(getDefinedForm(initialFormData));

  // Validation state for parent
  const isValid =
    !!form.name.trim() &&
    !!form.mode &&
    !!form.taskInstructions.trim() &&
    !!form.timeInterval &&
    !isNaN(Number(form.timeInterval)) &&
    Number(form.timeInterval) > 0 &&
    (form.taskInteraction !== "wait" ||
      (!!form.inactivityDelay &&
       !isNaN(Number(form.inactivityDelay)) &&
       Number(form.inactivityDelay) > 0));

  // Notify parent of validity changes
  useEffect(() => {
    if (onValidityChange) onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  // Expose submitForm to parent via ref
  useImperativeHandle(ref, () => ({
    submitForm: () => {
      handleSave();
    }
  }));


  useEffect(() => {
    if (!isEditing && !initialData?.startDate) {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Format date in local time zone (YYYY-MM-DD)
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const localDate = `${year}-${month}-${day}`;
      
      setForm(f => ({
        ...f,
        startDate: localDate,
        startHour: currentHour.toString().padStart(2, '0'),
        startMinute: '00'
      }));
    }
  }, [isEditing, initialData]);

  const setField = <K extends keyof RequiredScheduleFormData>(key: K, value: RequiredScheduleFormData[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const toggleDay = (day: string) =>
    setForm(f => ({
      ...f,
      selectedDays: { ...f.selectedDays, [day]: !f.selectedDays[day] }
    }));

  const validateExpirationTime = useCallback(() => {
    if (!form.startDate || !form.expirationDate) return true;
    const startDateTime = new Date(`${form.startDate}T${form.startHour}:${form.startMinute}:00`);
    const expirationDateTime = new Date(`${form.expirationDate}T${form.expirationHour}:${form.expirationMinute}:00`);
    return expirationDateTime > startDateTime;
  }, [form.startDate, form.startHour, form.startMinute, form.expirationDate, form.expirationHour, form.expirationMinute]);

  useEffect(() => {
    if (form.expirationDate && form.startDate && new Date(form.expirationDate) < new Date(form.startDate)) {
      setField("expirationDate", form.startDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.startDate, form.expirationDate]);

  const handleSave = () => {
    if (!form.name.trim()) {
      console.error("Schedule name cannot be empty");
      return;
    }
    if (form.expirationDate && !validateExpirationTime()) {
      console.error("Expiration time must be after start time");
      return;
    }
    onSave(form);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <h4 className="text-vscode-foreground text-lg font-medium m-0">
          {isEditing ? "Edit Schedule" : "Create New Schedule"}
        </h4>
        <LabeledInput
          label="Schedule Name"
          required
          className="w-full"
          placeholder="Enter schedule name..."
          value={form.name}
          onChange={e => setField("name", e.target.value)}
        />
        <div className="flex flex-col gap-3 ">
          <div className="flex flex-col gap-2">
            <label className="text-vscode-descriptionForeground text-sm">
              Mode
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <Select value={form.mode} onValueChange={v => setField("mode", v)}>
              <SelectTrigger className="w-full bg-vscode-dropdown-background !bg-vscode-dropdown-background hover:!bg-vscode-dropdown-background border border-vscode-dropdown-border">
                <SelectValue placeholder="Select a mode" />
              </SelectTrigger>
              <SelectContent>
                {availableModes.map((mode) => (
                  <SelectItem key={mode.slug} value={mode.slug}>{mode.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-vscode-descriptionForeground text-sm">
              Prompt
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <AutosizeTextarea
              className="w-full p-3 bg-vscode-input-background !bg-vscode-input-background border border-vscode-input-border"
              minHeight={100}
              maxHeight={300}
              placeholder="Enter task instructions..."
              value={form.taskInstructions}
              onChange={e => setField("taskInstructions", e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-vscode-descriptionForeground text-sm">Schedule Type</label>
          <Select value={form.scheduleType} onValueChange={v => setField("scheduleType", v)}>
            <SelectTrigger className="w-full bg-vscode-dropdown-background !bg-vscode-dropdown-background hover:!bg-vscode-dropdown-background border border-vscode-dropdown-border">
              <SelectValue placeholder="Select a schedule type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time">Time Schedule</SelectItem>
              <SelectItem value="completion">After Task Completion</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.scheduleType === "time" && (
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-center gap-2">
              <label className="text-vscode-descriptionForeground text-sm">
                Every
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <Input
                type="number"
                min="1"
                className="w-16 h-7"
                value={form.timeInterval}
                onChange={e => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value > 0) setField("timeInterval", value.toString());
                  else if (e.target.value === '') setField("timeInterval", '');
                }}
                aria-label="Time interval"
              />
              <Select value={form.timeUnit} onValueChange={v => setField("timeUnit", v)}>
                <SelectTrigger className="w-32 bg-vscode-dropdown-background !bg-vscode-dropdown-background hover:!bg-vscode-dropdown-background border border-vscode-dropdown-border">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_UNITS.map(u => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label className="text-vscode-descriptionForeground text-sm">Days of the week</label>
                {Object.values(form.selectedDays).filter(Boolean).length > 0 && (
                  <Badge variant="outline" className="bg-vscode-badge-background text-vscode-badge-foreground">
                    {Object.values(form.selectedDays).filter(Boolean).length} {Object.values(form.selectedDays).filter(Boolean).length === 1 ? 'day' : 'days'} selected
                  </Badge>
                )}
              </div>
              <DaySelector selectedDays={form.selectedDays} toggleDay={toggleDay} />
            </div>
            <DateTimeSelector
              label="Start Time"
              date={form.startDate}
              hour={form.startHour}
              minute={form.startMinute}
              setDate={v => setField("startDate", v)}
              setHour={v => setField("startHour", v)}
              setMinute={v => setField("startMinute", v)}
              dateAriaLabel="Start date"
              hourAriaLabel="Start hour"
              minuteAriaLabel="Start minute"
            />
            <DateTimeSelector
              label="Expires"
              date={form.expirationDate}
              hour={form.expirationHour}
              minute={form.expirationMinute}
              setDate={v => setField("expirationDate", v)}
              setHour={v => setField("expirationHour", v)}
              setMinute={v => setField("expirationMinute", v)}
              minDate={form.startDate}
              errorMessage={!validateExpirationTime() ? "Expiration time must be after start time" : undefined}
              dateAriaLabel="Expiration date"
              hourAriaLabel="Expiration hour"
              minuteAriaLabel="Expiration minute"
            />
            <div className="flex items-center gap-2 mt-2">
              <div
                className="flex items-center cursor-pointer"
                onClick={() => setField("requireActivity", !form.requireActivity)}
              >
                <div className={`w-4 h-4 border rounded-xs flex items-center justify-center mr-2 ${
                  form.requireActivity
                    ? "bg-vscode-button-background border-vscode-button-background"
                    : "border-vscode-input-border"
                }`}>
                  {form.requireActivity && (
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
            <div className="flex flex-col gap-2 mt-2">
              <label className="text-vscode-descriptionForeground text-sm">When a task is already running</label>
              <Select value={form.taskInteraction} onValueChange={(v: "wait" | "interrupt" | "skip") => setField("taskInteraction", v)}>
                <SelectTrigger className="w-full bg-vscode-dropdown-background !bg-vscode-dropdown-background hover:!bg-vscode-dropdown-background border border-vscode-dropdown-border">
                  <SelectValue placeholder="Select behavior" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wait">Run after specified inactivity</SelectItem>
                  <SelectItem value="interrupt">Interrupt current task</SelectItem>
                  <SelectItem value="skip">Skip this execution</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.taskInteraction === "wait" && (
              <div className="flex flex-col gap-2 mt-2">
                <label className="text-vscode-descriptionForeground text-sm">
                  Inactivity delay (minutes)
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  className="w-full"
                  value={form.inactivityDelay}
                  onChange={e => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value > 0) setField("inactivityDelay", value.toString());
                    else if (e.target.value === '') setField("inactivityDelay", '');
                  }}
                  aria-label="Inactivity delay in minutes"
                />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex justify-end mt-6 gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!isValid}
        >
          {isEditing ? "Update Schedule" : "Save Schedule"}
        </Button>
      </div>
    </div>
  );
});

export default ScheduleForm;