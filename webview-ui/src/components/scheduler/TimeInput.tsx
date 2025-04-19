import React, { useState, useEffect } from "react";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

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
}) => {
  // Convert 24-hour format to 12-hour format for display
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");
  const [displayHour, setDisplayHour] = useState("12");

  // Initialize display values from 24-hour format
  useEffect(() => {
    if (hour) {
      const hourNum = parseInt(hour, 10);
      if (hourNum === 0) {
        setDisplayHour("12");
        setAmpm("AM");
      } else if (hourNum === 12) {
        setDisplayHour("12");
        setAmpm("PM");
      } else if (hourNum > 12) {
        setDisplayHour((hourNum - 12).toString().padStart(2, '0'));
        setAmpm("PM");
      } else {
        setDisplayHour(hourNum.toString().padStart(2, '0'));
        setAmpm("AM");
      }
    }
  }, [hour]);

  // Convert 12-hour format back to 24-hour format when values change
  const handleHourChange = (value: string) => {
    const hourNum = parseInt(value, 10);
    if (!isNaN(hourNum) && hourNum >= 1 && hourNum <= 12) {
      let hour24 = hourNum;
      
      // Convert to 24-hour format
      if (ampm === "PM" && hourNum !== 12) {
        hour24 = hourNum + 12;
      } else if (ampm === "AM" && hourNum === 12) {
        hour24 = 0;
      }
      
      setDisplayHour(hourNum.toString().padStart(2, '0'));
      setHour(hour24.toString().padStart(2, '0'));
    } else if (value === '') {
      setDisplayHour('');
    }
  };

  const handleAmPmChange = (value: "AM" | "PM") => {
    setAmpm(value);
    
    // Update the 24-hour value based on the new AM/PM selection
    const hourNum = parseInt(displayHour, 10);
    if (!isNaN(hourNum) && hourNum >= 1 && hourNum <= 12) {
      let hour24 = hourNum;
      
      if (value === "PM" && hourNum !== 12) {
        hour24 = hourNum + 12;
      } else if (value === "AM" && hourNum === 12) {
        hour24 = 0;
      } else if (value === "AM") {
        hour24 = hourNum;
      } else if (value === "PM" && hourNum === 12) {
        hour24 = 12;
      }
      
      setHour(hour24.toString().padStart(2, '0'));
    }
  };

  return (
    <>
      <Input
        type="number"
        min="1"
        max="12"
        className="w-15 h-7"
        value={displayHour}
        placeholder={hourLabel}
        onChange={e => handleHourChange(e.target.value)}
        aria-label={hourAria}
      />
      <span className="text-vscode-descriptionForeground">:</span>
      <Input
        type="number"
        min="0"
        max="59"
        className="w-15 h-7"
        value={minute}
        placeholder={minuteLabel}
        onChange={e => {
          const v = parseInt(e.target.value)
          if (!isNaN(v) && v >= 0 && v <= 59) setMinute(v.toString().padStart(2, '0'))
          else if (e.target.value === '') setMinute('')
        }}
        aria-label={minuteAria}
      />
      <Select value={ampm} onValueChange={v => handleAmPmChange(v as "AM" | "PM")}>
        <SelectTrigger className="w-18 h-7 bg-vscode-dropdown-background !bg-vscode-dropdown-background hover:!bg-vscode-dropdown-background border border-vscode-dropdown-border">
          <SelectValue placeholder="AM/PM" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </>
  );
};

export default TimeInput;