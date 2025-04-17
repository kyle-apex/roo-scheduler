import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { getModeBySlug } from '../../shared/modes';
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
  createdAt: string;
  updatedAt: string;
  lastExecutionTime?: string;
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
  private lastActivityTime: number = Date.now();

  private constructor(context: vscode.ExtensionContext) {
    this.schedulesFilePath = path.join(getWorkspacePath(), '.roo', 'schedules.json');
    this.outputChannel = vscode.window.createOutputChannel('Roo Scheduler');
    context.subscriptions.push(this.outputChannel);

    // Track user activity
    vscode.window.onDidChangeActiveTextEditor(() => this.updateLastActivityTime());
    vscode.workspace.onDidChangeTextDocument(() => this.updateLastActivityTime());
    vscode.window.onDidChangeWindowState(() => this.updateLastActivityTime());
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
    console.log('here', scheduleId, active)
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
  private async updateSchedule(scheduleId: string, updates: Partial<Schedule>): Promise<Schedule | undefined> {
    const scheduleIndex = this.schedules.findIndex(s => s.id === scheduleId);
    if (scheduleIndex === -1) return undefined;
    const updatedSchedule = { ...this.schedules[scheduleIndex], ...updates };
    this.schedules[scheduleIndex] = updatedSchedule;
    await this.saveSchedules();
    return updatedSchedule;
  }

  private updateLastActivityTime(): void {
    this.lastActivityTime = Date.now();
  }

  public async initialize(): Promise<void> {
    console.log('Initializing scheduler service');
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
      const nextExecutionTime = this.calculateNextExecutionTime(schedule);
      console.log('nextExecutionTime', nextExecutionTime)
      if (!nextExecutionTime) {
        this.log(`Schedule "${schedule.name}" has no valid execution time or has expired`);
        return;
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
    if (!schedule.timeInterval || !schedule.timeUnit || !schedule.startDate) {
      return null;
    }

    const now = new Date();
    const startDateTime = new Date(
      `${schedule.startDate}T${schedule.startHour || '00'}:${schedule.startMinute || '00'}:00`
    );
    // Check if schedule has expired
    if (schedule.expirationDate) {
      const expirationDateTime = new Date(
        `${schedule.expirationDate}T${schedule.expirationHour || '23'}:${schedule.expirationMinute || '59'}:59`
      );
      if (now > expirationDateTime) {
        return null;
      }
    }

    // If start time is in the future, return that
    if (now < startDateTime) {
      return startDateTime;
    }

    // Calculate next execution time based on interval
    let nextTime: Date;
    const interval = parseInt(schedule.timeInterval);
    
    if (schedule.lastExecutionTime) {
      // If we have a last execution time, calculate from that
      const lastExecution = new Date(schedule.lastExecutionTime);
      nextTime = new Date(lastExecution);
      
      switch (schedule.timeUnit) {
        case 'minute':
          nextTime.setMinutes(nextTime.getMinutes() + interval);
          break;
        case 'hour':
          nextTime.setHours(nextTime.getHours() + interval);
          break;
        case 'day':
          nextTime.setDate(nextTime.getDate() + interval);
          break;
      }
    } else {
      // First execution, calculate from start time
      nextTime = new Date(startDateTime);
      
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
  this.log(`Executing schedule "${schedule.name}"`);


    // Check if we should respect activity requirement
    if (schedule.requireActivity) {
      const lastExecutionTime = schedule.lastExecutionTime ? new Date(schedule.lastExecutionTime).getTime() : 0;
      if (this.lastActivityTime <= lastExecutionTime) {
        this.log(`Skipping execution of "${schedule.name}" due to no activity since last execution`);
        // Set up the next timer
        this.setupTimerForSchedule(schedule);
        return;
      }
    }

    try {
      // Process the task
      await this.processTask(schedule.mode, schedule.taskInstructions);
      
      // Update last execution time
      const updatedSchedule = await this.updateSchedule(schedule.id, { lastExecutionTime: new Date().toISOString() });
      
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

  private async processTask(mode: string, taskInstructions: string): Promise<void> {
    console.log('in process task', mode, taskInstructions);
    try {
      // Validate the mode
      const modeConfig = getModeBySlug(mode);
      if (!modeConfig) {
        throw new Error(`Invalid mode: ${mode}`);
      }

      // Delegate to RooService for Roo Cline extension interaction
      await RooService.startTaskWithMode(mode, taskInstructions);

      this.log(`Successfully started task with mode "${mode}"`);
    } catch (error) {
      this.log(`Error processing task: ${error instanceof Error ? error.message : String(error)}`);
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