import { RooService } from "../../../services/scheduler/RooService";

// Mock VSCode API
jest.mock("vscode", () => ({
  extensions: {
    getExtension: jest.fn(),
  },
  commands: {
    executeCommand: jest.fn(),
  },
  window: {
    showInformationMessage: jest.fn(),
  },
}));

const mockGetCurrentTaskStack = jest.fn();
const mockGetConfiguration = jest.fn();
const mockCancelCurrentTask = jest.fn();
const mockIsTaskInHistory = jest.fn();

const mockApi = {
  getCurrentTaskStack: mockGetCurrentTaskStack,
  getConfiguration: mockGetConfiguration,
  cancelCurrentTask: mockCancelCurrentTask,
  isTaskInHistory: mockIsTaskInHistory,
};

const mockExtension = {
  isActive: true,
  exports: mockApi,
};

describe("RooService.getLastActivityTimeForActiveTask", () => {
  const vscode = require("vscode");

  beforeEach(() => {
    jest.clearAllMocks();
    vscode.extensions.getExtension.mockReturnValue(mockExtension);
  });

  it("returns the timestamp of the last activity for the active task", async () => {
    mockGetCurrentTaskStack.mockReturnValue(["task-1", "task-2"]);
    mockGetConfiguration.mockReturnValue({
      taskHistory: [
        { id: "task-1", ts: 1000 },
        { id: "task-2", ts: 2000 },
      ],
    });

    const ts = await RooService.getLastActivityTimeForActiveTask();
    expect(ts).toBe(2000);
  });

  it("returns undefined if there is no active task", async () => {
    mockGetCurrentTaskStack.mockReturnValue([]);
    mockGetConfiguration.mockReturnValue({
      taskHistory: [
        { id: "task-1", ts: 1000 },
      ],
    });

    const ts = await RooService.getLastActivityTimeForActiveTask();
    expect(ts).toBeUndefined();
  });

  it("returns undefined if taskHistory is missing", async () => {
    mockGetCurrentTaskStack.mockReturnValue(["task-1"]);
    mockGetConfiguration.mockReturnValue({});

    const ts = await RooService.getLastActivityTimeForActiveTask();
    expect(ts).toBeUndefined();
  });

  it("returns undefined if the active task is not in taskHistory", async () => {
    mockGetCurrentTaskStack.mockReturnValue(["task-3"]);
    mockGetConfiguration.mockReturnValue({
      taskHistory: [
        { id: "task-1", ts: 1000 },
        { id: "task-2", ts: 2000 },
      ],
    });

    const ts = await RooService.getLastActivityTimeForActiveTask();
    expect(ts).toBeUndefined();
  });

  it("throws if the extension is not active", async () => {
    const vscode = require("vscode");
    vscode.extensions.getExtension.mockReturnValue({ isActive: false });
    await expect(RooService.getLastActivityTimeForActiveTask()).rejects.toThrow(
      "Roo Cline extension is not activated"
    );
  });

  it("throws if the API is not available", async () => {
    const vscode = require("vscode");
    vscode.extensions.getExtension.mockReturnValue({ isActive: true, exports: undefined });
    await expect(RooService.getLastActivityTimeForActiveTask()).rejects.toThrow(
      "Roo Cline API is not available"
    );
  });
});

describe("RooService.hasActiveTask", () => {
  const vscode = require("vscode");

  beforeEach(() => {
    jest.clearAllMocks();
    vscode.extensions.getExtension.mockReturnValue(mockExtension);
  });

  it("returns true if there is an active task", async () => {
    mockGetCurrentTaskStack.mockReturnValue(["task-1"]);
    const result = await RooService.hasActiveTask();
    expect(result).toBe(true);
  });

  it("returns false if there is no active task", async () => {
    mockGetCurrentTaskStack.mockReturnValue([]);
    const result = await RooService.hasActiveTask();
    expect(result).toBe(false);
  });

  it("returns false if task stack is undefined", async () => {
    mockGetCurrentTaskStack.mockReturnValue(undefined);
    const result = await RooService.hasActiveTask();
    expect(result).toBe(false);
  });
});

