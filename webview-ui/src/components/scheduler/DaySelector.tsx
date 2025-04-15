import React from "react";
import { Button } from "../../components/ui/button";

const DAYS = [
  { label: 'S', day: 'sun' },
  { label: 'M', day: 'mon' },
  { label: 'T', day: 'tue' },
  { label: 'W', day: 'wed' },
  { label: 'Th', day: 'thu' },
  { label: 'F', day: 'fri' },
  { label: 'Sa', day: 'sat' }
];

export interface DaySelectorProps {
  selectedDays: Record<string, boolean>;
  toggleDay: (day: string) => void;
}

const DaySelector: React.FC<DaySelectorProps> = ({ selectedDays, toggleDay }) => (
  <div className="flex gap-2 flex-wrap">
    {DAYS.map(({ label, day }) => (
      <Button
        key={day}
        variant={selectedDays[day] ? "default" : "outline"}
        className={`min-w-8 h-8 p-0 ${selectedDays[day] ? 'bg-vscode-button-background text-vscode-button-foreground' : 'bg-transparent text-vscode-foreground'}`}
        onClick={() => toggleDay(day)}
        aria-label={`Toggle ${day} selection`}
        aria-pressed={selectedDays[day]}
      >
        {label}
      </Button>
    ))}
  </div>
);

export default DaySelector;