import React from "react"
import { Input } from "../../components/ui/input"
import TimeInput from "./TimeInput"

export interface DateTimeSelectorProps {
	label: string
	date: string
	hour: string
	minute: string
	setDate: (date: string) => void
	setHour: (hour: string) => void
	setMinute: (minute: string) => void
	minDate?: string
	errorMessage?: string
	dateAriaLabel?: string
	hourAriaLabel?: string
	minuteAriaLabel?: string
}

const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({
	label,
	date,
	hour,
	minute,
	setDate,
	setHour,
	setMinute,
	minDate,
	errorMessage,
	dateAriaLabel,
	hourAriaLabel,
	minuteAriaLabel,
}) => {
	return (
		<div className="flex flex-col gap-1">
			<label className="text-vscode-descriptionForeground text-sm">{label}</label>
			<div className="flex flex-wrap items-center gap-1">
				<Input
					type="date"
					className="w-34"
					value={date}
					min={minDate}
					onChange={(e) => setDate(e.target.value)}
					aria-label={dateAriaLabel}
				/>
				<div className="flex items-center gap-1">
					<TimeInput
						hour={hour}
						minute={minute}
						setHour={setHour}
						setMinute={setMinute}
						hourAria={hourAriaLabel}
						minuteAria={minuteAriaLabel}
					/>
				</div>
			</div>
			{errorMessage && <p className="text-red-500 text-xs mt-1">{errorMessage}</p>}
		</div>
	)
}

export default DateTimeSelector
