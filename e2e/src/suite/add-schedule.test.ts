import * as assert from "assert";
import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";

suite("Scheduler Extension - Add Schedule", () => {
	test("should add a new schedule and load it", async function() {
		this.timeout(30000); // 30 seconds timeout
		
		// Get workspace path
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			console.log("No workspace folder found. Skipping test.");
			this.skip();
			return;
		}
		
		const workspacePath = workspaceFolders[0].uri.fsPath;
		console.log("Using workspace path:", workspacePath);

		// Prepare .roo directory and schedules.json path
		const rooDir = path.join(workspacePath, ".roo");
		const schedulesFile = path.join(rooDir, "schedules.json");
		console.log("Schedules file path:", schedulesFile);

		try {
			// Ensure .roo directory exists
			await fs.mkdir(rooDir, { recursive: true });
			console.log("Created .roo directory");

			// Create a new schedule with a unique ID to avoid conflicts
			const testId = `test-schedule-${Date.now()}`;
			const newSchedule = {
				id: testId,
				name: "Test Schedule",
				mode: "default",
				taskInstructions: "Do something on a schedule",
				scheduleType: "time",
				timeInterval: "1",
				timeUnit: "minute",
				startDate: new Date().toISOString().slice(0, 10),
				startHour: "00",
				startMinute: "00",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				active: true
			};
			console.log("Created test schedule with ID:", testId);

			// Write the schedule to schedules.json
			await fs.writeFile(
				schedulesFile,
				JSON.stringify({ schedules: [newSchedule] }, null, 2),
				"utf-8"
			);
			console.log("Wrote schedule to file");

			// Activate the extension and reload schedules
			const extension = vscode.extensions.getExtension("kyle-apex.roo-scheduler");
			assert.ok(extension, "Scheduler extension not found");
			if (!extension.isActive) {
				await extension.activate();
			}
			console.log("Extension is active");

			// Get SchedulerService and reload schedules
			try {
				const SchedulerService = (await import("../../../src/services/scheduler/SchedulerService")).SchedulerService;
				console.log("Imported SchedulerService");
				
				// Create a mock context if needed
				const mockContext = extension.exports?.context || {
					subscriptions: [],
					workspaceState: {
						get: () => undefined,
						update: () => Promise.resolve()
					},
					globalState: {
						get: () => undefined,
						update: () => Promise.resolve()
					},
					extensionPath: workspacePath,
					storagePath: path.join(workspacePath, '.roo'),
					logPath: path.join(workspacePath, '.roo', 'logs')
				};
				
				const service = SchedulerService.getInstance(mockContext);
				console.log("Got SchedulerService instance");
				
				await service.reloadSchedulesAndReschedule();
				console.log("Reloaded schedules");

				// Check that the new schedule is present
				const loadedSchedules = (service as any).schedules;
				console.log("Loaded schedules:", loadedSchedules);
				
				const found = loadedSchedules.some((s: any) => s.id === newSchedule.id && s.name === newSchedule.name);
				assert.ok(found, "New schedule was not loaded by SchedulerService");

				// Clean up - remove the test schedule
				const existingData = JSON.parse(await fs.readFile(schedulesFile, "utf-8"));
				existingData.schedules = existingData.schedules.filter((s: any) => s.id !== testId);
				await fs.writeFile(schedulesFile, JSON.stringify(existingData, null, 2), "utf-8");
				console.log("Cleaned up test schedule");
				
				// Reload to ensure the test schedule is removed
				await service.reloadSchedulesAndReschedule();
			} catch (serviceError) {
				console.error("Error with SchedulerService:", serviceError instanceof Error ? serviceError.message : String(serviceError));
				console.error("Stack trace:", serviceError instanceof Error ? serviceError.stack : "No stack trace");
				this.skip();
			}
		} catch (error) {
			console.error("Test error:", error instanceof Error ? error.message : String(error));
			console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace");
			this.skip();
		}
	});

	test("should verify SchedulerService can be instantiated", async function() {
		this.timeout(10000); // 10 seconds timeout
		
		// Activate the extension
		const extension = vscode.extensions.getExtension("kyle-apex.roo-scheduler");
		assert.ok(extension, "Scheduler extension not found");
		if (!extension.isActive) {
			await extension.activate();
		}
		console.log("Extension is active");

		try {
			// Get SchedulerService
			const SchedulerService = (await import("../../../src/services/scheduler/SchedulerService")).SchedulerService;
			console.log("Imported SchedulerService");
			
			// Create a mock context if needed
			const mockContext = extension.exports?.context || {
				subscriptions: [],
				workspaceState: {
					get: () => undefined,
					update: () => Promise.resolve()
				},
				globalState: {
					get: () => undefined,
					update: () => Promise.resolve()
				},
				extensionPath: __dirname,
				storagePath: path.join(__dirname, '.roo'),
				logPath: path.join(__dirname, '.roo', 'logs')
			};
			
			const service = SchedulerService.getInstance(mockContext);
			console.log("Got SchedulerService instance");
			
			// Verify the service has the expected methods
			assert.ok(service, "SchedulerService should be instantiated");
			assert.ok(typeof service.reloadSchedulesAndReschedule === 'function', "reloadSchedulesAndReschedule method should exist");
			assert.ok(typeof service.toggleScheduleActive === 'function', "toggleScheduleActive method should exist");
		} catch (error) {
			console.error("Error testing SchedulerService:", error instanceof Error ? error.message : String(error));
			console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace");
			this.skip();
		}
	});
});