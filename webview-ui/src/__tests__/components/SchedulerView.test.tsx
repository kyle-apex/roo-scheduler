import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SchedulerView from "../../components/scheduler/SchedulerView";
import { ExtensionStateContextProvider } from "../../context/ExtensionStateContext";

// Mock Virtuoso to render items directly for testing
jest.mock("react-virtuoso", () => ({
  Virtuoso: ({ data, itemContent }: any) => (
    <div data-testid="virtuoso-container">
      {data && data.map((item: any, idx: number) => itemContent(idx, item))}
    </div>
  ),
}));

// Mock the Select UI components to avoid Radix/react-select issues in test
jest.mock('../../components/ui/select', () => {
  // Stateful Select mock to support value changes
  const React = require("react");
  const { useState } = React;

  const Select = ({ children, onValueChange, value: controlledValue, ...props }: any) => {
    const [value, setValue] = useState(controlledValue ?? "");
    const handleValueChange = (newValue: any) => {
      setValue(newValue);
      if (onValueChange) onValueChange(newValue);
    };
    // Pass value and onValueChange to children
    return (
      <div>
        {React.Children.map(children, (child: any) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { onValueChange: handleValueChange, value });
          }
          return child;
        })}
      </div>
    );
  };

  const SelectContent = ({ children, onValueChange, value }: any) => (
    <div>
      {React.Children.map(children, (child: any) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { onValueChange, value });
        }
        return child;
      })}
    </div>
  );

  const SelectItem = ({ children, value, onValueChange, ...props }: any) => (
    <div
      {...props}
      onClick={() => onValueChange && onValueChange(value)}
      role="option"
      aria-selected={false}
    >
      {children}
    </div>
  );

  const SelectGroup = ({ children }: any) => <div>{children}</div>;
  const SelectLabel = ({ children }: any) => <div>{children}</div>;
  const SelectScrollDownButton = ({ children }: any) => <div>{children}</div>;
  const SelectScrollUpButton = ({ children }: any) => <div>{children}</div>;
  const SelectSeparator = () => <div />;
  const SelectTrigger = ({ children, ...props }: any) => <button {...props}>{children}</button>;
  const SelectValue = ({ children }: any) => <span>{children}</span>;
  return {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectScrollDownButton,
    SelectScrollUpButton,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
  };
});

// Mock getAllModes to return a minimal mode list
jest.mock("../../../../src/shared/modes", () => ({
  getAllModes: () => [
    { slug: "code", name: "Code", roleDefinition: "role-code", groups: ["read"], source: "global", customInstructions: "" }
  ]
}));

// Mock VSCode API
jest.mock("../../utils/vscode", () => ({
  vscode: { postMessage: jest.fn() }
}));

describe("SchedulerView", () => {
  function renderWithProvider() {
    return render(
      <ExtensionStateContextProvider>
        <SchedulerView onDone={jest.fn()} />
      </ExtensionStateContextProvider>
    );
  }

  beforeEach(() => {
    localStorage.clear();
  });

  it("disables header Save button unless all required fields are filled", () => {
    renderWithProvider();

    // Enter edit mode
    fireEvent.click(screen.getByText(/Create New Schedule/i));

    // Header Save button should be disabled if timeInterval is cleared
    const headerSaveButton = screen.getByTestId("header-save-button") as HTMLButtonElement;
    const intervalInput = screen.getByLabelText(/Time interval/i);
    fireEvent.change(intervalInput, { target: { value: "" } });
    // Debug: log disabled state
    // eslint-disable-next-line no-console
    console.log("After clearing interval, disabled:", headerSaveButton.disabled);
    expect(headerSaveButton).toBeDisabled();

    // Fill name
    fireEvent.change(screen.getByPlaceholderText(/Enter schedule name/i), { target: { value: "Test Name" } });
    // eslint-disable-next-line no-console
    console.log("After filling name, disabled:", headerSaveButton.disabled);
    expect(headerSaveButton).toBeDisabled();

    // Fill instructions
    fireEvent.change(screen.getByPlaceholderText(/Enter task instructions/i), { target: { value: "Do something" } });
    // eslint-disable-next-line no-console
    console.log("After filling instructions, disabled:", headerSaveButton.disabled);
    expect(headerSaveButton).toBeDisabled();

    // Set timeInterval to a valid value
    fireEvent.change(intervalInput, { target: { value: "2" } });
    // eslint-disable-next-line no-console
    console.log("After setting interval to 2, disabled:", headerSaveButton.disabled);

    // Now the Save button should be enabled
    expect(headerSaveButton).not.toBeDisabled();

    // Clear instructions again
    fireEvent.change(screen.getByPlaceholderText(/Enter task instructions/i), { target: { value: "" } });
    // eslint-disable-next-line no-console
    console.log("After clearing instructions, disabled:", headerSaveButton.disabled);
    expect(headerSaveButton).toBeDisabled();
  });

  describe("row and button click edit mode behavior", () => {
    const schedule = {
      id: "123",
      name: "My Schedule",
      mode: "code",
      modeDisplayName: "Code",
      taskInstructions: "Do something important",
      scheduleType: "time",
      timeInterval: 5,
      timeUnit: "minutes",
      selectedDays: {},
      startDate: "2025-04-18",
      startHour: 10,
      startMinute: 0,
      expirationDate: "",
      expirationHour: 0,
      expirationMinute: 0,
      requireActivity: false,
      createdAt: "2025-04-18T10:00:00.000Z",
      updatedAt: "2025-04-18T10:00:00.000Z",
      active: true,
    };

    beforeEach(() => {
      localStorage.setItem("roo-schedules", JSON.stringify([schedule]));
    });

    it("enters edit mode when a schedule row is clicked", async () => {
      renderWithProvider();
      // Wait for the schedule to appear
      const row = await screen.findByTestId("schedule-item-123");
      fireEvent.click(row);
      // The edit form should appear (look for Save button)
      expect(await screen.findByTestId("header-save-button")).toBeInTheDocument();
      // The name field should be pre-filled
      expect(screen.getByDisplayValue("My Schedule")).toBeInTheDocument();
    });

    it("enters edit mode when Edit button is clicked, and does not double-trigger", async () => {
      renderWithProvider();
      const editButton = await screen.findByTestId("edit-schedule-button");
      fireEvent.click(editButton);
      expect(await screen.findByTestId("header-save-button")).toBeInTheDocument();
      expect(screen.getByDisplayValue("My Schedule")).toBeInTheDocument();
    });

    it("does not enter edit mode when Delete button is clicked", async () => {
      renderWithProvider();
      const deleteButton = await screen.findByTestId("delete-schedule-button");
      fireEvent.click(deleteButton);
      // The confirmation dialog should appear, but not the edit form
      expect(await screen.findByText(/Delete Schedule/i)).toBeInTheDocument();
      expect(screen.queryByTestId("header-save-button")).not.toBeInTheDocument();
    });

    it("does not enter edit mode when Active/Inactive button is clicked", async () => {
      renderWithProvider();
      // The Active/Inactive button is the first button in the row, with text "Active" or "Inactive"
      const activeButton = await screen.findByLabelText(/Activate schedule|Deactivate schedule/);
      fireEvent.click(activeButton);
      // The edit form should NOT appear
      expect(screen.queryByTestId("header-save-button")).not.toBeInTheDocument();
    });
  });
});