/**
 * See: https://code.visualstudio.com/api/working-with-extensions/testing-extension
 */

import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	label: 'integrationTest',
	files: 'out/suite/**/*.test.js',
	workspaceFolder: '.',
	mocha: {
		ui: 'tdd',
		timeout: 60000,
	},
	launchArgs: [
		'--enable-proposed-api=RooVeterinaryInc.roo-cline',
		// Don't disable all extensions, as we need the Roo-cline extension to be available
		'--disable-extension=ms-vscode.vscode-typescript-next'
	]
});
