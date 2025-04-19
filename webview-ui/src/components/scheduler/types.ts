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
  taskInteraction?: "wait" | "interrupt" | "skip"; // How to handle when a task is already running
  inactivityDelay?: string; // Number of minutes of inactivity to wait before executing when taskInteraction is "wait"
  createdAt: string;
  updatedAt: string;
  lastExecutionTime?: string;
  lastSkippedTime?: string;
  lastTaskId?: string;
  nextExecutionTime?: string; // ISO string of the next calculated execution time
}