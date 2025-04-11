import fs from "fs/promises"
import * as path from "path"
import os from "os"
import crypto from "crypto"
import EventEmitter from "events"

import { Anthropic } from "@anthropic-ai/sdk"
import cloneDeep from "clone-deep"
import delay from "delay"
import pWaitFor from "p-wait-for"
import getFolderSize from "get-folder-size"
import { serializeError } from "serialize-error"
import * as vscode from "vscode"

import { TokenUsage } from "../schemas"
import { ClineProvider } from "./webview/ClineProvider"

import { findToolName, formatContentBlockToMarkdown } from "../integrations/misc/export-markdown"

import {
	ClineApiReqCancelReason,
	ClineApiReqInfo,
	ClineAsk,
	ClineMessage,
	ClineSay,
	ToolProgressStatus,
} from "../shared/ExtensionMessage"

import { GlobalFileNames } from "../shared/globalFileNames"
import { defaultModeSlug, getModeBySlug, getFullModeDetails } from "../shared/modes"

import { fileExistsAtPath } from "../utils/fs"
import { arePathsEqual } from "../utils/path"

import { formatLanguage } from "../shared/language"

import { getWorkspacePath } from "../utils/path"

export type ToolResponse = string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>
type UserContent = Array<Anthropic.Messages.ContentBlockParam>

export type ClineEvents = {
	message: [{ action: "created" | "updated"; message: ClineMessage }]
	taskStarted: []
	taskModeSwitched: [taskId: string, mode: string]
	taskPaused: []
	taskUnpaused: []
	taskAskResponded: []
	taskAborted: []
	taskSpawned: [taskId: string]
	taskCompleted: [taskId: string, usage: TokenUsage]
	taskTokenUsageUpdated: [taskId: string, usage: TokenUsage]
}

export type ClineOptions = {
	provider: ClineProvider
	apiConfiguration: any
	customInstructions?: string
	enableDiff?: boolean
	enableCheckpoints?: boolean
	checkpointStorage?: any
	fuzzyMatchThreshold?: number
	consecutiveMistakeLimit?: number
	task?: string
	images?: string[]
	historyItem?: any
	experiments?: Record<string, boolean>
	startTask?: boolean
	rootTask?: Cline
	parentTask?: Cline
	taskNumber?: number
	onCreated?: (cline: Cline) => void
}

export class Cline extends EventEmitter<ClineEvents> {
	readonly taskId: string
	readonly instanceId: string

	readonly rootTask: Cline | undefined = undefined
	readonly parentTask: Cline | undefined = undefined
	readonly taskNumber: number
	isPaused: boolean = false
	pausedModeSlug: string = defaultModeSlug
	private pauseInterval: NodeJS.Timeout | undefined

	readonly apiConfiguration: any
	api: any
	private urlContentFetcher: any
	browserSession: any
	didEditFile: boolean = false
	customInstructions?: string
	diffStrategy?: any
	diffEnabled: boolean = false
	fuzzyMatchThreshold: number

	apiConversationHistory: (Anthropic.MessageParam & { ts?: number })[] = []
	clineMessages: ClineMessage[] = []
	rooIgnoreController?: any
	private askResponse?: any
	private askResponseText?: string
	private askResponseImages?: string[]
	private lastMessageTs?: number
	// Not private since it needs to be accessible by tools.
	consecutiveMistakeCount: number = 0
	consecutiveMistakeLimit: number
	consecutiveMistakeCountForApplyDiff: Map<string, number> = new Map()
	// Not private since it needs to be accessible by tools.
	providerRef: WeakRef<ClineProvider>
	private abort: boolean = false
	didFinishAbortingStream = false
	abandoned = false
	diffViewProvider: any
	private lastApiRequestTime?: number
	isInitialized = false

	// checkpoints
	private enableCheckpoints: boolean
	private checkpointStorage: any
	private checkpointService?: any | any

	// streaming
	isWaitingForFirstChunk = false
	isStreaming = false
	private currentStreamingContentIndex = 0
	private assistantMessageContent: any[] = []
	private presentAssistantMessageLocked = false
	private presentAssistantMessageHasPendingUpdates = false
	userMessageContent: (Anthropic.TextBlockParam | Anthropic.ImageBlockParam)[] = []
	private userMessageContentReady = false
	didRejectTool = false
	private didAlreadyUseTool = false
	private didCompleteReadingStream = false

