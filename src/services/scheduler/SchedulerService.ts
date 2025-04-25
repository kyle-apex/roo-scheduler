import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { getWorkspacePath } from '../../utils/path';
import { fileExistsAtPath } from '../../utils/fs';
import { RooService } from './RooService';

interface Schedule {
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
  lastSkippedTime?: string; // Timestamp when execution was last skipped
  lastTaskId?: string; // Roo Cline task ID of the last execution
  nextExecutionTime?: string; // ISO string of the next calculated execution time
}

interface SchedulesFile {
  schedules: Schedule[];
}

export class SchedulerService {
  private static instance: SchedulerService;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private schedules: Schedule[] = [];
  private schedulesFilePath: string;
  private outputChannel: vscode.OutputChannel;

  private constructor(context: vscode.ExtensionContext) {
    this.schedulesFilePath = path.join(getWorkspacePath(), '.roo', 'schedules.json');
    this.outputChannel = vscode.window.createOutputChannel('Roo Scheduler');
    context.subscriptions.push(this.outputChannel);
  }

  public static getInstance(context: vscode.ExtensionContext): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService(context);
    }
    return SchedulerService.instance;
  }
  /**
   * Toggle a schedule's active state and ensure next task is scheduled if activated.
   * @param scheduleId The ID of the schedule to toggle
   * @param active Whether to set the schedule as active or inactive
   */
  public async toggleScheduleActive(scheduleId: string, active: boolean): Promise<void> {
    const scheduleIndex = this.schedules.findIndex(s => s.id === scheduleId);
    if (scheduleIndex === -1) {
      this.log(`Schedule with ID ${scheduleId} not found.`);
      return;
    }
    const schedule = this.schedules[scheduleIndex];
    // Only update if the state is actually changing
    if (schedule.active === active) {
      this.log(`Schedule "${schedule.name}" is already ${active ? 'active' : 'inactive'}.`);
      return;
    }
    const updatedSchedule = await this.updateSchedule(scheduleId, { active });
    // If activating, set up the timer for this schedule
    if (active && updatedSchedule) {
      this.setupTimerForSchedule(updatedSchedule);
      this.log(`Activated schedule "${schedule.name}" and scheduled next task.`);
    } else {
      // If deactivating, clear any existing timer
      const timer = this.timers.get(scheduleId);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(scheduleId);
        this.log(`Deactivated schedule "${schedule.name}" and cleared timer.`);
      }
    }
  }

  /**
   * Update a schedule by id with the given updates and persist the change.
   * Returns the updated schedule, or undefined if not found.
   */
  public async updateSchedule(scheduleId: string, updates: Partial<Schedule>): Promise<Schedule | undefined> {
    const scheduleIndex = this.schedules.findIndex(s => s.id === scheduleId);
    if (scheduleIndex === -1) return undefined;
    const updatedSchedule = { ...this.schedules[scheduleIndex], ...updates };
    this.schedules[scheduleIndex] = updatedSchedule;
    await this.saveSchedules();
    
    // Notify that schedules have been updated by triggering a command
    // This will cause the webview to refresh its data
    try {
      await vscode.commands.executeCommand('roo-scheduler.schedulesUpdated');
    } catch (error) {
      this.log(`Error notifying webview of schedule update: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return updatedSchedule;
  }


  public async initialize(): Promise<void> {
     console.log('Initializing scheduler service!');
     await this.loadSchedules();
     this.setupTimers();
   }

  private async loadSchedules(): Promise<void> {
    try {
      const exists = await fileExistsAtPath(this.schedulesFilePath);
      if (!exists) {
        this.log(`Schedules file not found at ${this.schedulesFilePath}`);
        this.schedules = [];
        return;
      }

      const content = await fs.readFile(this.schedulesFilePath, 'utf-8');
      const data = JSON.parse(content) as SchedulesFile;
      this.schedules = data.schedules || [];
      this.log(`Loaded ${this.schedules.length} schedules from ${this.schedulesFilePath}`);
    } catch (error) {
      this.log(`Error loading schedules: ${error instanceof Error ? error.message : String(error)}`);
      this.schedules = [];
    }
  }

  private async saveSchedules(): Promise<void> {
    try {
      const content = JSON.stringify({ schedules: this.schedules }, null, 2);
      await fs.writeFile(this.schedulesFilePath, content, 'utf-8');
      this.log('Schedules saved successfully');
    } catch (error) {
      this.log(`Error saving schedules: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private setupTimers(): void {
    console.log('setup timers');
    // Clear existing timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();

    // Set up new timers for each schedule
    for (const schedule of this.schedules) {
      if (schedule.active === false) {
        this.log(`Skipping timer setup for inactive schedule "${schedule.name}"`);
        continue;
      }
      this.setupTimerForSchedule(schedule);
    }
  }

  private setupTimerForSchedule(schedule: Schedule): void {
    if (schedule.active === false) {
      this.log(`Not setting up timer for inactive schedule "${schedule.name}"`);
      return;
    }
    
    if (schedule.scheduleType === 'time') {
      // Check if schedule has expired before calculating next execution time
 
      const nextExecutionTime = this.calculateNextExecutionTime(schedule);

      if (!nextExecutionTime) {
        this.updateSchedule(schedule.id, { nextExecutionTime: undefined });
        return;
      }

      let expirationDateTime;
      if (schedule.expirationDate) {
         expirationDateTime = new Date(
          `${schedule.expirationDate}T${schedule.expirationHour || '23'}:${schedule.expirationMinute || '59'}:00`
        );
      }

      console.log('nextExecutionTime:', nextExecutionTime)
      if (nextExecutionTime && expirationDateTime && nextExecutionTime > expirationDateTime) {
        console.log(`Schedule "${schedule.name}" has no valid execution time or has expired`);
        this.updateSchedule(schedule.id, { active: false });
      }

      

      // Save the next execution time if it's different from the current value
      const nextExecutionTimeStr = nextExecutionTime?.toISOString();
      if (schedule.nextExecutionTime !== nextExecutionTimeStr) {
        this.updateSchedule(schedule.id, { nextExecutionTime: nextExecutionTimeStr });
        
        // Notify the webview that schedules have been updated
        
      }

      const delay = nextExecutionTime.getTime() - Date.now();
      if (delay <= 0) {
        this.log(`Schedule "${schedule.name}" is due for immediate execution`);
        this.executeSchedule(schedule);
        return;
      }

      this.log(`Setting up timer for schedule "${schedule.name}" to execute in ${Math.floor(delay / 1000 / 60)} minutes`);
      const timer = setTimeout(() => {
        this.executeSchedule(schedule);
      }, delay);

      this.timers.set(schedule.id, timer);
    }
  }
    
  private calculateNextExecutionTime(schedule: Schedule): Date | null {
    if (!schedule.timeInterval || !schedule.timeUnit) {
      return null;
    }

    const now = new Date();
    const startDateTime = new Date(
      `${schedule.startDate || new Date().toISOString().split('T')[0]}T${schedule.startDate ? schedule.startHour : new Date().getHours().toString().padStart(2, '0')}:${schedule.startMinute || '00'}:00`
    );


    // If start time is in the future, return that
    if (now < startDateTime) {
      return startDateTime;
    }

    // Calculate next execution time based on interval
    let nextTime: Date;
    const interval = parseInt(schedule.timeInterval);
    
    // Determine the most recent reference time (lastExecutionTime, lastSkippedTime, or startDateTime)
    let referenceTime: Date;
    
    // If startDate was configured, we want our intervals based on that 
    // (ex: keep running on the hour even if the last execution was delayed 5 minutes)
    // Otherwise, we want to set based on execution or skip time
    if ((schedule.lastExecutionTime || schedule.lastSkippedTime) && !schedule.startDate) {
      // Find the most recent of lastExecutionTime and lastSkippedTime
      const lastExecutionDate = schedule.lastExecutionTime ? new Date(schedule.lastExecutionTime) : new Date(0);
      const lastSkippedDate = schedule.lastSkippedTime ? new Date(schedule.lastSkippedTime) : new Date(0);
      
      // Use the most recent time
      if (lastExecutionDate.getTime() >= lastSkippedDate.getTime()) {
        referenceTime = lastExecutionDate;
      } else {
        referenceTime = lastSkippedDate;
      }
    } else {
      // No previous execution or skip, use start time
      referenceTime = new Date(startDateTime);
    }
    
    
      // First execution, calculate from start time
      nextTime = new Date(referenceTime);
      
      // If start time is in the past, calculate the next occurrence
      if (now > nextTime) {
        const diffMs = now.getTime() - nextTime.getTime();
        let intervalMs = 0;
        
        switch (schedule.timeUnit) {
          case 'minute':
            intervalMs = interval * 60 * 1000;
            break;
          case 'hour':
            intervalMs = interval * 60 * 60 * 1000;
            break;
          case 'day':
            intervalMs = interval * 24 * 60 * 60 * 1000;
            break;
        }
        
        const periods = Math.ceil(diffMs / intervalMs);
        nextTime = new Date(nextTime.getTime() + (periods * intervalMs));
        nextTime.setSeconds(0);
        if (now > nextTime) {
          nextTime.setMinutes(nextTime.getMinutes() + 1);
        }
      }
    

    // Check if we need to respect selected days
    if (schedule.selectedDays && Object.values(schedule.selectedDays).some(Boolean)) {
      const dayMap: Record<string, number> = {
        sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
      };
      
      // Keep advancing the date until we find a selected day
      let daysChecked = 0;
      while (daysChecked < 7) {
        const dayOfWeek = nextTime.getDay();
        const dayKey = Object.keys(dayMap).find(key => dayMap[key] === dayOfWeek);
        
        if (dayKey && schedule.selectedDays[dayKey]) {
      
          // Final check to ensure the next execution time is in the future
          const now = new Date();
          if (nextTime && nextTime <= now) {
            this.log(`Calculated next execution time for "${schedule.name}" is in the past. Recalculating...`);
            
            // Calculate a new time in the future based on the interval
            const interval = parseInt(schedule.timeInterval || '1');
            let intervalMs = 0;
            
            switch (schedule.timeUnit) {
              case 'minute':
                intervalMs = interval * 60 * 1000;
                break;
              case 'hour':
                intervalMs = interval * 60 * 60 * 1000;
                break;
              case 'day':
                intervalMs = interval * 24 * 60 * 60 * 1000;
                break;
            }
            
            // If we have selected days, we need to handle them specially
            if (schedule.selectedDays && Object.values(schedule.selectedDays).some(Boolean)) {
              // Start from now and find the next valid day
              nextTime = new Date(now);
              // Set the time to the specified start time
              nextTime.setHours(parseInt(schedule.startHour || '0'));
              nextTime.setMinutes(parseInt(schedule.startMinute || '0'));
              nextTime.setSeconds(0);
              
              // If the time today is already past, move to tomorrow
              if (nextTime <= now) {
                nextTime.setDate(nextTime.getDate() + 1);
              }
              
              // Find the next valid day
              const dayMap: Record<string, number> = {
                sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
              };
              
              let daysChecked = 0;
              while (daysChecked < 7) {
                const dayOfWeek = nextTime.getDay();
                const dayKey = Object.keys(dayMap).find(key => dayMap[key] === dayOfWeek);
                
                if (dayKey && schedule.selectedDays[dayKey]) {
                  break; // Found a valid day
                }
                
                // Move to next day
                nextTime.setDate(nextTime.getDate() + 1);
                daysChecked++;
              }
              
              // If we've checked all days and none are selected, this schedule can't run
              if (daysChecked >= 7) {
                return null;
              }
            } else {
              // For schedules without day constraints, simply add intervals until we're in the future
              while (nextTime <= now) {
                nextTime = new Date(nextTime.getTime() + intervalMs);
              }
            }
            
          }
          
          return nextTime;
        }
        
        // Move to next day
        nextTime.setDate(nextTime.getDate() + 1);
        // Reset to the specified time
          nextTime.setHours(parseInt(schedule.startHour || '0'));
          nextTime.setMinutes(parseInt(schedule.startMinute || '0'));
        nextTime.setSeconds(0);
        
        daysChecked++;
      }
      
      // If we've checked all days and none are selected, this schedule can't run
      return null;
    }

    return nextTime;
  }
private async executeSchedule(schedule: Schedule): Promise<void> {
  console.log('execute schedule', schedule)
  if (schedule.active === false) {
    this.log(`Skipping execution of inactive schedule "${schedule.name}"`);
    return;
  }
  
  // Check if schedule has expired
  if (schedule.expirationDate) {
    const now = new Date();
    const expirationDateTime = new Date(
      `${schedule.expirationDate}T${schedule.expirationHour || '23'}:${schedule.expirationMinute || '59'}:00`
    );
    if (now > expirationDateTime) {
      this.log(`Schedule "${schedule.name}" has expired. Setting to inactive but keeping expiration info.`);
      await this.updateSchedule(schedule.id, {
        active: false,
        nextExecutionTime: undefined
      });
      return;
    }
  }
  
  this.log(`Executing schedule "${schedule.name}"`);

  // Check if we should respect activity requirement
  if (schedule.requireActivity) {
    const lastExecutionTime = schedule.lastExecutionTime ? new Date(schedule.lastExecutionTime).getTime() : 0;
    const lastActivityTime = await RooService.getLastActivityTime(schedule.lastTaskId)
    console.log('lastActivityTime', lastActivityTime);  
    console.log('lastExecutionTime', lastExecutionTime);
    if (lastActivityTime && lastActivityTime < lastExecutionTime) {
      this.log(`Skipping execution of "${schedule.name}" due to no activity since last execution`);
      // Set up the next timer
      this.setupTimerForSchedule(schedule);
      return;
    }
  }

  try {
    // Check if there's an active task and handle according to taskInteraction setting
    const hasActiveTask = await RooService.hasActiveTask();
    if (hasActiveTask) {
      // Default to "wait" if not specified
      const taskInteraction = schedule.taskInteraction || "wait";
      
      switch (taskInteraction) {
        case "wait":
          // Parse inactivityDelay from minutes to milliseconds, default to 1 minute if not set
          const inactivityDelayMinutes = schedule.inactivityDelay ? parseInt(schedule.inactivityDelay) : 1;
          const inactivityDelayMs = inactivityDelayMinutes * 60 * 1000;
          
          // Check if the active task has been inactive for the specified delay
          try {
            const lastActivityTime = await RooService.getLastActivityTimeForActiveTask();
            const now = Date.now();
            
            if (lastActivityTime && (now - lastActivityTime) >= inactivityDelayMs) {
              // Task has been inactive for the specified delay, proceed with execution
              this.log(`Task has been inactive for ${inactivityDelayMinutes} minute(s). Proceeding with schedule "${schedule.name}".`);
              // Interrupt the inactive task
              await RooService.interruptActiveTask();
            } else {
              // Task is still active or hasn't been inactive long enough
              this.log(`Task is still active or hasn't been inactive for ${inactivityDelayMinutes} minute(s). Schedule "${schedule.name}" will check again in 1 minute.`);
              // Set up a short timer to check again in 1 
              const oneMinuteFromNow = new Date(Date.now() + 60000);
              oneMinuteFromNow.setSeconds(0);
              await this.updateSchedule(schedule.id, {
                lastSkippedTime: new Date().toISOString(),
                nextExecutionTime: oneMinuteFromNow.toISOString(),
              });
              const timer = setTimeout(() => {
                this.executeSchedule(schedule);
              }, oneMinuteFromNow.getTime() - Date.now()); // 1 minute
              this.timers.set(schedule.id, timer);
              return;
            }
          } catch (error) {
            console.log(`Error checking task activity: ${error instanceof Error ? error.message : String(error)}`);
            // Set up a short timer to check again in 1 minute
            const timer = setTimeout(() => {
              this.executeSchedule(schedule);
            }, 60000); // 1 minute
            this.timers.set(schedule.id, timer);
            return;
          }
          break;
          
        case "interrupt":
          this.log(`Task already running. Schedule "${schedule.name}" will interrupt the current task.`);
          await RooService.interruptActiveTask();
          break;
          
        case "skip":
          this.log(`Task already running. Schedule "${schedule.name}" execution skipped.`);
          // Update lastSkippedTime and set up the next timer
          const updatedScheduleWithSkip = await this.updateSchedule(schedule.id, {
            lastSkippedTime: new Date().toISOString(),
          });
          if (updatedScheduleWithSkip) {
            this.setupTimerForSchedule(updatedScheduleWithSkip);
          }
          return;
      }
    } 
  } catch (error) {  }
  try {

    // Process the task and get the task ID
    const taskId = await this.processTask(schedule.mode, schedule.taskInstructions);

    // Update last execution time and last task ID
    const updatedSchedule = await this.updateSchedule(schedule.id, {
      lastExecutionTime: new Date().toISOString(),
      lastTaskId: taskId,
    });

    // Set up the next timer
    if (updatedSchedule) {
      this.setupTimerForSchedule(updatedSchedule);
    }
  } catch (error) {
    this.log(`Error executing schedule "${schedule.name}": ${error instanceof Error ? error.message : String(error)}`);
    // Still set up the next timer even if there was an error
    this.setupTimerForSchedule(schedule);
  }
}

private async processTask(mode: string, taskInstructions: string): Promise<string> {
  console.log('in process task', mode, taskInstructions);
  try {

    // Delegate to RooService for Roo Cline extension interaction and get the task ID
    const taskId = await RooService.startTaskWithMode(mode, taskInstructions);

    console.log(`Successfully started task with mode "${mode}", taskId: ${taskId}`);
    return taskId;
  } catch (error) {
    console.log(`Error processing task: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }

  /**
   * Reload schedules from disk and reschedule all timers.
   * Call this after the schedule file is updated externally.
   */
  public async reloadSchedulesAndReschedule(): Promise<void> {
    this.log("Reloading schedules and rescheduling timers due to external update");
    await this.loadSchedules();
    this.setupTimers();
  }
}