import { RooService } from "../../../services/scheduler/RooService";

// Mock VSCode API
jest.mock("vscode", () => ({
  extensions: {
    getExtension: jest.fn(),
  },
}));

const mockGetCurrentTaskStack = jest.fn();
const mockGetConfiguration = jest.fn();

const mockApi = {
  getCurrentTaskStack: mockGetCurrentTaskStack,
  getConfiguration: mockGetConfiguration,
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