	constructor({
		provider,
		apiConfiguration,
		customInstructions,
		enableDiff = false,
		enableCheckpoints = true,
		checkpointStorage = "task",
		fuzzyMatchThreshold = 1.0,
		consecutiveMistakeLimit = 3,
		task,
		images,
		historyItem,
		experiments,
		startTask = true,
		rootTask,
		parentTask,
		taskNumber = -1,
		onCreated,
	}: ClineOptions) {
		super()

		if (startTask && !task && !images && !historyItem) {
			throw new Error("Either historyItem or task/images must be provided")
		}

		

		this.taskId = historyItem ? historyItem.id : crypto.randomUUID()
		this.instanceId = crypto.randomUUID().slice(0, 8)
		this.taskNumber = -1
		this.apiConfiguration = apiConfiguration
		this.customInstructions = customInstructions
		this.diffEnabled = enableDiff
		this.fuzzyMatchThreshold = fuzzyMatchThreshold
		this.consecutiveMistakeLimit = consecutiveMistakeLimit
		this.providerRef = new WeakRef(provider)
		this.enableCheckpoints = enableCheckpoints
		this.checkpointStorage = checkpointStorage

		this.rootTask = rootTask
		this.parentTask = parentTask
		this.taskNumber = taskNumber

		

		// Initialize diffStrategy based on current state.

		onCreated?.(this)

		if (startTask) {
			if (task || images) {
				this.startTask(task, images)
			} else if (historyItem) {
				this.resumeTaskFromHistory()
			} else {
				throw new Error("Either historyItem or task/images must be provided")
			}
		}
	}

	static create(options: ClineOptions): [Cline, Promise<void>] {
		const instance = new Cline({ ...options, startTask: false })
		const { images, task, historyItem } = options
		let promise

		if (images || task) {
			promise = instance.startTask(task, images)
		} else if (historyItem) {
			promise = instance.resumeTaskFromHistory()
		} else {
			throw new Error("Either historyItem or task/images must be provided")
		}

		return [instance, promise]
	}

	get cwd() {
		return getWorkspacePath(path.join(os.homedir(), "Desktop"))
	}

	// Add method to update diffStrategy.
	

	// Storing task to disk for history

	private async ensureTaskDirectoryExists(): Promise<string> {
		const globalStoragePath = this.providerRef.deref()?.context.globalStorageUri.fsPath
		if (!globalStoragePath) {
			throw new Error("Global storage uri is invalid")
		}

		// Use storagePathManager to retrieve the task storage directory
		const { getTaskDirectoryPath } = await import("../shared/storagePathManager")
		return getTaskDirectoryPath(globalStoragePath, this.taskId)
	}

	private async getSavedApiConversationHistory(): Promise<Anthropic.MessageParam[]> {
		const filePath = path.join(await this.ensureTaskDirectoryExists(), GlobalFileNames.apiConversationHistory)
		const fileExists = await fileExistsAtPath(filePath)
		if (fileExists) {
			return JSON.parse(await fs.readFile(filePath, "utf8"))
		}
		return []
	}

	private async addToApiConversationHistory(message: Anthropic.MessageParam) {
		const messageWithTs = { ...message, ts: Date.now() }
		this.apiConversationHistory.push(messageWithTs)
		await this.saveApiConversationHistory()
	}

	async overwriteApiConversationHistory(newHistory: Anthropic.MessageParam[]) {
		this.apiConversationHistory = newHistory
		await this.saveApiConversationHistory()
	}

	private async saveApiConversationHistory() {
		try {
			const filePath = path.join(await this.ensureTaskDirectoryExists(), GlobalFileNames.apiConversationHistory)
			await fs.writeFile(filePath, JSON.stringify(this.apiConversationHistory))
		} catch (error) {
			// in the off chance this fails, we don't want to stop the task
			console.error("Failed to save API conversation history:", error)
		}
	}

	private async getSavedClineMessages(): Promise<ClineMessage[]> {
		const filePath = path.join(await this.ensureTaskDirectoryExists(), GlobalFileNames.uiMessages)

		if (await fileExistsAtPath(filePath)) {
			return JSON.parse(await fs.readFile(filePath, "utf8"))
		} else {
			// check old location
			const oldPath = path.join(await this.ensureTaskDirectoryExists(), "claude_messages.json")
			if (await fileExistsAtPath(oldPath)) {
				const data = JSON.parse(await fs.readFile(oldPath, "utf8"))
				await fs.unlink(oldPath) // remove old file
				return data
			}
		}
		return []
	}

	private async addToClineMessages(message: ClineMessage) {
		this.clineMessages.push(message)
		await this.providerRef.deref()?.postStateToWebview()
		this.emit("message", { action: "created", message })
		await this.saveClineMessages()
	}

	public async overwriteClineMessages(newMessages: ClineMessage[]) {
		this.clineMessages = newMessages
		await this.saveClineMessages()
	}

	private async updateClineMessage(partialMessage: ClineMessage) {
		await this.providerRef.deref()?.postMessageToWebview({ type: "partialMessage", partialMessage })
		this.emit("message", { action: "updated", message: partialMessage })
	}

	getTokenUsage() {
		// Body removed due to type error
	}

