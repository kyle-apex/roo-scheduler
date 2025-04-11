import * as assert from "assert"
import * as vscode from "vscode"

suite("Roo Code Extension", () => {
	test("Commands should be registered", async () => {
		const expectedCommands = [
			"roo-scheduler.plusButtonClicked",
			"roo-scheduler.mcpButtonClicked",
			"roo-scheduler.historyButtonClicked",
			"roo-scheduler.popoutButtonClicked",
			"roo-scheduler.settingsButtonClicked",
			"roo-scheduler.openInNewTab",
			"roo-scheduler.explainCode",
			"roo-scheduler.fixCode",
			"roo-scheduler.improveCode",
		]

		const commands = await vscode.commands.getCommands(true)

		for (const cmd of expectedCommands) {
			assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`)
		}
	})
})
