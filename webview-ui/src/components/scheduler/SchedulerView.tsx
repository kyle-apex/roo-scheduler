import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"

import { useExtensionState } from "../../context/ExtensionStateContext"
import {
	Mode,
	PromptComponent,
	getRoleDefinition,
	getCustomInstructions,
	getAllModes,
	ModeConfig,
	GroupEntry,
} from "../../../../src/shared/modes"
import { modeConfigSchema } from "../../../../src/schemas"

import { vscode } from "../../utils/vscode"
import { Tab, TabContent, TabHeader } from "../common/Tab"
import i18next from "i18next"
import { useAppTranslation } from "../../i18n/TranslationContext"
import { Trans } from "react-i18next"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card"
import { ScrollArea } from "../../components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { AutosizeTextarea } from "../../components/ui/autosize-textarea"

type SchedulerViewProps = {
	onDone: () => void
}

interface Schedule {
	id: string;
	name: string;
	mode: string;
	taskInstructions: string;
	scheduleType: string;
	timeInterval?: string;
	timeUnit?: string;
	selectedDays?: Record<string, boolean>;
	startDate?: string;
	startHour?: string;
	startMinute?: string;
	expirationDate?: string;
	expirationHour?: string;
	expirationMinute?: string;
	requireActivity?: boolean;
	createdAt: string;
	updatedAt: string;
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
	
	// State for selected mode and task instructions
	const [scheduleName, setScheduleName] = useState<string>("")
	const [selectedMode, setSelectedMode] = useState<string>("code") // Default to code mode
	const [taskInstructions, setTaskInstructions] = useState<string>("")
	const [scheduleType, setScheduleType] = useState<string>("time") // Default to time schedule
	const [isEditing, setIsEditing] = useState<boolean>(false)
	
	// Time schedule settings
	const [timeInterval, setTimeInterval] = useState<string>("1")
	const [timeUnit, setTimeUnit] = useState<string>("hour") // minute, hour, day
	const [selectedDays, setSelectedDays] = useState<Record<string, boolean>>({
		sun: false,
		mon: false,
		tue: false,
		wed: false,
		thu: false,
		fri: false,
		sat: false,
	})
	
	// Start time and expiration settings
	const [startDate, setStartDate] = useState<string>("")
	const [startHour, setStartHour] = useState<string>("")
	const [startMinute, setStartMinute] = useState<string>("00")
	const [expirationDate, setExpirationDate] = useState<string>("")
	const [expirationHour, setExpirationHour] = useState<string>("")
	const [expirationMinute, setExpirationMinute] = useState<string>("00")
	const [requireActivity, setRequireActivity] = useState<boolean>(false)
	
	// Toggle day selection
	const toggleDay = (day: string) => {
		setSelectedDays(prev => ({
			...prev,
			[day]: !prev[day]
		}))
	}
	// Get all available modes (both default and custom)
	const availableModes = useMemo(() => getAllModes(customModes), [customModes])
	
	// Set default start time to today with the hour being the hour after the current hour
	useEffect(() => {
		const now = new Date()
		const nextHour = (now.getHours() + 1) % 24
		
		// Format date as YYYY-MM-DD
		const formattedDate = now.toISOString().split('T')[0]
		setStartDate(formattedDate)
		
		// Format hour as 2-digit string (00-23)
		setStartHour(nextHour.toString().padStart(2, '0'))
		setStartMinute('00')
	}, [])
	
	// Load schedules from file
	useEffect(() => {
		loadSchedules()
	}, [])
	
	// Load schedules from .roo/schedules.json
	const loadSchedules = async () => {
		try {
			// Read the schedules.json file content
			// For now, we'll try to read from localStorage as a fallback
			const savedSchedules = localStorage.getItem('roo-schedules')
			if (savedSchedules) {
				try {
					const parsedSchedules = JSON.parse(savedSchedules)
					if (Array.isArray(parsedSchedules)) {
						console.log("Loaded schedules from localStorage:", parsedSchedules)
						setSchedules(parsedSchedules)
					}
				} catch (e) {
					console.error("Failed to parse schedules from localStorage:", e)
				}
			} else {
				console.log("No schedules found in localStorage")
				setSchedules([])
			}
		} catch (error) {
			console.error("Failed to load schedules:", error)
			setSchedules([])
		}
	}
	
