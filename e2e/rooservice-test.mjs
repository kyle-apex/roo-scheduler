/**
 * Configuration for running RooService integration tests with the Roo-cline extension enabled.
 * See: https://code.visualstudio.com/api/working-with-extensions/testing-extension
 */

import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  label: 'rooServiceTest',
  files: 'out/suite/rooService.test.js',
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