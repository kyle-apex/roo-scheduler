import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../../components/ui/alert-dialog"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { AutosizeTextarea } from "../../components/ui/autosize-textarea"

// Import new components
import ScheduleList from "./ScheduleList"
import ScheduleForm from "./ScheduleForm"
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
	const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null)
	
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
		
		// Get the mode display name from the available modes
		const selectedModeConfig = availableModes.find(mode => mode.slug === selectedMode)
		const modeDisplayName = selectedModeConfig?.name || selectedMode
		
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
						modeDisplayName,
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
				modeDisplayName,
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
						
						<ScheduleList
							schedules={schedules}
							onEdit={editSchedule}
							onDeleteRequest={setScheduleToDelete}
						/>
					</TabsContent>
					
					<TabsContent value="edit">
						<ScheduleForm
							scheduleName={scheduleName}
							selectedMode={selectedMode}
							taskInstructions={taskInstructions}
							scheduleType={scheduleType}
							timeInterval={timeInterval}
							timeUnit={timeUnit}
							selectedDays={selectedDays}
							startDate={startDate}
							startHour={startHour}
							startMinute={startMinute}
							expirationDate={expirationDate}
							expirationHour={expirationHour}
							expirationMinute={expirationMinute}
							requireActivity={requireActivity}
							isEditing={isEditing}
							availableModes={availableModes}
							validateExpirationTime={validateExpirationTime}
							onScheduleNameChange={setScheduleName}
							onSelectedModeChange={setSelectedMode}
							onTaskInstructionsChange={setTaskInstructions}
							onScheduleTypeChange={setScheduleType}
							onTimeIntervalChange={setTimeInterval}
							onTimeUnitChange={setTimeUnit}
							onToggleDay={toggleDay}
							onStartDateChange={setStartDate}
							onStartHourChange={setStartHour}
							onStartMinuteChange={setStartMinute}
							onExpirationDateChange={setExpirationDate}
							onExpirationHourChange={setExpirationHour}
							onExpirationMinuteChange={setExpirationMinute}
							onRequireActivityChange={setRequireActivity}
							onSave={saveSchedule}
							onCancel={() => {
								resetForm()
								setActiveTab("schedules")
							}}
						/>
					</TabsContent>
				</Tabs>
			</TabContent>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={scheduleToDelete !== null} onOpenChange={(open) => !open && setScheduleToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Schedule</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this schedule? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (scheduleToDelete) {
									deleteSchedule(scheduleToDelete);
									setScheduleToDelete(null);
								}
							}}
							className="bg-vscode-errorForeground hover:bg-vscode-errorForeground/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Tab>
	)
}
export default SchedulerView
