import posthog from "posthog-js"

class TelemetryClient {
	private static instance: TelemetryClient
	private static telemetryEnabled: boolean = false

	public updateTelemetryState(telemetrySetting: any, apiKey?: string, distinctId?: string) {
		
	}

	public static getInstance(): TelemetryClient {
		if (!TelemetryClient.instance) {
			TelemetryClient.instance = new TelemetryClient()
		}
		return TelemetryClient.instance
	}

	public capture(eventName: string, properties?: Record<string, any>) {
		if (TelemetryClient.telemetryEnabled) {
			try {
				posthog.capture(eventName, properties)
			} catch (error) {
				// Silently fail if there's an error capturing an event
			}
		}
	}
}

export const telemetryClient = TelemetryClient.getInstance()