	private async saveClineMessages() {
		// Body removed due to type error
	}

	// Communicate with webview

	// partial has three valid states true (partial message), false (completion of partial message), undefined (individual complete message)
	async ask(
		type: ClineAsk,
		text?: string,
		partial?: boolean,
		progressStatus?: ToolProgressStatus,
	): Promise<{ response: any; text?: string; images?: string[] }> {
		// If this Cline instance was aborted by the provider, then the only
		// thing keeping us alive is a promise still running in the background,
		// in which case we don't want to send its result to the webview as it
		// is attached to a new instance of Cline now. So we can safely ignore
		// the result of any active promises, and this class will be
		// deallocated. (Although we set Cline = undefined in provider, that
		// simply removes the reference to this instance, but the instance is
		// still alive until this promise resolves or rejects.)
		if (this.abort) {
			throw new Error(`[Cline#ask] task ${this.taskId}.${this.instanceId} aborted`)
		}

		let askTs: number

		if (partial !== undefined) {
			const lastMessage = this.clineMessages.at(-1)
			const isUpdatingPreviousPartial =
				lastMessage && lastMessage.partial && lastMessage.type === "ask" && lastMessage.ask === type
			if (partial) {
				if (isUpdatingPreviousPartial) {
					// Existing partial message, so update it.
					lastMessage.text = text
					lastMessage.partial = partial
					lastMessage.progressStatus = progressStatus
					// TODO: Be more efficient about saving and posting only new
					// data or one whole message at a time so ignore partial for
					// saves, and only post parts of partial message instead of
					// whole array in new listener.
					this.updateClineMessage(lastMessage)
					throw new Error("Current ask promise was ignored (#1)")
				} else {
					// This is a new partial message, so add it with partial
					// state.
					askTs = Date.now()
					this.lastMessageTs = askTs
					await this.addToClineMessages({ ts: askTs, type: "ask", ask: type, text, partial })
					throw new Error("Current ask promise was ignored (#2)")
				}
			} else {
				if (isUpdatingPreviousPartial) {
					// This is the complete version of a previously partial
					// message, so replace the partial with the complete version.
					this.askResponse = undefined
					this.askResponseText = undefined
					this.askResponseImages = undefined

					/*
					Bug for the history books:
					In the webview we use the ts as the chatrow key for the virtuoso list. Since we would update this ts right at the end of streaming, it would cause the view to flicker. The key prop has to be stable otherwise react has trouble reconciling items between renders, causing unmounting and remounting of components (flickering).
					The lesson here is if you see flickering when rendering lists, it's likely because the key prop is not stable.
					So in this case we must make sure that the message ts is never altered after first setting it.
					*/
					askTs = lastMessage.ts
					this.lastMessageTs = askTs
					// lastMessage.ts = askTs
					lastMessage.text = text
					lastMessage.partial = false
					lastMessage.progressStatus = progressStatus
					await this.saveClineMessages()
					this.updateClineMessage(lastMessage)
				} else {
					// This is a new and complete message, so add it like normal.
					this.askResponse = undefined
					this.askResponseText = undefined
					this.askResponseImages = undefined
					askTs = Date.now()
					this.lastMessageTs = askTs
					await this.addToClineMessages({ ts: askTs, type: "ask", ask: type, text })
				}
			}
		} else {
			// This is a new non-partial message, so add it like normal.
			this.askResponse = undefined
			this.askResponseText = undefined
			this.askResponseImages = undefined
			askTs = Date.now()
			this.lastMessageTs = askTs
			await this.addToClineMessages({ ts: askTs, type: "ask", ask: type, text })
		}

		await pWaitFor(() => this.askResponse !== undefined || this.lastMessageTs !== askTs, { interval: 100 })

		if (this.lastMessageTs !== askTs) {
			// Could happen if we send multiple asks in a row i.e. with
			// command_output. It's important that when we know an ask could
			// fail, it is handled gracefully.
			throw new Error("Current ask promise was ignored")
		}

		const result = { response: this.askResponse!, text: this.askResponseText, images: this.askResponseImages }
		this.askResponse = undefined
		this.askResponseText = undefined
		this.askResponseImages = undefined
		this.emit("taskAskResponded")
		return result
	}

	async handleWebviewAskResponse(askResponse: any, text?: string, images?: string[]) {
		this.askResponse = askResponse
		this.askResponseText = text
		this.askResponseImages = images
	}

