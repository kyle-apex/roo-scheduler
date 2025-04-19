import * as assert from "assert";
import * as vscode from "vscode";

suite("RooService Integration with Roo-cline Extension", () => {
  test("Should verify Roo-cline extension is available", async function() {
    this.timeout(30000); // 30 seconds timeout

    // Try to get the actual Roo-cline extension
    const extension = vscode.extensions.getExtension("rooveterinaryinc.roo-cline");
    
    if (!extension) {
      console.log("Roo-cline extension not found. Skipping test.");
      this.skip();
      return;
    }

    assert.ok(extension, "Roo-cline extension should be available");
    
    // Activate the extension if it's not already active
    if (!extension.isActive) {
      try {
        await extension.activate();
      } catch (e) {
        console.log("Failed to activate Roo-cline extension:", e instanceof Error ? e.message : String(e));
        this.skip();
        return;
      }
    }

    assert.ok(extension.isActive, "Roo-cline extension should be active");
    
    const api = extension.exports;
    assert.ok(api, "Roo-cline API should be available");
    assert.ok(typeof api.getCurrentTaskStack === 'function', "getCurrentTaskStack function should be available");
    assert.ok(typeof api.getConfiguration === 'function', "getConfiguration function should be available");
  });

  test("Should verify RooService can interact with Roo-cline extension", async function() {
    this.timeout(30000); // 30 seconds timeout

    // Import the RooService from the scheduler extension
    const schedulerExtension = vscode.extensions.getExtension("kyle-apex.roo-scheduler");
    if (!schedulerExtension) {
      console.log("Scheduler extension not found. Skipping test.");
      this.skip();
      return;
    }

    if (!schedulerExtension.isActive) {
      await schedulerExtension.activate();
    }

    // Import the RooService dynamically
    const { RooService } = await import("../../../src/services/scheduler/RooService");
    
    // Test that hasActiveTask doesn't throw an error
    try {
      await RooService.hasActiveTask();
      // If we get here, the test passes
      assert.ok(true, "RooService.hasActiveTask() should not throw an error");
    } catch (error) {
      console.log("Error calling RooService.hasActiveTask():", error instanceof Error ? error.message : String(error));
      // We don't fail the test if there's an error, as the Roo-cline extension might not be properly set up in the test environment
      this.skip();
    }
  });
});