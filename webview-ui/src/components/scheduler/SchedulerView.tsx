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

type SchedulerViewProps = {
	onDone: () => void
}


const SchedulerView = ({ onDone }: SchedulerViewProps) => {
	const { t } = useAppTranslation()



	return (
		<Tab>
			<TabHeader className="flex justify-between items-center">
				<h3 className="text-vscode-foreground m-0">{'Scheduler' /* t("scheduler:title")*/}</h3>
				<Button onClick={onDone}>{'Done' /*t("scheduler:done") */}</Button>
			</TabHeader>

			<TabContent>
				Hey
			</TabContent>
		</Tab>
	)
}
export default SchedulerView
