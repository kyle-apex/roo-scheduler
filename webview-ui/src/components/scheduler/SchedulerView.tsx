import React, { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "../../components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Virtuoso } from "react-virtuoso"
import { cn } from "../../lib/utils"

import { useExtensionState } from "../../context/ExtensionStateContext"
import {
	getAllModes,
} from "../../../../src/shared/modes"

import { vscode } from "../../utils/vscode"
import { Tab, TabContent, TabHeader } from "../common/Tab"
import { useAppTranslation } from "../../i18n/TranslationContext"
import ConfirmationDialog from "../../components/ui/ConfirmationDialog"

// Import new components
import ScheduleForm from "./ScheduleForm"
import type { ScheduleFormHandle } from "./ScheduleForm"
import { Schedule } from "./types"

type SchedulerViewProps = {
	onDone: () => void
}

const SchedulerView = ({ onDone }: SchedulerViewProps) => {
	const { t } = useAppTranslation()
	const { customModes } = useExtensionState()
	
	// Add logging for component initialization
	console.log("SchedulerView component initialized")
	
	// Tab state
	const [activeTab, setActiveTab] = useState<string>("schedules")
	
	// Schedule list state
	const [schedules, setSchedules] = useState<Schedule[]>([])
	const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null)
	
	// Form editing state
	const [isEditing, setIsEditing] = useState<boolean>(false)
	const [initialFormData, setInitialFormData] = useState<Partial<Schedule>>({})
	
	// Delete confirmation dialog state
	const [dialogOpen, setDialogOpen] = useState(false)
	const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null)
	
	// Get all available modes (both default and custom)
	const availableModes = useMemo(() => getAllModes(customModes), [customModes])

	// Ref for ScheduleForm
	const scheduleFormRef = useRef<ScheduleFormHandle>(null);
	const [isFormValid, setIsFormValid] = useState(false);
	// No need for default start time effect - handled in ScheduleForm
	
	// Load schedules from file
	useEffect(() => {
		loadSchedules()
		
		// Set up event listener for file content messages
		const handleMessage = (event: MessageEvent) => {
			const message = event.data;
			
			// Check if this is a response with file content
			if (message.type === "fileContent" && message.path === "./.roo/schedules.json") {
				try {
					const data = JSON.parse(message.content);
					if (data && Array.isArray(data.schedules)) {
						console.log("Received schedules from file:", data.schedules);
						setSchedules(data.schedules);
						
						// Also update localStorage for backup
						try {
							localStorage.setItem('roo-schedules', JSON.stringify(data.schedules));
						} catch (e) {
							console.error("Failed to save schedules to localStorage:", e);
						}
					}
				} catch (e) {
					console.error("Failed to parse schedules from file content message:", e);
				}
			}
			
			// Listen for schedulesUpdated message from extension
			// This will be triggered when the .roo/schedules.json file is updated externally
			if (message.type === "schedulesUpdated") {
				console.log("Received schedulesUpdated message, reloading schedules");
				loadSchedules();
			}
		};
		
		// Add the event listener
		window.addEventListener('message', handleMessage);
		
		// Clean up the event listener when component unmounts
		return () => {
			window.removeEventListener('message', handleMessage);
		};
	}, [])
	
	// Load schedules from .roo/schedules.json
	const loadSchedules = async () => {
		try {
			console.log("Requesting schedules from extension")
			
			// Request the schedules file content from the extension
			vscode.postMessage({
				type: "openFile",
				text: "./.roo/schedules.json",
				values: { open: false }
			})
			
			// Set a timeout to fall back to localStorage if no response is received
			setTimeout(() => {
				console.log("Timeout waiting for file content, trying localStorage");
				tryLoadFromLocalStorage();
			}, 2000);
			
		} catch (error) {
			console.error("Failed to load schedules:", error);
			tryLoadFromLocalStorage();
		}
	}
	
	// Fallback to load from localStorage
	const tryLoadFromLocalStorage = () => {
		try {
			const savedSchedules = localStorage.getItem('roo-schedules');
			if (savedSchedules) {
				try {
					const parsedSchedules = JSON.parse(savedSchedules);
					if (Array.isArray(parsedSchedules)) {
						console.log("Loaded schedules from localStorage:", parsedSchedules);
						setSchedules(parsedSchedules);
					}
				} catch (e) {
					console.error("Failed to parse schedules from localStorage:", e);
					setSchedules([]);
				}
			} else {
				console.log("No schedules found in localStorage");
				setSchedules([]);
			}
		} catch (error) {
			console.error("Failed to load from localStorage:", error);
			setSchedules([]);
		}
	}
	
	// Save schedule to file
	const saveSchedule = (formData: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt' | 'modeDisplayName'>) => {
		if (!formData.name.trim()) {
			// Show error or validation message
			console.error("Schedule name cannot be empty")
			return
		}
		
		// Get the mode display name from the available modes
		const selectedModeConfig = availableModes.find(mode => mode.slug === formData.mode)
		const modeDisplayName = selectedModeConfig?.name || formData.mode
		
		const now = new Date().toISOString()
		let updatedSchedules = [...schedules]
		
		if (isEditing && selectedScheduleId) {
			// Update existing schedule
			updatedSchedules = updatedSchedules.map(schedule =>
				schedule.id === selectedScheduleId
					? {
						...schedule,
						...formData,
						modeDisplayName,
						updatedAt: now
					}
					: schedule
			)
		} else {
			// Create new schedule
			const newSchedule: Schedule = {
				id: Date.now().toString(),
				...formData,
				modeDisplayName,
				createdAt: now,
				updatedAt: now
			}
			
			updatedSchedules.push(newSchedule)
		}
		
		// Save to localStorage as a backup
		try {
			localStorage.setItem('roo-schedules', JSON.stringify(updatedSchedules))
			console.log("Saved schedules to localStorage")
		} catch (e) {
			console.error("Failed to save schedules to localStorage:", e)
		}
		
		// Save to file using openFile message type with create option
		const fileContent = JSON.stringify({ schedules: updatedSchedules }, null, 2)
		console.log("Saving schedules to file:", fileContent)
		
		vscode.postMessage({
			type: "openFile",
			text: "./.roo/schedules.json",
			values: { create: true, content: fileContent }
		})
		
		// Update state
		setSchedules(updatedSchedules)
		notifySchedulesUpdated(); // Notify backend to reload schedules and reschedule timers
		resetForm()
		setActiveTab("schedules")
	}

	// Notify backend to reload schedules and reschedule tasks
	const notifySchedulesUpdated = () => {
		vscode.postMessage({ type: "schedulesUpdated" });
	};

	// Edit schedule
	const editSchedule = (scheduleId: string) => {
		const schedule = schedules.find(s => s.id === scheduleId)
		if (schedule) {
			setSelectedScheduleId(scheduleId)
			
			// Set initial form data for editing
			setInitialFormData({
				name: schedule.name,
				mode: schedule.mode,
				taskInstructions: schedule.taskInstructions,
				scheduleType: schedule.scheduleType,
				timeInterval: schedule.timeInterval,
				timeUnit: schedule.timeUnit,
				selectedDays: schedule.selectedDays,
				startDate: schedule.startDate,
				startHour: schedule.startHour,
				startMinute: schedule.startMinute,
				expirationDate: schedule.expirationDate,
				expirationHour: schedule.expirationHour,
				expirationMinute: schedule.expirationMinute,
				requireActivity: schedule.requireActivity,
				taskInteraction: schedule.taskInteraction,
				inactivityDelay: schedule.inactivityDelay,
				lastExecutionTime: schedule.lastExecutionTime,
				lastSkippedTime: schedule.lastSkippedTime,
				lastTaskId: schedule.lastTaskId,
				nextExecutionTime: schedule.nextExecutionTime
			})
			
			setIsEditing(true)
			setActiveTab("edit")
		}
	}
	
	// Delete schedule
	const deleteSchedule = (scheduleId: string) => {
		const updatedSchedules = schedules.filter(s => s.id !== scheduleId)
		
		// Save to localStorage as a backup
		try {
			localStorage.setItem('roo-schedules', JSON.stringify(updatedSchedules))
			console.log("Saved updated schedules to localStorage after deletion")
		} catch (e) {
			console.error("Failed to save schedules to localStorage after deletion:", e)
		}
		
		// Save to file
		const fileContent = JSON.stringify({ schedules: updatedSchedules }, null, 2)
		console.log("Saving updated schedules to file after deletion:", fileContent)
		
		vscode.postMessage({
			type: "openFile",
			text: "./.roo/schedules.json",
			values: { create: true, content: fileContent }
		})
		
		// Update state
		setSchedules(updatedSchedules)
		
		// Notify backend to reload schedules and reschedule timers
		notifySchedulesUpdated();
		
		// If we were editing this schedule, reset the form
		if (selectedScheduleId === scheduleId) {
			resetForm()
		}
	}
	
	// Reset form
	const resetForm = () => {
		setSelectedScheduleId(null)
		setInitialFormData({})
		setIsEditing(false)
	}
	
	// Create new schedule
	const createNewSchedule = () => {
		resetForm()
		setActiveTab("edit")
	}
	
	// Validation is now handled in ScheduleForm

	return (
		<Tab>
			<TabHeader className="flex justify-between items-center">
				<h3 className="text-vscode-foreground m-0">{'Scheduler' /* t("scheduler:title")*/}</h3>
				{activeTab === "edit" ? (
					<div className="flex gap-2">
						<Button
							variant="secondary"
							onClick={() => {
								resetForm();
								setActiveTab("schedules");
							}}
							data-testid="toggle-active-button"
						>
							Cancel
						</Button>
						<Button
							onClick={() => {
								scheduleFormRef.current?.submitForm();
							}}
							disabled={!isFormValid}
							data-testid="header-save-button"
						>
							Save
						</Button>
					</div>
				) : (
					<Button onClick={createNewSchedule}>Create New Schedule</Button>
				)}
			</TabHeader>
			
			<TabContent>
				<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

					<TabsContent value="schedules" className="space-y-2">
						{schedules.length === 0 ? (
							<div className="text-center py-8 text-vscode-descriptionForeground">
								No schedules found. Create your first schedule to get started.
							</div>
						) : (
							<Virtuoso
								style={{
									height: "400px",
									overflowY: "auto",
								}}
								data={schedules}
								data-testid="virtuoso-container"
								initialTopMostItemIndex={0}
								components={{
									List: React.forwardRef((props, ref) => (
										<div {...props} ref={ref} data-testid="virtuoso-item-list" />
									)),
								}}
								itemContent={(index, schedule) => (
									<div
										data-testid={`schedule-item-${schedule.id}`}
										key={schedule.id}
										className="cursor-pointer border-b border-vscode-panel-border"
										onClick={() => editSchedule(schedule.id)}
									>
										<div className="flex items-start p-3 gap-2">
											<div className="flex-1">
												<div className="flex justify-between items-center">
													<span className="text-vscode-foreground font-medium">
														{schedule.name}
													</span>
													<div className="flex flex-row gap-1">
														{/* Active/Inactive Status Indicator */}
														<Button
															variant="ghost"
															size="sm"
															className={`h-7 px-2 py-0 text-xs font-semibold rounded ${
																schedule.active === false
																	? "text-vscode-descriptionForeground"
																	: "text-green-600"
															}`}
															onClick={e => {
																e.stopPropagation();
																// Treat undefined as true (so toggle to false)
																const isActive = schedule.active !== false;
																// Toggle active state
																const active = !isActive;
																
																// 1. Call backend to toggle schedule active state
																vscode.postMessage({
																	type: "toggleScheduleActive",
																	scheduleId: schedule.id,
																	active,
																});
																
																// 2. Update local state and storage
																const updatedSchedules = schedules.map(s =>
																	s.id === schedule.id ? { ...s, active } : s
																);
																
																try {
																	localStorage.setItem('roo-schedules', JSON.stringify(updatedSchedules));
																	console.log("Saved updated schedules to localStorage after toggle active");
																} catch (e) {
																	console.error("Failed to save schedules to localStorage after toggle active:", e);
																}
																
																const fileContent = JSON.stringify({ schedules: updatedSchedules }, null, 2);
																console.log("Saving updated schedules to file after toggle active:", fileContent);
																
																vscode.postMessage({
																	type: "openFile",
																	text: "./.roo/schedules.json",
																	values: { create: true, content: fileContent }
																});
																
																setSchedules(updatedSchedules);
																
																// Notify backend to reload schedules and reschedule timers
																notifySchedulesUpdated();
															}}
															aria-label={schedule.active === false ? "Activate schedule" : "Deactivate schedule"}
														>
															<span className="flex items-center">
																<span className={`inline-block w-2 h-2 rounded-full mr-1 ${
																	schedule.active === false ? "bg-vscode-descriptionForeground" : "bg-green-600"
																}`}></span>
																{schedule.active === false ? "Inactive" : "Active"}
															</span>
														</Button>
														
														{/* Edit Button */}
														<Button
															variant="ghost"
															size="sm"
															className="h-7 w-7 p-0"
															title="Edit schedule"
															data-testid="edit-schedule-button"
															onClick={e => { e.stopPropagation(); editSchedule(schedule.id); }}
															aria-label="Edit schedule"
														>
															<span className="codicon codicon-edit" />
														</Button>
														
														{/* Delete Button */}
														<Button
															variant="ghost"
															size="sm"
															className="h-7 w-7 p-0"
															title="Delete schedule"
															data-testid="delete-schedule-button"
															onClick={e => {
																e.stopPropagation();
																// Show confirmation dialog
																setScheduleToDelete(schedule.id);
																setDialogOpen(true);
															}}
															aria-label="Delete schedule"
														>
															<span className="codicon codicon-trash text-vscode-errorForeground" />
														</Button>
													</div>
												</div>
												
												{false && <div className="text-sm text-vscode-descriptionForeground mt-1">
													Mode: {schedule.modeDisplayName || schedule.mode} • Type: {schedule.scheduleType === "time" ? "Time Schedule" : "After Task Completion"}
												</div>}
												
												<div
													className="text-sm text-vscode-descriptionForeground mt-2"
													style={{
														overflow: "hidden",
														display: "-webkit-box",
														WebkitLineClamp: 2,
														WebkitBoxOrient: "vertical"
													}}
												>
													<span className="font-bold">{schedule.modeDisplayName || schedule.mode}: </span>{schedule.taskInstructions}
												</div>
												
												{schedule.scheduleType === "time" && (
													<div className="mt-2 text-xs text-vscode-descriptionForeground">
														Every {schedule.timeInterval} {schedule.timeUnit}(s)
														{Object.values(schedule.selectedDays || {}).filter(Boolean).length > 0 && (
															<span> • {Object.values(schedule.selectedDays || {}).filter(Boolean).length} days selected</span>
														)}
													</div>
												)}
												
												{schedule.lastExecutionTime && (
												  <div className="mt-1 text-xs text-vscode-descriptionForeground">
												    Last executed: {schedule.lastTaskId ? (
												      <button
												        className="inline-flex items-center px-1 py-0.5 rounded hover:bg-vscode-button-hoverBackground text-vscode-linkForeground hover:underline cursor-pointer"
												        onClick={(e) => {
												          e.stopPropagation();
												          console.log(`Clicked on last execution time for schedule: ${schedule.id}`);
												          console.log(`Last task ID: ${schedule.lastTaskId}`);
												          
												          // Send message to extension to resume the task
												          console.log("Sending resumeTask message to extension");
												          vscode.postMessage({
												            type: "resumeTask",
												            taskId: schedule.lastTaskId
												          });
												          console.log("resumeTask message sent");
												        }}
												        title="Click to view/resume this task in Roo Code"
												      >
												        {new Date(schedule.lastExecutionTime).toLocaleString()}
												      </button>
												    ) : (
												      new Date(schedule.lastExecutionTime).toLocaleString()
												    )}
												  </div>
												)}
												
												{schedule.active !== false && schedule.scheduleType === "time" && (
												  <div className="mt-1 text-xs text-vscode-descriptionForeground flex items-center">
												    {false && <span className="codicon codicon-clock mr-1"></span>}
												    Next execution: &nbsp;{(() => {
												      // Use stored nextExecutionTime if available, otherwise calculate it
												      const nextTime = schedule.nextExecutionTime
												        ? new Date(schedule.nextExecutionTime)
												        : null;
												        
												      if (!nextTime) {
												        return <span className="italic">Not scheduled</span>;
												      }
												      
												      const now = new Date();
												      const timeDiff = nextTime.getTime() - now.getTime();
												      const isUpcomingSoon = timeDiff <= 60 * 60 * 1000; // Within the next hour
												      
												      return (
												        <span className={`${isUpcomingSoon ? 'text-vscode-notificationsInfoIcon font-medium' : 'text-vscode-foreground'}`}>
												          {nextTime.toLocaleString()}
												          {isUpcomingSoon && (
												            <span className="ml-1 text-vscode-notificationsInfoIcon">(soon)</span>
												          )}
												        </span>
												      );
												    })()}
												  </div>
												)}
											</div>
										</div>
									</div>
								)}
							/>
						)}
					</TabsContent>
					
					<TabsContent value="edit">
						<ScheduleForm
							ref={scheduleFormRef}
							initialData={initialFormData}
							isEditing={isEditing}
							availableModes={availableModes}
							onSave={saveSchedule}
							onCancel={() => {
								resetForm()
								setActiveTab("schedules")
							}}
							onValidityChange={setIsFormValid}
						/>
					</TabsContent>
				</Tabs>
			</TabContent>

			{/* Confirmation Dialog for Schedule Deletion */}
			<ConfirmationDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				title="Delete Schedule"
				description="Are you sure you want to delete this schedule? This action cannot be undone."
				confirmLabel="Delete"
				cancelLabel="Cancel"
				onConfirm={() => {
					if (scheduleToDelete) {
						deleteSchedule(scheduleToDelete);
						setScheduleToDelete(null);
					}
				}}
				confirmClassName="bg-vscode-errorForeground hover:bg-vscode-errorForeground/90"
			/>
		</Tab>
	)
}
export default SchedulerView
