import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AutosizeTextarea } from "@/components/ui/autosize-textarea"

type SchedulerViewProps = {
	onDone: () => void
}

const SchedulerView = ({ onDone }: SchedulerViewProps) => {
	const { t } = useAppTranslation()
	const { customModes } = useExtensionState()
	
	// State for selected mode and task instructions
	const [selectedMode, setSelectedMode] = useState<string>("code") // Default to code mode
	const [taskInstructions, setTaskInstructions] = useState<string>("")
	const [scheduleType, setScheduleType] = useState<string>("time") // Default to time schedule
	
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

			<TabContent className="flex flex-col gap-5">
				<div className="flex flex-col gap-3">
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
			</TabContent>
		</Tab>
	)
}
export default SchedulerView
