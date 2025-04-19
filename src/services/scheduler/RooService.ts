import * as vscode from 'vscode';
import { RooCodeAPI } from '../../roo-code';

/**
 * Service for interacting with the Roo Cline extension.
 */
export class RooService {
  /**
   * Starts a new task in the Roo Cline extension with the specified mode and instructions.
   * @param mode The mode slug to use.
   * @param taskInstructions The instructions for the task.
   * @throws Error if the Roo Cline extension or its API is not available.
   */
  /**
   * Starts a new task in the Roo Cline extension with the specified mode and instructions.
   * @param mode The mode slug to use.
   * @param taskInstructions The instructions for the task.
   * @returns The ID of the new task.
   * @throws Error if the Roo Cline extension or its API is not available.
   */
  public static async startTaskWithMode(mode: string, taskInstructions: string): Promise<string> {
    const api = RooService.getRooClineApi();

    // Get the current configuration
    const config = api.getConfiguration();

    // Set the mode in the configuration
    const updatedConfig = {
      ...config,
      mode,
      customModePrompts: config.customModePrompts || {}
    };

    // Start a new task with the specified mode and instructions, and return the task ID
    const taskId = await api.startNewTask({
      configuration: updatedConfig,
      text: taskInstructions
    });
    return taskId;
  }

  /**
   * Gets the Roo Cline API instance, or throws if not available.
   * @private
   */
  private static getRooClineApi() {
    const extension = vscode.extensions.getExtension<RooCodeAPI>("rooveterinaryinc.roo-cline");
    if (!extension?.isActive) {
      throw new Error("Roo Cline extension is not activated");
    }
    const api = extension.exports;
    if (!api) {
      throw new Error("Roo Cline API is not available");
    }
    return api;
  }

  /**
   * Gets the timestamp of the last activity on the active task.
   * @returns The timestamp (ms since epoch) of the last activity, or undefined if not found.
   */
  public static async getLastActivityTimeForActiveTask(): Promise<number | undefined> {
    const api = RooService.getRooClineApi();

    // Get the current task stack and configuration
    const taskStack = api.getCurrentTaskStack();
    console.log('taskStack', taskStack);
    if (!taskStack || taskStack.length === 0) {
      return undefined;
    }
    const activeTaskId = taskStack[taskStack.length - 1];
    const config = api.getConfiguration();
    const taskHistory = config.taskHistory;
    console.log('taskHistory', taskHistory);
    if (!taskHistory || !Array.isArray(taskHistory)) {
      return undefined;
    }
    // Find the last entry for the active task (most recent message)
    const activeTaskEntries = taskHistory.filter((entry: any) => entry.id === activeTaskId);
    if (!activeTaskEntries.length) {
      return undefined;
    }
    return activeTaskEntries[activeTaskEntries.length - 1].ts;
  }

  /**
   * Checks if there is an active task with activity within the given duration.
   * @param durationMs The duration in milliseconds.
   * @returns Promise<boolean> - true if there is an active task and its most recent activity is within the duration from now, otherwise false.
   */
  public static async isActiveTaskWithinDuration(durationMs: number): Promise<boolean> {
    const lastActivityTime = await RooService.getLastActivityTimeForActiveTask();
    if (!lastActivityTime) {
      return false;
    }
    const now = Date.now();
    return now - lastActivityTime <= durationMs;
  }

  /**
   * Checks if there is an active task running.
   * @returns Promise<boolean> - true if there is an active task, otherwise false.
   */
  public static async hasActiveTask(): Promise<boolean> {
    const api = RooService.getRooClineApi();
    const taskStack = api.getCurrentTaskStack();
    return !!taskStack && taskStack.length > 0;
  }

  /**
   * Interrupts the current active task, if any.
   * @returns Promise<boolean> - true if a task was interrupted, false if no active task.
   */
  public static async interruptActiveTask(): Promise<boolean> {
    const api = RooService.getRooClineApi();
    const taskStack = api.getCurrentTaskStack();
    
    if (!taskStack || taskStack.length === 0) {
      return false;
    }
    
    // Cancel the current task
    await api.cancelCurrentTask();
    return true;
  }
}