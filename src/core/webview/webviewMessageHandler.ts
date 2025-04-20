import * as path from "path"
import fs from "fs/promises"
import pWaitFor from "p-wait-for"
import * as vscode from "vscode"

import { CheckpointStorage, Language, ApiConfigMeta } from "../../schemas"
import { changeLanguage, t } from "../../i18n"
import { GlobalFileNames } from "../../shared/globalFileNames"

import { checkoutDiffPayloadSchema, checkoutRestorePayloadSchema, WebviewMessage } from "../../shared/WebviewMessage"

import { openFile, openImage } from "../../integrations/misc/open-file"
import { selectImages } from "../../integrations/misc/process-images"
import { getTheme } from "../../integrations/theme/getTheme"

import { fileExistsAtPath } from "../../utils/fs"
import { playTts, setTtsEnabled, setTtsSpeed, stopTts } from "../../utils/tts"
import { searchCommits } from "../../utils/git"
import { exportSettings, importSettings } from "../config/importExport"
import { getWorkspacePath } from "../../utils/path"
import { Mode, defaultModeSlug, getModeBySlug } from "../../shared/modes"
import { GlobalState } from "../../schemas"

export const webviewMessageHandler = async (provider: any, message: WebviewMessage) => {
	// Utility functions provided for concise get/update of global state via contextProxy API.
	const getGlobalState = <K extends keyof GlobalState>(key: K) => provider.contextProxy.getValue(key)
	const updateGlobalState = async <K extends keyof GlobalState>(key: K, value: GlobalState[K]) =>
		await provider.contextProxy.setValue(key, value)

	switch (message.type) {
		case "schedulesUpdated": {
			console.log('schedulesUpdated command received');
			try {
				const { SchedulerService } = await import("../../services/scheduler/SchedulerService");
				const schedulerService = SchedulerService.getInstance(provider.contextProxy.extensionContext);
				await schedulerService.reloadSchedulesAndReschedule();
				
				// Get workspace root
				const workspaceRoot = getWorkspacePath();
				if (workspaceRoot) {
					// Resolve the full path to schedules.json
					const schedulesFilePath = path.join(workspaceRoot, ".roo", "schedules.json");
					
					try {
						// Read the current schedules file content
						const fileExists = await fileExistsAtPath(schedulesFilePath);
						if (fileExists) {
							const fileContent = await fs.readFile(schedulesFilePath, 'utf-8');
							
							// Post the content back to the webview
							provider.postMessageToWebview({
								type: "fileContent",
								path: "./.roo/schedules.json",
								content: fileContent
							});
						}
					} catch (readError) {
						console.error(`Error reading schedules.json: ${readError}`);
					}
				}
			} catch (error) {
				console.log("Failed to reload schedules and reschedule in extension:", error);
			}
			break;
		}
		case "toggleScheduleActive": {
			console.log('calling toggleSchedule active')
			// Call backend SchedulerService.toggleScheduleActive
			try {
				const { SchedulerService } = await import("../../services/scheduler/SchedulerService");
				const schedulerService = SchedulerService.getInstance(provider.contextProxy.extensionContext);
				console.log('schedulerService', schedulerService)
				if (typeof message.scheduleId === "string" && typeof message.active === "boolean") {
					await schedulerService.toggleScheduleActive(message.scheduleId, message.active);
				} else {
					console.log("toggleScheduleActive: Missing or invalid scheduleId/active in message", message);
				}
			} catch (error) {
				console.log("Failed to toggle schedule active state in extension:", error);
			}
			break;
		}
		case "webviewDidLaunch":
			// Load custom modes first
			const customModes = await provider.customModesManager.getCustomModes()
			await updateGlobalState("customModes", customModes)

			provider.postStateToWebview()
			provider.workspaceTracker?.initializeFilePaths() // don't await

			getTheme().then((theme) => provider.postMessageToWebview({ type: "theme", text: JSON.stringify(theme) }))

			// If MCP Hub is already initialized, update the webview with current server list

			provider.isViewLaunched = true
			break
		case "newTask":
			// Code that should run in response to the hello message command
			//vscode.window.showInformationMessage(message.text!)

			// Send a message to our webview.
			// You can send any JSON serializable data.
			// Could also do this in extension .ts
			//provider.postMessageToWebview({ type: "text", text: `Extension: ${Date.now()}` })
			// initializing new instance of Cline will make sure that any agentically running promises in old instance don't affect our new task. this essentially creates a fresh slate for the new task
			await provider.initClineWithTask(message.text, message.images)
			break
		case "apiConfiguration":
			if (message.apiConfiguration) {
				await provider.updateApiConfiguration(message.apiConfiguration)
			}
			await provider.postStateToWebview()
			break
		case "customInstructions":
			await provider.updateCustomInstructions(message.text)
			break
		case "alwaysAllowReadOnly":
			await updateGlobalState("alwaysAllowReadOnly", message.bool ?? undefined)
			await provider.postStateToWebview()
			break
		case "alwaysAllowReadOnlyOutsideWorkspace":
			await updateGlobalState("alwaysAllowReadOnlyOutsideWorkspace", message.bool ?? undefined)
			await provider.postStateToWebview()
			break
		case "alwaysAllowWrite":
			await updateGlobalState("alwaysAllowWrite", message.bool ?? undefined)
			await provider.postStateToWebview()
			break
		case "alwaysAllowWriteOutsideWorkspace":
			await updateGlobalState("alwaysAllowWriteOutsideWorkspace", message.bool ?? undefined)
			await provider.postStateToWebview()
			break
		case "alwaysAllowExecute":
			await updateGlobalState("alwaysAllowExecute", message.bool ?? undefined)
			await provider.postStateToWebview()
			break
		case "alwaysAllowBrowser":
			await updateGlobalState("alwaysAllowBrowser", message.bool ?? undefined)
			await provider.postStateToWebview()
			break
		case "alwaysAllowMcp":
			await updateGlobalState("alwaysAllowMcp", message.bool)
			await provider.postStateToWebview()
			break
		case "alwaysAllowModeSwitch":
			await updateGlobalState("alwaysAllowModeSwitch", message.bool)
			await provider.postStateToWebview()
			break
		case "alwaysAllowSubtasks":
			await updateGlobalState("alwaysAllowSubtasks", message.bool)
			await provider.postStateToWebview()
			break
		case "askResponse":
			provider.getCurrentCline()?.handleWebviewAskResponse(message.askResponse!, message.text, message.images)
			break
		case "clearTask":
			// clear task resets the current session and allows for a new task to be started, if this session is a subtask - it allows the parent task to be resumed
			await provider.finishSubTask(t("common:tasks.canceled"))
			await provider.postStateToWebview()
			break
		case "didShowAnnouncement":
			await updateGlobalState("lastShownAnnouncementId", provider.latestAnnouncementId)
			await provider.postStateToWebview()
			break
		case "selectImages":
			const images = await selectImages()
			await provider.postMessageToWebview({ type: "selectedImages", images })
			break
		case "exportCurrentTask":
			const currentTaskId = provider.getCurrentCline()?.taskId
			if (currentTaskId) {
				provider.exportTaskWithId(currentTaskId)
			}
			break
		case "showTaskWithId":
			provider.showTaskWithId(message.text!)
			break
		case "deleteTaskWithId":
			provider.deleteTaskWithId(message.text!)
			break
		case "deleteMultipleTasksWithIds": {
			const ids = message.ids

			if (Array.isArray(ids)) {
				// Process in batches of 20 (or another reasonable number)
				const batchSize = 20
				const results = []

				// Only log start and end of the operation
				console.log(`Batch deletion started: ${ids.length} tasks total`)

				for (let i = 0; i < ids.length; i += batchSize) {
					const batch = ids.slice(i, i + batchSize)

					const batchPromises = batch.map(async (id) => {
						try {
							await provider.deleteTaskWithId(id)
							return { id, success: true }
						} catch (error) {
							// Keep error logging for debugging purposes
							console.log(
								`Failed to delete task ${id}: ${error instanceof Error ? error.message : String(error)}`,
							)
							return { id, success: false }
						}
					})

					// Process each batch in parallel but wait for completion before starting the next batch
					const batchResults = await Promise.all(batchPromises)
					results.push(...batchResults)

					// Update the UI after each batch to show progress
					await provider.postStateToWebview()
				}

				// Log final results
				const successCount = results.filter((r) => r.success).length
				const failCount = results.length - successCount
				console.log(
					`Batch deletion completed: ${successCount}/${ids.length} tasks successful, ${failCount} tasks failed`,
				)
			}
			break
		}
		case "exportTaskWithId":
			provider.exportTaskWithId(message.text!)
			break
		case "importSettings":
			const { success } = await importSettings({
				providerSettingsManager: provider.providerSettingsManager,
				contextProxy: provider.contextProxy,
			})

			if (success) {
				provider.settingsImportedAt = Date.now()
				await provider.postStateToWebview()
				await vscode.window.showInformationMessage(t("common:info.settings_imported"))
			}

			break
		case "exportSettings":
			await exportSettings({
				providerSettingsManager: provider.providerSettingsManager,
				contextProxy: provider.contextProxy,
			})

			break
		case "resetState":
			await provider.resetState()
			break
		case "openImage":
			openImage(message.text!)
			break
		case "openFile":
			// Special handling for schedules.json file
			if (message.text === "./.roo/schedules.json") {
				try {
					// Get workspace root
					const workspaceRoot = getWorkspacePath()
					if (!workspaceRoot) {
						throw new Error("No workspace root found")
					}
					
					// Resolve the full path
					const fullPath = path.join(workspaceRoot, ".roo", "schedules.json")
					const uri = vscode.Uri.file(fullPath)
					
					// If this is a write operation (has content)
					if (message.values?.content) {
						// Ensure the .roo directory exists
						const rooDir = path.join(workspaceRoot, ".roo")
						await vscode.workspace.fs.createDirectory(vscode.Uri.file(rooDir))
						
						// Write the file content
						console.log(`Writing to schedules.json: ${message.values.content}`)
						await vscode.workspace.fs.writeFile(uri, Buffer.from(message.values.content, "utf8"))

						provider.postMessageToWebview({
							type: "fileContent",
							path: message.text,
							content: message.values.content
						})
						
						// Only open the file if explicitly requested (not for silent saves)
						if (message.values.open) {
							const document = await vscode.workspace.openTextDocument(uri)
							await vscode.window.showTextDocument(document, { preview: false })
						}
						
						// Check if there's a callback to execute after saving
						if (message.values.callback === "schedulesUpdated") {
							// Trigger the schedulesUpdated handler to reload schedules and set up timers
							console.log('Executing schedulesUpdated callback after file save');
							try {
								const { SchedulerService } = await import("../../services/scheduler/SchedulerService");
								const schedulerService = SchedulerService.getInstance(provider.contextProxy.extensionContext);
								await schedulerService.reloadSchedulesAndReschedule();
							} catch (error) {
								console.log("Failed to reload schedules and reschedule in callback:", error);
							}
						}
					}
					// If this is a read operation (no content)
					else {
						try {
							// Check if file exists
							const fileExists = await fileExistsAtPath(fullPath)
							
							if (fileExists) {
								// Read the file content
								const fileContent = await fs.readFile(fullPath, 'utf-8')
								
								// Send the content back to the webview
								provider.postMessageToWebview({
									type: "fileContent",
									path: message.text,
									content: fileContent
								})
							} else {
								// File doesn't exist, send empty content
								provider.postMessageToWebview({
									type: "fileContent",
									path: message.text,
									content: JSON.stringify({ schedules: [] })
								})
							}
						} catch (readError) {
							console.error(`Error reading schedules.json: ${readError}`)
							// Send empty content on error
							provider.postMessageToWebview({
								type: "fileContent",
								path: message.text,
								content: JSON.stringify({ schedules: [] })
							})
						}
					}
				} catch (error) {
					console.error(`Error handling schedules.json: ${error}`)
					vscode.window.showErrorMessage(`Could not handle schedules.json: ${error instanceof Error ? error.message : String(error)}`)
				}
			} else {
				// Default behavior for other files
				openFile(message.text!, message.values as { create?: boolean; content?: string })
			}
			break
		case "checkpointDiff":
			const result = checkoutDiffPayloadSchema.safeParse(message.payload)

			if (result.success) {
				await provider.getCurrentCline()?.checkpointDiff(result.data)
			}

			break
		case "checkpointRestore": {
			const result = checkoutRestorePayloadSchema.safeParse(message.payload)

			if (result.success) {
				await provider.cancelTask()

				try {
					await pWaitFor(() => provider.getCurrentCline()?.isInitialized === true, { timeout: 3_000 })
				} catch (error) {
					vscode.window.showErrorMessage(t("common:errors.checkpoint_timeout"))
				}

				try {
					await provider.getCurrentCline()?.checkpointRestore(result.data)
				} catch (error) {
					vscode.window.showErrorMessage(t("common:errors.checkpoint_failed"))
				}
			}

			break
		}
		case "cancelTask":
			await provider.cancelTask()
			break
		case "allowedCommands":
			await provider.context.globalState.update("allowedCommands", message.commands)
			// Also update workspace settings
			await vscode.workspace
				.getConfiguration("roo-cline")
				.update("allowedCommands", message.commands, vscode.ConfigurationTarget.Global)
			break
		case "openMcpSettings": {
			const mcpSettingsFilePath = await provider.getMcpHub()?.getMcpSettingsFilePath()
			if (mcpSettingsFilePath) {
				openFile(mcpSettingsFilePath)
			}
			break
		}
		case "openProjectMcpSettings": {
			if (!vscode.workspace.workspaceFolders?.length) {
				vscode.window.showErrorMessage(t("common:errors.no_workspace"))
				return
			}

			const workspaceFolder = vscode.workspace.workspaceFolders[0]
			const rooDir = path.join(workspaceFolder.uri.fsPath, ".roo")
			const mcpPath = path.join(rooDir, "mcp.json")

			try {
				await fs.mkdir(rooDir, { recursive: true })
				const exists = await fileExistsAtPath(mcpPath)
				if (!exists) {
					await fs.writeFile(mcpPath, JSON.stringify({ mcpServers: {} }, null, 2))
				}
				await openFile(mcpPath)
			} catch (error) {
				vscode.window.showErrorMessage(t("common:errors.create_mcp_json", { error: `${error}` }))
			}
			break
		}
		case "openCustomModesSettings": {
			const customModesFilePath = await provider.customModesManager.getCustomModesFilePath()
			if (customModesFilePath) {
				openFile(customModesFilePath)
			}
			break
		}
		case "deleteMcpServer": {
			if (!message.serverName) {
				break
			}

			try {
				provider.log(`Attempting to delete MCP server: ${message.serverName}`)
				await provider.getMcpHub()?.deleteServer(message.serverName, message.source as "global" | "project")
				provider.log(`Successfully deleted MCP server: ${message.serverName}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				provider.log(`Failed to delete MCP server: ${errorMessage}`)
				// Error messages are already handled by McpHub.deleteServer
			}
			break
		}
		case "restartMcpServer": {
			try {
				await provider.getMcpHub()?.restartConnection(message.text!, message.source as "global" | "project")
			} catch (error) {
				provider.log(
					`Failed to retry connection for ${message.text}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
			}
			break
		}
		case "toggleToolAlwaysAllow": {
			try {
				await provider
					.getMcpHub()
					?.toggleToolAlwaysAllow(
						message.serverName!,
						message.source as "global" | "project",
						message.toolName!,
						Boolean(message.alwaysAllow),
					)
			} catch (error) {
				provider.log(
					`Failed to toggle auto-approve for tool ${message.toolName}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
			}
			break
		}
		case "toggleMcpServer": {
			try {
				await provider
					.getMcpHub()
					?.toggleServerDisabled(
						message.serverName!,
						message.disabled!,
						message.source as "global" | "project",
					)
			} catch (error) {
				provider.log(
					`Failed to toggle MCP server ${message.serverName}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
			}
			break
		}
		case "mcpEnabled":
			const mcpEnabled = message.bool ?? true
			await updateGlobalState("mcpEnabled", mcpEnabled)
			await provider.postStateToWebview()
			break
		case "enableMcpServerCreation":
			await updateGlobalState("enableMcpServerCreation", message.bool ?? true)
			await provider.postStateToWebview()
			break
		case "ttsEnabled":
			const ttsEnabled = message.bool ?? true
			await updateGlobalState("ttsEnabled", ttsEnabled)
			setTtsEnabled(ttsEnabled) // Add this line to update the tts utility
			await provider.postStateToWebview()
			break
		case "ttsSpeed":
			const ttsSpeed = message.value ?? 1.0
			await updateGlobalState("ttsSpeed", ttsSpeed)
			setTtsSpeed(ttsSpeed)
			await provider.postStateToWebview()
			break
		case "playTts":
			if (message.text) {
				playTts(message.text, {
					onStart: () => provider.postMessageToWebview({ type: "ttsStart", text: message.text }),
					onStop: () => provider.postMessageToWebview({ type: "ttsStop", text: message.text }),
				})
			}
			break
		case "stopTts":
			stopTts()
			break
		case "diffEnabled":
			const diffEnabled = message.bool ?? true
			await updateGlobalState("diffEnabled", diffEnabled)
			await provider.postStateToWebview()
			break
		case "enableCheckpoints":
			const enableCheckpoints = message.bool ?? true
			await updateGlobalState("enableCheckpoints", enableCheckpoints)
			await provider.postStateToWebview()
			break
		case "checkpointStorage":
			console.log(`[ClineProvider] checkpointStorage: ${message.text}`)
			const checkpointStorage = message.text ?? "task"
			await updateGlobalState("checkpointStorage", checkpointStorage as CheckpointStorage)
			await provider.postStateToWebview()
			break
		case "browserViewportSize":
			const browserViewportSize = message.text ?? "900x600"
			await updateGlobalState("browserViewportSize", browserViewportSize)
			await provider.postStateToWebview()
			break
		case "remoteBrowserHost":
			await updateGlobalState("remoteBrowserHost", message.text)
			await provider.postStateToWebview()
			break
		case "remoteBrowserEnabled":
			// Store the preference in global state
			// remoteBrowserEnabled now means "enable remote browser connection"
			await updateGlobalState("remoteBrowserEnabled", message.bool ?? false)
			// If disabling remote browser connection, clear the remoteBrowserHost
			if (!message.bool) {
				await updateGlobalState("remoteBrowserHost", undefined)
			}
			await provider.postStateToWebview()
			break
		case "fuzzyMatchThreshold":
			await updateGlobalState("fuzzyMatchThreshold", message.value)
			await provider.postStateToWebview()
			break
		case "alwaysApproveResubmit":
			await updateGlobalState("alwaysApproveResubmit", message.bool ?? false)
			await provider.postStateToWebview()
			break
		case "requestDelaySeconds":
			await updateGlobalState("requestDelaySeconds", message.value ?? 5)
			await provider.postStateToWebview()
			break
		case "writeDelayMs":
			await updateGlobalState("writeDelayMs", message.value)
			await provider.postStateToWebview()
			break
		case "terminalOutputLineLimit":
			await updateGlobalState("terminalOutputLineLimit", message.value)
			await provider.postStateToWebview()
			break
		
		case "mode":
			await provider.handleModeSwitch(message.text as Mode)
			break
		case "updateSupportPrompt":
			try {
				if (Object.keys(message?.values ?? {}).length === 0) {
					return
				}

				const existingPrompts = getGlobalState("customSupportPrompts") ?? {}
				const updatedPrompts = { ...existingPrompts, ...message.values }
				await updateGlobalState("customSupportPrompts", updatedPrompts)
				await provider.postStateToWebview()
			} catch (error) {
				provider.log(
					`Error update support prompt: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
				vscode.window.showErrorMessage(t("common:errors.update_support_prompt"))
			}
			break
		case "resetSupportPrompt":
			try {
				if (!message?.text) {
					return
				}

				const existingPrompts = getGlobalState("customSupportPrompts") ?? {}
				const updatedPrompts = { ...existingPrompts }
				updatedPrompts[message.text] = undefined
				await updateGlobalState("customSupportPrompts", updatedPrompts)
				await provider.postStateToWebview()
			} catch (error) {
				provider.log(
					`Error reset support prompt: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
				vscode.window.showErrorMessage(t("common:errors.reset_support_prompt"))
			}
			break
		case "updatePrompt":
			if (message.promptMode && message.customPrompt !== undefined) {
				const existingPrompts = getGlobalState("customModePrompts") ?? {}
				const updatedPrompts = { ...existingPrompts, [message.promptMode]: message.customPrompt }
				await updateGlobalState("customModePrompts", updatedPrompts)
				const currentState = await provider.getStateToPostToWebview()
				const stateWithPrompts = { ...currentState, customModePrompts: updatedPrompts }
				provider.postMessageToWebview({ type: "state", state: stateWithPrompts })
			}
			break
		
		case "screenshotQuality":
			await updateGlobalState("screenshotQuality", message.value)
			await provider.postStateToWebview()
			break
		case "maxOpenTabsContext":
			const tabCount = Math.min(Math.max(0, message.value ?? 20), 500)
			await updateGlobalState("maxOpenTabsContext", tabCount)
			await provider.postStateToWebview()
			break
		case "maxWorkspaceFiles":
			const fileCount = Math.min(Math.max(0, message.value ?? 200), 500)
			await updateGlobalState("maxWorkspaceFiles", fileCount)
			await provider.postStateToWebview()
			break
		case "browserToolEnabled":
			await updateGlobalState("browserToolEnabled", message.bool ?? true)
			await provider.postStateToWebview()
			break
		case "language":
			changeLanguage(message.text ?? "en")
			await updateGlobalState("language", message.text as Language)
			await provider.postStateToWebview()
			break
		case "showRooIgnoredFiles":
			await updateGlobalState("showRooIgnoredFiles", message.bool ?? true)
			await provider.postStateToWebview()
			break
		case "maxReadFileLine":
			await updateGlobalState("maxReadFileLine", message.value)
			await provider.postStateToWebview()
			break
		case "toggleApiConfigPin":
			if (message.text) {
				const currentPinned = getGlobalState("pinnedApiConfigs") ?? {}
				const updatedPinned: Record<string, boolean> = { ...currentPinned }

				if (currentPinned[message.text]) {
					delete updatedPinned[message.text]
				} else {
					updatedPinned[message.text] = true
				}

				await updateGlobalState("pinnedApiConfigs", updatedPinned)
				await provider.postStateToWebview()
			}
			break
		case "enhancementApiConfigId":
			await updateGlobalState("enhancementApiConfigId", message.text)
			await provider.postStateToWebview()
			break
		case "autoApprovalEnabled":
			await updateGlobalState("autoApprovalEnabled", message.bool ?? false)
			await provider.postStateToWebview()
			break
		case "getSystemPrompt":
			try {
				const systemPrompt = await generateSystemPrompt(provider, message)

				await provider.postMessageToWebview({
					type: "systemPrompt",
					text: systemPrompt,
					mode: message.mode,
				})
			} catch (error) {
				provider.log(
					`Error getting system prompt:  ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
				vscode.window.showErrorMessage(t("common:errors.get_system_prompt"))
			}
			break
		
		case "searchCommits": {
			const cwd = provider.cwd
			if (cwd) {
				try {
					const commits = await searchCommits(message.query || "", cwd)
					await provider.postMessageToWebview({
						type: "commitSearchResults",
						commits,
					})
				} catch (error) {
					provider.log(
						`Error searching commits: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)
					vscode.window.showErrorMessage(t("common:errors.search_commits"))
				}
			}
			break
		}
		
		case "saveApiConfiguration":
			if (message.text && message.apiConfiguration) {
				try {
					await provider.providerSettingsManager.saveConfig(message.text, message.apiConfiguration)
					const listApiConfig = await provider.providerSettingsManager.listConfig()
					await updateGlobalState("listApiConfigMeta", listApiConfig)
				} catch (error) {
					provider.log(
						`Error save api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)
					vscode.window.showErrorMessage(t("common:errors.save_api_config"))
				}
			}
			break
		case "upsertApiConfiguration":
			if (message.text && message.apiConfiguration) {
				await provider.upsertApiConfiguration(message.text, message.apiConfiguration)
			}
			break
		case "renameApiConfiguration":
			if (message.values && message.apiConfiguration) {
				try {
					const { oldName, newName } = message.values

					if (oldName === newName) {
						break
					}

					// Load the old configuration to get its ID
					const oldConfig = await provider.providerSettingsManager.loadConfig(oldName)

					// Create a new configuration with the same ID
					const newConfig = {
						...message.apiConfiguration,
						id: oldConfig.id, // Preserve the ID
					}

					// Save with the new name but same ID
					await provider.providerSettingsManager.saveConfig(newName, newConfig)
					await provider.providerSettingsManager.deleteConfig(oldName)

					const listApiConfig = await provider.providerSettingsManager.listConfig()

					// Update listApiConfigMeta first to ensure UI has latest data
					await updateGlobalState("listApiConfigMeta", listApiConfig)
					await updateGlobalState("currentApiConfigName", newName)

					await provider.postStateToWebview()
				} catch (error) {
					provider.log(
						`Error rename api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)
					vscode.window.showErrorMessage(t("common:errors.rename_api_config"))
				}
			}
			break
		case "loadApiConfiguration":
			if (message.text) {
				try {
					const apiConfig = await provider.providerSettingsManager.loadConfig(message.text)
					const listApiConfig = await provider.providerSettingsManager.listConfig()

					await Promise.all([
						updateGlobalState("listApiConfigMeta", listApiConfig),
						updateGlobalState("currentApiConfigName", message.text),
						provider.updateApiConfiguration(apiConfig),
					])

					await provider.postStateToWebview()
				} catch (error) {
					provider.log(
						`Error load api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)
					vscode.window.showErrorMessage(t("common:errors.load_api_config"))
				}
			}
			break
		case "loadApiConfigurationById":
			if (message.text) {
				try {
					const { config: apiConfig, name } = await provider.providerSettingsManager.loadConfigById(
						message.text,
					)
					const listApiConfig = await provider.providerSettingsManager.listConfig()

					await Promise.all([
						updateGlobalState("listApiConfigMeta", listApiConfig),
						updateGlobalState("currentApiConfigName", name),
						provider.updateApiConfiguration(apiConfig),
					])

					await provider.postStateToWebview()
				} catch (error) {
					provider.log(
						`Error load api configuration by ID: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)
					vscode.window.showErrorMessage(t("common:errors.load_api_config"))
				}
			}
			break
		case "deleteApiConfiguration":
			if (message.text) {
				const answer = await vscode.window.showInformationMessage(
					t("common:confirmation.delete_config_profile"),
					{ modal: true },
					t("common:answers.yes"),
				)

				if (answer !== t("common:answers.yes")) {
					break
				}

				try {
					await provider.providerSettingsManager.deleteConfig(message.text)
					const listApiConfig = await provider.providerSettingsManager.listConfig()

					// Update listApiConfigMeta first to ensure UI has latest data
					await updateGlobalState("listApiConfigMeta", listApiConfig)

					// If this was the current config, switch to first available
					const currentApiConfigName = getGlobalState("currentApiConfigName")

					if (message.text === currentApiConfigName && listApiConfig?.[0]?.name) {
						const apiConfig = await provider.providerSettingsManager.loadConfig(listApiConfig[0].name)
						await Promise.all([
							updateGlobalState("currentApiConfigName", listApiConfig[0].name),
							provider.updateApiConfiguration(apiConfig),
						])
					}

					await provider.postStateToWebview()
				} catch (error) {
					provider.log(
						`Error delete api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)
					vscode.window.showErrorMessage(t("common:errors.delete_api_config"))
				}
			}
			break
		case "getListApiConfiguration":
			try {
				const listApiConfig = await provider.providerSettingsManager.listConfig()
				await updateGlobalState("listApiConfigMeta", listApiConfig)
				provider.postMessageToWebview({ type: "listApiConfig", listApiConfig })
			} catch (error) {
				provider.log(
					`Error get list api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
				vscode.window.showErrorMessage(t("common:errors.list_api_config"))
			}
			break
		
		case "updateMcpTimeout":
			if (message.serverName && typeof message.timeout === "number") {
				try {
					await provider
						.getMcpHub()
						?.updateServerTimeout(
							message.serverName,
							message.timeout,
							message.source as "global" | "project",
						)
				} catch (error) {
					provider.log(
						`Failed to update timeout for ${message.serverName}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)
					vscode.window.showErrorMessage(t("common:errors.update_server_timeout"))
				}
			}
			break
		case "updateCustomMode":
			if (message.modeConfig) {
				await provider.customModesManager.updateCustomMode(message.modeConfig.slug, message.modeConfig)
				// Update state after saving the mode
				const customModes = await provider.customModesManager.getCustomModes()
				await updateGlobalState("customModes", customModes)
				await updateGlobalState("mode", message.modeConfig.slug)
				await provider.postStateToWebview()
			}
			break
		case "deleteCustomMode":
			if (message.slug) {
				const answer = await vscode.window.showInformationMessage(
					t("common:confirmation.delete_custom_mode"),
					{ modal: true },
					t("common:answers.yes"),
				)

				if (answer !== t("common:answers.yes")) {
					break
				}

				await provider.customModesManager.deleteCustomMode(message.slug)
				// Switch back to default mode after deletion
				await updateGlobalState("mode", defaultModeSlug)
				await provider.postStateToWebview()
			}
			break
		case "humanRelayResponse":
			if (message.requestId && message.text) {
				vscode.commands.executeCommand("roo-scheduler.handleHumanRelayResponse", {
					requestId: message.requestId,
					text: message.text,
					cancelled: false,
				})
			}
			break
case "humanRelayCancel":
	if (message.requestId) {
		vscode.commands.executeCommand("roo-scheduler.handleHumanRelayResponse", {
			requestId: message.requestId,
			cancelled: true,
		})
	}
	break

case "resumeTask":
	if (message.taskId) {
		try {
			console.log(`Attempting to resume task with ID: ${message.taskId}`);
			const { RooService } = await import("../../services/scheduler/RooService");
			
			// First, try to open the Roo Cline extension directly
			console.log("Opening Roo Cline extension...");
			await vscode.commands.executeCommand("workbench.view.extension.roo-cline-ActivityBar");
			
			// Then resume the task
			console.log("Resuming task...");
			await RooService.resumeTask(message.taskId);
			console.log("Task resume completed successfully");
		} catch (error) {
			console.error("Failed to resume task:", error);
			vscode.window.showErrorMessage(`Failed to resume task: ${error instanceof Error ? error.message : String(error)}`);
		}
	} else {
		console.error("No taskId provided for resumeTask message");
		vscode.window.showErrorMessage("Cannot resume task: No task ID provided");
	}
	break

		
	}
}

const generateSystemPrompt = async (provider: any, message: WebviewMessage) => {

}
	
