import * as path from "path"
import { runTests } from "@vscode/test-electron"

async function main() {
	try {
		console.log("Starting e2e test runner");
		
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		// This should point to the root of the extension, not the e2e directory
		const extensionDevelopmentPath = path.resolve(__dirname, "../../../..");
		console.log(`Extension development path: ${extensionDevelopmentPath}`);

		// The path to the extension test script
		// Passed to --extensionTestsPath
		const extensionTestsPath = path.resolve(__dirname, "./suite/index");
		console.log(`Extension tests path: ${extensionTestsPath}`);

		// Additional launch arguments
		const launchArgs = [
			// Enable the proposed API for Roo-cline extension
			'--enable-proposed-api=RooVeterinaryInc.roo-cline',
			// Don't disable all extensions, as we need the Roo-cline extension to be available
			'--disable-extension=ms-vscode.vscode-typescript-next'
		];
		console.log(`Launch arguments: ${launchArgs.join(', ')}`);

		// Download VS Code, unzip it and run the integration test
		await runTests({
			extensionDevelopmentPath,
			extensionTestsPath,
			launchArgs
		});
		
		console.log("Tests completed successfully");
	} catch (error) {
		console.error("Failed to run tests:", error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

main().catch(error => {
	console.error("Unhandled error in main:", error instanceof Error ? error.message : String(error));
	process.exit(1);
});
