import * as vscode from "vscode";
import { activate } from "../extension";
import { RooService } from "../services/scheduler/RooService";

jest.mock("../services/scheduler/RooService");

describe("Extension activation", () => {
  let context: any;
  let outputChannelMock: any;

  beforeEach(() => {
    // Minimal mock for ExtensionContext
    context = {
      subscriptions: [],
      extensionMode: vscode.ExtensionMode.Test,
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
      },
    };
    // Mock output channel
    outputChannelMock = {
      appendLine: jest.fn(),
    };
    jest.spyOn(vscode.window, "createOutputChannel").mockReturnValue(outputChannelMock);
    jest.clearAllMocks();
  });

  it("calls RooService.getLastActivityTimeForActiveTask on activation", async () => {
    const mockGetLastActivity = jest
      .spyOn(RooService, "getLastActivityTimeForActiveTask")
      .mockResolvedValue(1234567890);

    // Mock dynamic import for SchedulerService
    jest.doMock("../services/scheduler/SchedulerService", () => ({
      SchedulerService: {
        getInstance: () => ({
          initialize: jest.fn().mockResolvedValue(undefined),
        }),
      },
    }));

    await activate(context);

    expect(mockGetLastActivity).toHaveBeenCalled();
    // Optionally, check output log
    expect(outputChannelMock.appendLine).toHaveBeenCalledWith(
      expect.stringContaining("RooService.getLastActivityTimeForActiveTask() called on activation")
    );
  });
});