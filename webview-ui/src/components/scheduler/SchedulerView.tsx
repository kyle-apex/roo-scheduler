import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"

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
	
	// Get all available modes (both default and custom)
	const availableModes = useMemo(() => getAllModes(customModes), [customModes])

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
			</TabContent>
		</Tab>
	)
}
export default SchedulerView
