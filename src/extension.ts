import * as vscode from "vscode"
import * as dotenvx from "@dotenvx/dotenvx"
import * as path from "path"
import * as fs from "fs/promises"
import { getWorkspacePath } from "./utils/path"
import { fileExistsAtPath } from "./utils/fs"

// Load environment variables from .env file
try {
	// Specify path to .env file in the project root directory
	const envPath = path.join(__dirname, "..", ".env")
	dotenvx.config({ path: envPath })
} catch (e) {
	// Silently handle environment loading errors
	console.warn("Failed to load environment variables:", e)
}

import "./utils/path" // Necessary to have access to String.prototype.toPosix.

import { initializeI18n } from "./i18n"
import { CodeActionProvider } from "./core/CodeActionProvider"
import { migrateSettings } from "./utils/migrateSettings"
import { formatLanguage } from "./shared/language"
import { ClineProvider } from "./core/webview/ClineProvider"
import { RooService } from "./services/scheduler/RooService"
/**
 * Built using https://github.com/microsoft/vscode-webview-ui-toolkit
 *
 * Inspired by:
 *  - https://github.com/microsoft/vscode-webview-ui-toolkit-samples/tree/main/default/weather-webview
 *  - https://github.com/microsoft/vscode-webview-ui-toolkit-samples/tree/main/frameworks/hello-world-react-cra
 */

let outputChannel: vscode.OutputChannel
let extensionContext: vscode.ExtensionContext

// This method is called when your extension is activated.
// Your extension is activated the very first time the command is executed.
export async function activate(context: vscode.ExtensionContext) {
	extensionContext = context
	outputChannel = vscode.window.createOutputChannel("Roo-Code")
	context.subscriptions.push(outputChannel)
	outputChannel.appendLine("Roo-Code extension activated")

	// Set a custom context variable for development mode
	// This is used to conditionally show the reload window button
	const isDevelopmentMode = context.extensionMode === vscode.ExtensionMode.Development
	await vscode.commands.executeCommand('setContext', 'rooSchedulerDevMode', isDevelopmentMode)
	
	// Migrate old settings to new
	await migrateSettings(context, outputChannel)

	// Initialize the scheduler service
	const { SchedulerService } = await import('./services/scheduler/SchedulerService')
	const schedulerService = SchedulerService.getInstance(context)
	await schedulerService.initialize()
	outputChannel.appendLine("Scheduler service initialized")

	// Initialize i18n for internationalization support
	initializeI18n(context.globalState.get("language") ?? formatLanguage(vscode.env.language))


	// Get default commands from configuration.
	const defaultCommands = vscode.workspace.getConfiguration("roo-cline").get<string[]>("allowedCommands") || []

	// Initialize global state if not already set.
	if (!context.globalState.get("allowedCommands")) {
		context.globalState.update("allowedCommands", defaultCommands)
	}
	
	// Register command to reload window (dev only button)
	context.subscriptions.push(
		vscode.commands.registerCommand("roo-scheduler.reloadWindowDev", async () => {
			await vscode.commands.executeCommand("workbench.action.reloadWindow")
		})
	)

	// Register command to open the roo-cline extension (always register)
	context.subscriptions.push(
		vscode.commands.registerCommand("roo-scheduler.openRooClineExtension", async () => {
			await vscode.commands.executeCommand("workbench.view.extension.roo-cline-ActivityBar")
		})
	)

	// Register command to handle schedule updates and notify the webview
	context.subscriptions.push(
		vscode.commands.registerCommand("roo-scheduler.schedulesUpdated", async () => {
			// This command is called when schedules are updated
			// Simply trigger a state refresh which will cause the webview to reload its data
			console.log("Schedules updated sending message to webview")
			await provider.postMessageToWebview({type:'schedulesUpdated'});
		})
	)

	const provider = new ClineProvider(context, outputChannel, "sidebar")


	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ClineProvider.sideBarId, provider, {
			webviewOptions: { retainContextWhenHidden: true },
		}),
	)


	/**
	 * We use the text document content provider API to show the left side for diff
	 * view by creating a virtual document for the original content. This makes it
	 * readonly so users know to edit the right side if they want to keep their changes.
	 *
	 * This API allows you to create readonly documents in VSCode from arbitrary
	 * sources, and works by claiming an uri-scheme for which your provider then
	 * returns text contents. The scheme must be provided when registering a
	 * provider and cannot change afterwards.
	 *
	 * Note how the provider doesn't create uris for virtual documents - its role
	 * is to provide contents given such an uri. In return, content providers are
	 * wired into the open document logic so that providers are always considered.
	 *
	 * https://code.visualstudio.com/api/extension-guides/virtual-documents
	 */
	const diffContentProvider = new (class implements vscode.TextDocumentContentProvider {
		provideTextDocumentContent(uri: vscode.Uri): string {
			return Buffer.from(uri.query, "base64").toString("utf-8")
		}
	})()


	// Register code actions provider.
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider({ pattern: "**/*" }, new CodeActionProvider(), {
			providedCodeActionKinds: CodeActionProvider.providedCodeActionKinds,
		}),
	)


	// Implements the `RooCodeAPI` interface.
	const socketPath = process.env.ROO_CODE_IPC_SOCKET_PATH
	const enableLogging = typeof socketPath === "string"
}

// This method is called when your extension is deactivated
export async function deactivate() {
	outputChannel.appendLine("Roo-Code extension deactivated")
	// Clean up MCP server manager
	
	// The scheduler service will be automatically cleaned up when the extension is deactivated
	// as its timers are registered as disposables in the extension context
}