	async say(
		type: ClineSay,
		text?: string,
		images?: string[],
		partial?: boolean,
		checkpoint?: Record<string, unknown>,
		progressStatus?: ToolProgressStatus,
	): Promise<undefined> {
		if (this.abort) {
			throw new Error(`[Cline#say] task ${this.taskId}.${this.instanceId} aborted`)
		}

		if (partial !== undefined) {
			const lastMessage = this.clineMessages.at(-1)
			const isUpdatingPreviousPartial =
				lastMessage && lastMessage.partial && lastMessage.type === "say" && lastMessage.say === type
			if (partial) {
				if (isUpdatingPreviousPartial) {
					// existing partial message, so update it
					lastMessage.text = text
					lastMessage.images = images
					lastMessage.partial = partial
					lastMessage.progressStatus = progressStatus
					this.updateClineMessage(lastMessage)
				} else {
					// this is a new partial message, so add it with partial state
					const sayTs = Date.now()
					this.lastMessageTs = sayTs
					await this.addToClineMessages({ ts: sayTs, type: "say", say: type, text, images, partial })
				}
			} else {
				// New now have a complete version of a previously partial message.
				if (isUpdatingPreviousPartial) {
					// This is the complete version of a previously partial
					// message, so replace the partial with the complete version.
					this.lastMessageTs = lastMessage.ts
					// lastMessage.ts = sayTs
					lastMessage.text = text
					lastMessage.images = images
					lastMessage.partial = false
					lastMessage.progressStatus = progressStatus
					// Instead of streaming partialMessage events, we do a save
					// and post like normal to persist to disk.
					await this.saveClineMessages()
					// More performant than an entire postStateToWebview.
					this.updateClineMessage(lastMessage)
				} else {
					// This is a new and complete message, so add it like normal.
					const sayTs = Date.now()
					this.lastMessageTs = sayTs
					await this.addToClineMessages({ ts: sayTs, type: "say", say: type, text, images })
				}
			}
		} else {
			// this is a new non-partial message, so add it like normal
			const sayTs = Date.now()
			this.lastMessageTs = sayTs
			await this.addToClineMessages({ ts: sayTs, type: "say", say: type, text, images, checkpoint })
		}
	}

	async sayAndCreateMissingParamError(toolName: any, paramName: string, relPath?: string) {
		// Body removed due to type error
	}

	// Task lifecycle

	private async startTask(task?: string, images?: string[]): Promise<void> {
		// Body removed due to type error
	}

	async resumePausedTask(lastMessage?: string) {
		// release this Cline instance from paused state
		this.isPaused = false
		this.emit("taskUnpaused")

		// fake an answer from the subtask that it has completed running and this is the result of what it has done
		// add the message to the chat history and to the webview ui
		try {
			await this.say("text", `${lastMessage ?? "Please continue to the next task."}`)

			await this.addToApiConversationHistory({
				role: "user",
				content: [
					{
						type: "text",
						text: `[new_task completed] Result: ${lastMessage ?? "Please continue to the next task."}`,
					},
				],
			})
		} catch (error) {
			this.providerRef
				.deref()
				?.log(`Error failed to add reply from subtast into conversation of parent task, error: ${error}`)
			throw error
		}
	}

	private async resumeTaskFromHistory() {
		// Body removed due to type error
	}

	private async initiateTaskLoop(userContent: UserContent): Promise<void> {
		// Body removed due to type error
	}

	async abortTask(isAbandoned = false) {
		// Body removed due to type error
	}

	// Tools

	async executeCommandTool(command: string, customCwd?: string): Promise<void> {
		
	}

	async *attemptApiRequest(previousApiReqIndex: number, retryAttempt: number = 0) {
		
	}

	async presentAssistantMessage() {
		
	}

	// Used when a sub-task is launched and the parent task is waiting for it to
	// finish.
	// TBD: The 1s should be added to the settings, also should add a timeout to
	// prevent infinite waiting.
	async waitForResume() {
		await new Promise<void>((resolve) => {
			this.pauseInterval = setInterval(() => {
				if (!this.isPaused) {
					clearInterval(this.pauseInterval)
					this.pauseInterval = undefined
					resolve()
				}
			}, 1000)
		})
	}

	async recursivelyMakeClineRequests(
		userContent: UserContent,
		includeFileDetails: boolean = false,
	): Promise<void> {
		
	}

	async loadContext(userContent: UserContent, includeFileDetails: boolean = false) {
		
	}

	async getEnvironmentDetails(includeFileDetails: boolean = false) {
		
	}

	// Checkpoints

	private getCheckpointService() {
		
	}

	private async getInitializedCheckpointService({
		interval = 250,
		timeout = 15_000,
	}: { interval?: number; timeout?: number } = {}) {
		
	}

	public async checkpointDiff({
		ts,
		previousCommitHash,
		commitHash,
		mode,
	}: {
		ts: number
		previousCommitHash?: string
		commitHash: string
		mode: "full" | "checkpoint"
	}) {
		
	}

	public checkpointSave() {
		
	}

	public async checkpointRestore({
		ts,
		commitHash,
		mode,
	}: {
		ts: number
		commitHash: string
		mode: "preview" | "restore"
	}) {
		
	}
}
