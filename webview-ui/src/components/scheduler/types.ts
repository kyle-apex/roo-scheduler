export interface Schedule {
  id: string;
  name: string;
  mode: string;
  modeDisplayName?: string;
  taskInstructions: string;
  scheduleType: string;
  timeInterval?: string;
  timeUnit?: string;
  selectedDays?: Record<string, boolean>;
  startDate?: string;
  startHour?: string;
  startMinute?: string;
  expirationDate?: string;
  expirationHour?: string;
  expirationMinute?: string;
  requireActivity?: boolean;
  active?: boolean; // If undefined, treat as true (backward compatibility)
  createdAt: string;
  updatedAt: string;
  lastExecutionTime?: string;
  lastTaskId?: string;
}