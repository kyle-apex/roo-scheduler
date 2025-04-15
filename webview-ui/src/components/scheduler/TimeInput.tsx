import React from "react";
import { Input } from "../../components/ui/input";

export interface TimeInputProps {
  hour: string;
  minute: string;
  setHour: (v: string) => void;
  setMinute: (v: string) => void;
  hourLabel?: string;
  minuteLabel?: string;
  hourAria?: string;
  minuteAria?: string;
}

const TimeInput: React.FC<TimeInputProps> = ({
  hour, minute, setHour, setMinute, hourLabel = "HH", minuteLabel = "MM", hourAria, minuteAria
}) => (
  <>
    <Input
      type="number"
      min="0"
      max="23"
      className="w-16 h-7"
      value={hour}
      placeholder={hourLabel}
      onChange={e => {
        const v = parseInt(e.target.value)
        if (!isNaN(v) && v >= 0 && v <= 23) setHour(v.toString().padStart(2, '0'))
        else if (e.target.value === '') setHour('')
      }}
      aria-label={hourAria}
    />
    <span className="text-vscode-descriptionForeground">:</span>
    <Input
      type="number"
      min="0"
      max="59"
      className="w-16 h-7"
      value={minute}
      placeholder={minuteLabel}
      onChange={e => {
        const v = parseInt(e.target.value)
        if (!isNaN(v) && v >= 0 && v <= 59) setMinute(v.toString().padStart(2, '0'))
        else if (e.target.value === '') setMinute('')
      }}
      aria-label={minuteAria}
    />
  </>
);

export default TimeInput;