	// Save schedule to file
	const saveSchedule = () => {
		if (!scheduleName.trim()) {
			// Show error or validation message
			console.error("Schedule name cannot be empty")
			return
		}
		
		const now = new Date().toISOString()
		let updatedSchedules = [...schedules]
		
		if (isEditing && selectedScheduleId) {
			// Update existing schedule
			updatedSchedules = updatedSchedules.map(schedule =>
				schedule.id === selectedScheduleId
					? {
						...schedule,
						name: scheduleName,
						mode: selectedMode,
						taskInstructions,
						scheduleType,
						timeInterval,
						timeUnit,
						selectedDays,
						startDate,
						startHour,
						startMinute,
						expirationDate,
						expirationHour,
						expirationMinute,
						requireActivity,
						updatedAt: now
					}
					: schedule
			)
		} else {
			// Create new schedule
			const newSchedule: Schedule = {
				id: Date.now().toString(),
				name: scheduleName,
				mode: selectedMode,
				taskInstructions,
				scheduleType,
				timeInterval,
				timeUnit,
				selectedDays,
				startDate,
				startHour,
				startMinute,
				expirationDate,
				expirationHour,
				expirationMinute,
				requireActivity,
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
		resetForm()
		setActiveTab("schedules")
	}
	
	// Edit schedule
	const editSchedule = (scheduleId: string) => {
		const schedule = schedules.find(s => s.id === scheduleId)
		if (schedule) {
			setSelectedScheduleId(scheduleId)
			setScheduleName(schedule.name)
			setSelectedMode(schedule.mode)
			setTaskInstructions(schedule.taskInstructions)
			setScheduleType(schedule.scheduleType)
			
			if (schedule.timeInterval) setTimeInterval(schedule.timeInterval)
			if (schedule.timeUnit) setTimeUnit(schedule.timeUnit)
			if (schedule.selectedDays) setSelectedDays(schedule.selectedDays)
			if (schedule.startDate) setStartDate(schedule.startDate)
			if (schedule.startHour) setStartHour(schedule.startHour)
			if (schedule.startMinute) setStartMinute(schedule.startMinute)
			if (schedule.expirationDate) setExpirationDate(schedule.expirationDate)
			if (schedule.expirationHour) setExpirationHour(schedule.expirationHour)
			if (schedule.expirationMinute) setExpirationMinute(schedule.expirationMinute)
			if (schedule.requireActivity !== undefined) setRequireActivity(schedule.requireActivity)
			
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
		
		// If we were editing this schedule, reset the form
		if (selectedScheduleId === scheduleId) {
			resetForm()
		}
	}
	
	// Reset form
	const resetForm = () => {
		setSelectedScheduleId(null)
		setScheduleName("")
		setSelectedMode("code")
		setTaskInstructions("")
		setScheduleType("time")
		setTimeInterval("1")
		setTimeUnit("hour")
		setSelectedDays({
			sun: false,
			mon: false,
			tue: false,
			wed: false,
			thu: false,
			fri: false,
			sat: false,
		})
		
		const now = new Date()
		const nextHour = (now.getHours() + 1) % 24
		const formattedDate = now.toISOString().split('T')[0]
		
		setStartDate(formattedDate)
		setStartHour(nextHour.toString().padStart(2, '0'))
		setStartMinute('00')
		setExpirationDate("")
		setExpirationHour("")
		setExpirationMinute("00")
		setRequireActivity(false)
		setIsEditing(false)
	}
	
	// Create new schedule
	const createNewSchedule = () => {
		resetForm()
		setActiveTab("edit")
	}
	
	// Validate expiration time is after start time
	const validateExpirationTime = useCallback(() => {
		if (!startDate || !expirationDate) return true
		
		const startDateTime = new Date(
			`${startDate}T${startHour || '00'}:${startMinute || '00'}:00`
		)
		const expirationDateTime = new Date(
			`${expirationDate}T${expirationHour || '00'}:${expirationMinute || '00'}:00`
		)
		
		return expirationDateTime > startDateTime
	}, [startDate, startHour, startMinute, expirationDate, expirationHour, expirationMinute])
	
	// Update expiration date if it's before start date
	useEffect(() => {
		if (expirationDate && startDate && new Date(expirationDate) < new Date(startDate)) {
			setExpirationDate(startDate)
		}
	}, [startDate, expirationDate])

	return (
		<Tab>
			<TabHeader className="flex justify-between items-center">
				<h3 className="text-vscode-foreground m-0">{'Scheduler' /* t("scheduler:title")*/}</h3>
				<Button onClick={onDone}>{'Done' /*t("scheduler:done") */}</Button>
			</TabHeader>
			
			<TabContent>
				<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
					<TabsList className="grid grid-cols-2 mb-4">
						<TabsTrigger value="schedules">Schedules</TabsTrigger>
						<TabsTrigger value="edit">Add/Edit Schedule</TabsTrigger>
					</TabsList>
					
					<TabsContent value="schedules" className="space-y-4">
						<div className="flex justify-between items-center mb-4">
							<h4 className="text-vscode-foreground text-lg font-medium m-0">Saved Schedules</h4>
							<Button onClick={createNewSchedule}>Create New Schedule</Button>
						</div>
						
						{schedules.length === 0 ? (
							<div className="text-center py-8 text-vscode-descriptionForeground">
								No schedules found. Create your first schedule to get started.
							</div>
						) : (
							<ScrollArea className="h-[400px]">
								<div className="space-y-3">
									{schedules.map(schedule => (
										<Card key={schedule.id} className="border border-vscode-input-border">
											<CardHeader className="pb-2">
												<CardTitle className="text-vscode-foreground">{schedule.name}</CardTitle>
												<CardDescription>
													Mode: {schedule.mode} • Type: {schedule.scheduleType === "time" ? "Time Schedule" : "After Task Completion"}
												</CardDescription>
											</CardHeader>
											<CardContent className="pb-2">
												<p className="text-sm text-vscode-descriptionForeground" style={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
													{schedule.taskInstructions}
												</p>
												{schedule.scheduleType === "time" && (
													<div className="mt-2 text-xs text-vscode-descriptionForeground">
														Every {schedule.timeInterval} {schedule.timeUnit}(s)
														{Object.values(schedule.selectedDays || {}).filter(Boolean).length > 0 && (
															<span> • {Object.values(schedule.selectedDays || {}).filter(Boolean).length} days selected</span>
														)}
													</div>
												)}
											</CardContent>
											<CardFooter className="pt-2 flex justify-end gap-2">
												<Button 
													variant="outline" 
													size="sm"
													onClick={() => editSchedule(schedule.id)}
												>
													Edit
												</Button>
												<Button 
													variant="destructive" 
													size="sm"
													onClick={() => deleteSchedule(schedule.id)}
												>
													Delete
												</Button>
											</CardFooter>
										</Card>
									))}
								</div>
							</ScrollArea>
						)}
					</TabsContent>
					
					<TabsContent value="edit">
						<div className="flex flex-col gap-5">
							<div className="flex flex-col gap-3">
								<h4 className="text-vscode-foreground text-lg font-medium m-0">
									{isEditing ? "Edit Schedule" : "Create New Schedule"}
								</h4>
								
								<div className="flex flex-col gap-2">
									<label className="text-vscode-descriptionForeground text-sm">Schedule Name</label>
									<Input
										className="w-full"
										placeholder="Enter schedule name..."
										value={scheduleName}
										onChange={(e) => setScheduleName(e.target.value)}
									/>
								</div>
								
								<div className="flex flex-col gap-3 mt-4">
									<h4 className="text-vscode-foreground text-lg font-medium m-0">Task</h4>
									
									<div className="flex flex-col gap-2">
										<label className="text-vscode-descriptionForeground text-sm">Mode</label>
										<Select value={selectedMode} onValueChange={setSelectedMode}>
											<SelectTrigger className="w-full bg-vscode-dropdown-background !bg-vscode-dropdown-background hover:!bg-vscode-dropdown-background border border-vscode-dropdown-border">
												<SelectValue placeholder="Select a mode" />
											</SelectTrigger>
											<SelectContent>
												{availableModes.map((mode) => (
													<SelectItem key={mode.slug} value={mode.slug}>
														{mode.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									
									<div className="flex flex-col gap-2">
										<label className="text-vscode-descriptionForeground text-sm">Instructions</label>
										<AutosizeTextarea
											className="w-full p-3 bg-vscode-input-background !bg-vscode-input-background border border-vscode-input-border"
											minHeight={100}
											maxHeight={300}
											placeholder="Enter task instructions..."
											value={taskInstructions}
											onChange={(e) => setTaskInstructions(e.target.value)}
										/>
									</div>
								</div>
							</div>

							<div className="flex flex-col gap-3">
								<h4 className="text-vscode-foreground text-lg font-medium m-0">Schedule</h4>
								
								<div className="flex flex-col gap-2">
									<label className="text-vscode-descriptionForeground text-sm">Schedule Type</label>
									<Select value={scheduleType} onValueChange={setScheduleType}>
										<SelectTrigger className="w-full bg-vscode-dropdown-background !bg-vscode-dropdown-background hover:!bg-vscode-dropdown-background border border-vscode-dropdown-border">
											<SelectValue placeholder="Select a schedule type" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="time">Time Schedule</SelectItem>
											<SelectItem value="completion">After Task Completion</SelectItem>
										</SelectContent>
									</Select>
								</div>
								
								{scheduleType === "time" && (
									<div className="flex flex-col gap-3 mt-2">
										<div className="flex items-center gap-2">
											<label className="text-vscode-descriptionForeground text-sm">Every</label>
											<Input
												type="number"
												min="1"
												className="w-16 h-7"
												value={timeInterval}
												onChange={(e) => {
													// Ensure positive numbers only
													const value = parseInt(e.target.value);
													if (!isNaN(value) && value > 0) {
														setTimeInterval(value.toString());
													} else if (e.target.value === '') {
														setTimeInterval('');
													}
												}}
												aria-label="Time interval"
											/>
											<Select value={timeUnit} onValueChange={setTimeUnit}>
												<SelectTrigger className="w-32 bg-vscode-dropdown-background !bg-vscode-dropdown-background hover:!bg-vscode-dropdown-background border border-vscode-dropdown-border">
													<SelectValue placeholder="Select unit" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="minute">Minute(s)</SelectItem>
													<SelectItem value="hour">Hour(s)</SelectItem>
													<SelectItem value="day">Day(s)</SelectItem>
												</SelectContent>
											</Select>
										</div>
										
										<div className="flex flex-col gap-2">
											<div className="flex items-center gap-2">
												<label className="text-vscode-descriptionForeground text-sm">Days of the week</label>
												{Object.values(selectedDays).filter(Boolean).length > 0 && (
													<Badge variant="outline" className="bg-vscode-badge-background text-vscode-badge-foreground">
														{Object.values(selectedDays).filter(Boolean).length} {Object.values(selectedDays).filter(Boolean).length === 1 ? 'day' : 'days'} selected
													</Badge>
												)}
											</div>
											<div className="flex gap-2 flex-wrap">
												{[
													{ label: 'S', day: 'sun' },
													{ label: 'M', day: 'mon' },
													{ label: 'T', day: 'tue' },
													{ label: 'W', day: 'wed' },
													{ label: 'Th', day: 'thu' },
													{ label: 'F', day: 'fri' },
													{ label: 'Sa', day: 'sat' }
												].map(({ label, day }, index) => (
													<Button
														key={day}
														variant={selectedDays[day] ? "default" : "outline"}
														className={`min-w-8 h-8 p-0 ${selectedDays[day] ? 'bg-vscode-button-background text-vscode-button-foreground' : 'bg-transparent text-vscode-foreground'}`}
														onClick={() => toggleDay(day)}
														aria-label={`Toggle ${day} selection`}
														aria-pressed={selectedDays[day]}
													>
														{label}
													</Button>
												))}
											</div>
										</div>
										
										{/* Start Time */}
										<div className="flex flex-col gap-2">
											<label className="text-vscode-descriptionForeground text-sm">Start Time</label>
											<div className="flex items-center gap-2">
												<Input
													type="date"
													className="w-40"
													value={startDate}
													onChange={(e) => setStartDate(e.target.value)}
													aria-label="Start date"
												/>
												<Input
													type="number"
													min="0"
													max="23"
													className="w-16 h-7"
													value={startHour}
													placeholder="HH"
													onChange={(e) => {
														const value = parseInt(e.target.value);
														if (!isNaN(value) && value >= 0 && value <= 23) {
															setStartHour(value.toString().padStart(2, '0'));
														} else if (e.target.value === '') {
															setStartHour('');
														}
													}}
													aria-label="Start hour"
												/>
												<span className="text-vscode-descriptionForeground">:</span>
												<Input
													type="number"
													min="0"
													max="59"
													className="w-16 h-7"
													value={startMinute}
													placeholder="MM"
													onChange={(e) => {
														const value = parseInt(e.target.value);
														if (!isNaN(value) && value >= 0 && value <= 59) {
															setStartMinute(value.toString().padStart(2, '0'));
														} else if (e.target.value === '') {
															setStartMinute('');
														}
													}}
													aria-label="Start minute"
												/>
											</div>
										</div>
										
										{/* Expiration Time */}
										<div className="flex flex-col gap-2">
											<label className="text-vscode-descriptionForeground text-sm">Expires</label>
											<div className="flex items-center gap-2">
												<Input
													type="date"
													className="w-40"
													value={expirationDate}
													min={startDate}
													onChange={(e) => setExpirationDate(e.target.value)}
													aria-label="Expiration date"
												/>
												<Input
													type="number"
													min="0"
													max="23"
													className="w-16 h-7"
													value={expirationHour}
													placeholder="HH"
													onChange={(e) => {
														const value = parseInt(e.target.value);
														if (!isNaN(value) && value >= 0 && value <= 23) {
															setExpirationHour(value.toString().padStart(2, '0'));
														} else if (e.target.value === '') {
															setExpirationHour('');
														}
													}}
													aria-label="Expiration hour"
												/>
												<span className="text-vscode-descriptionForeground">:</span>
												<Input
													type="number"
													min="0"
													max="59"
													className="w-16 h-7"
													value={expirationMinute}
													placeholder="MM"
													onChange={(e) => {
														const value = parseInt(e.target.value);
														if (!isNaN(value) && value >= 0 && value <= 59) {
															setExpirationMinute(value.toString().padStart(2, '0'));
														} else if (e.target.value === '') {
															setExpirationMinute('');
														}
													}}
													aria-label="Expiration minute"
												/>
											</div>
											{!validateExpirationTime() && (
												<p className="text-red-500 text-xs mt-1">
													Expiration time must be after start time
												</p>
											)}
										</div>
										
										{/* Activity Requirement Checkbox */}
										<div className="flex items-center gap-2 mt-2">
											<div
												className="flex items-center cursor-pointer"
												onClick={() => setRequireActivity(!requireActivity)}
											>
												<div className={`w-4 h-4 border rounded-xs flex items-center justify-center mr-2 ${
													requireActivity
														? "bg-vscode-button-background border-vscode-button-background"
														: "border-vscode-input-border"
												}`}>
													{requireActivity && (
														<svg
															xmlns="http://www.w3.org/2000/svg"
															width="10"
															height="10"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															strokeWidth="3"
															strokeLinecap="round"
															strokeLinejoin="round"
															className="text-vscode-button-foreground"
														>
															<polyline points="20 6 9 17 4 12"></polyline>
														</svg>
													)}
												</div>
												<label className="text-vscode-descriptionForeground text-sm cursor-pointer">
													Only execute if I had activity since the last execution of this task
												</label>
											</div>
										</div>
									</div>
								)}
							</div>
						</div>
						
						<div className="flex justify-end mt-6 gap-3">
							<Button variant="outline" onClick={() => {
								resetForm()
								setActiveTab("schedules")
							}}>
								Cancel
							</Button>
							<Button onClick={saveSchedule}>
								{isEditing ? "Update Schedule" : "Save Schedule"}
							</Button>
						</div>
					</TabsContent>
				</Tabs>
			</TabContent>
		</Tab>
	)
}
export default SchedulerView