describe("RooService.interruptActiveTask", () => {
  const vscode = require("vscode");

  beforeEach(() => {
    jest.clearAllMocks();
    vscode.extensions.getExtension.mockReturnValue(mockExtension);
    mockCancelCurrentTask.mockResolvedValue(undefined);
  });

  it("cancels the current task and returns true if there is an active task", async () => {
    mockGetCurrentTaskStack.mockReturnValue(["task-1"]);
    const result = await RooService.interruptActiveTask();
    expect(result).toBe(true);
    expect(mockCancelCurrentTask).toHaveBeenCalled();
  });

  it("returns false without canceling if there is no active task", async () => {
    mockGetCurrentTaskStack.mockReturnValue([]);
    const result = await RooService.interruptActiveTask();
    expect(result).toBe(false);
    expect(mockCancelCurrentTask).not.toHaveBeenCalled();
  });

  it("returns false without canceling if task stack is undefined", async () => {
    mockGetCurrentTaskStack.mockReturnValue(undefined);
    const result = await RooService.interruptActiveTask();
    expect(result).toBe(false);
    expect(mockCancelCurrentTask).not.toHaveBeenCalled();
  });
});

describe("RooService.isActiveTaskWithinDuration", () => {
  const vscode = require("vscode");
  const REAL_DATE_NOW = Date.now;

  beforeEach(() => {
    jest.clearAllMocks();
    vscode.extensions.getExtension.mockReturnValue(mockExtension);
  });

  afterEach(() => {
    global.Date.now = REAL_DATE_NOW;
  });

  it("returns true if the last activity is within the duration", async () => {
    mockGetCurrentTaskStack.mockReturnValue(["task-1"]);
    mockGetConfiguration.mockReturnValue({
      taskHistory: [
        { id: "task-1", ts: 1000 },
      ],
    });
    // Mock current time to 2000, duration 1500ms (so 2000-1000=1000 < 1500)
    global.Date.now = () => 2000;
    const result = await RooService.isActiveTaskWithinDuration(1500);
    expect(result).toBe(true);
  });

  it("returns false if the last activity is outside the duration", async () => {
    mockGetCurrentTaskStack.mockReturnValue(["task-1"]);
    mockGetConfiguration.mockReturnValue({
      taskHistory: [
        { id: "task-1", ts: 1000 },
      ],
    });
    // Mock current time to 3000, duration 1500ms (so 3000-1000=2000 > 1500)
    global.Date.now = () => 3000;
    const result = await RooService.isActiveTaskWithinDuration(1500);
    expect(result).toBe(false);
  });

  it("returns false if there is no active task", async () => {
    mockGetCurrentTaskStack.mockReturnValue([]);
    mockGetConfiguration.mockReturnValue({
      taskHistory: [
        { id: "task-1", ts: 1000 },
      ],
    });
    global.Date.now = () => 2000;
    const result = await RooService.isActiveTaskWithinDuration(1500);
    expect(result).toBe(false);
  });
});

describe("RooService.resumeTask", () => {
  const vscode = require("vscode");
  const mockResumeTask = jest.fn();
  const mockExecuteCommand = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    vscode.commands.executeCommand = mockExecuteCommand;
    vscode.extensions.getExtension.mockReturnValue({
      isActive: true,
      exports: {
        ...mockApi,
        resumeTask: mockResumeTask
      }
    });
  });

  it("opens the Roo Cline extension and resumes the task", async () => {
    mockResumeTask.mockResolvedValue(undefined);
    mockExecuteCommand.mockResolvedValue(undefined);
    mockIsTaskInHistory.mockResolvedValue(true);

    await RooService.resumeTask("task-123");
    
    expect(mockIsTaskInHistory).toHaveBeenCalledWith("task-123");
    expect(mockExecuteCommand).toHaveBeenCalledWith("workbench.view.extension.roo-cline-ActivityBar");
    expect(mockResumeTask).toHaveBeenCalledWith("task-123");
  });

  it("throws an error if taskId is not provided", async () => {
    await expect(RooService.resumeTask("")).rejects.toThrow("Task ID is required to resume a task");
  });

  it("throws if the extension is not active", async () => {
    vscode.extensions.getExtension.mockReturnValue({ isActive: false });
    await expect(RooService.resumeTask("task-123")).rejects.toThrow(
      "Roo Cline extension is not activated"
    );
  });

  it("throws if the API is not available", async () => {
    vscode.extensions.getExtension.mockReturnValue({ isActive: true, exports: undefined });
    await expect(RooService.resumeTask("task-123")).rejects.toThrow(
      "Roo Cline API is not available"
    );
  });
});