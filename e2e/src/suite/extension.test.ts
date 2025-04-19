import * as assert from "assert"
import * as vscode from "vscode"

suite("Roo Scheduler Extension", () => {
	test("Extension should be active", async () => {
		const extension = vscode.extensions.getExtension("kyle-apex.roo-scheduler")
		assert.ok(extension, "Scheduler extension not found")
		assert.ok(extension.isActive, "Scheduler extension should be active")
	})

	test("Registered commands should be available", async () => {
		// Get all available commands
		const commands = await vscode.commands.getCommands(true);
		
		// Look for commands that start with "roo-scheduler."
		const rooSchedulerCommands = commands.filter(cmd => cmd.startsWith("roo-scheduler."));
		
		// Log the found commands for debugging
		console.log("Found Roo Scheduler commands:", rooSchedulerCommands);
		
		// Verify we have at least some commands
		assert.ok(rooSchedulerCommands.length > 0, "Should find at least one roo-scheduler command");
		
		// Check for the SidebarProvider.focus command specifically
		assert.ok(
			rooSchedulerCommands.includes("roo-scheduler.SidebarProvider.focus"),
			"roo-scheduler.SidebarProvider.focus command should be registered"
		);
	})

	test("Sidebar view should be registered", async () => {
		// Try to focus the sidebar view
		await assert.doesNotReject(async () => {
			await vscode.commands.executeCommand("roo-scheduler.SidebarProvider.focus")
		}, "Sidebar view should be registered and focusable")
	})
})
