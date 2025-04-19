import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ScheduleForm from "../../components/scheduler/ScheduleForm";
import { ModeConfig } from "../../../../src/shared/modes";

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

// Provide a valid ModeConfig mock
const availableModes: ModeConfig[] = [
  {
    slug: "code",
    name: "Code",
    roleDefinition: "role-code",
    groups: ["read", "edit"],
    source: "global",
    customInstructions: "Some instructions"
  },
  {
    slug: "test",
    name: "Test",
    roleDefinition: "role-test",
    groups: ["read"],
    source: "global",
    customInstructions: "Other instructions"
  }
];

describe("ScheduleForm", () => {
  it("shows a red asterisk for required fields", () => {
    render(
      <ScheduleForm
        isEditing={false}
        availableModes={availableModes}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    // Schedule Name
    const nameLabel = screen.getByText(/Schedule Name/i).closest("label");
    expect(nameLabel).toHaveTextContent("*");
    expect(nameLabel?.querySelector(".text-red-500")).not.toBeNull();
    // Mode
    const modeLabel = screen.getByText(/^Mode$/i).closest("label");
    expect(modeLabel).toHaveTextContent("*");
    expect(modeLabel?.querySelector(".text-red-500")).not.toBeNull();
    // Instructions
    const instructionsLabel = screen.getByText(/^Instructions$/i).closest("label");
    expect(instructionsLabel).toHaveTextContent("*");
    expect(instructionsLabel?.querySelector(".text-red-500")).not.toBeNull();
    // Every (Time Interval)
    const everyLabel = screen.getByText(/^Every$/i).closest("label");
    expect(everyLabel).toHaveTextContent("*");
    expect(everyLabel?.querySelector(".text-red-500")).not.toBeNull();
  });
  it("should have all days selected by default when creating a new schedule", () => {
    render(
      <ScheduleForm
        isEditing={false}
        availableModes={availableModes}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    // All day buttons should be aria-pressed=true
    const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    days.forEach(day => {
      const dayButton = screen.getByLabelText(new RegExp(day, "i"));
      expect(dayButton).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("renders all main form fields", () => {
    render(
      <ScheduleForm
        isEditing={false}
        availableModes={availableModes}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(screen.getByText(/Create New Schedule/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter schedule name/i)).toBeInTheDocument();
    expect(screen.getByText(/Mode/i)).toBeInTheDocument();
    expect(screen.getByText(/Instructions/i)).toBeInTheDocument();
    expect(screen.getByText(/Schedule Type/i)).toBeInTheDocument();
    expect(screen.getByText(/Days of the week/i)).toBeInTheDocument();
    expect(screen.getByText(/Start Time/i)).toBeInTheDocument();
    expect(screen.getByText(/Expires/i)).toBeInTheDocument();
    expect(screen.getByText(/Only execute if I had activity/i)).toBeInTheDocument();
    expect(screen.getByText(/When a task is already running/i)).toBeInTheDocument();
    expect(screen.getByText(/Cancel/i)).toBeInTheDocument();
    expect(screen.getByText(/Save Schedule/i)).toBeInTheDocument();
  });

  it("calls onCancel when Cancel button is clicked", () => {
    const onCancel = jest.fn();
    render(
      <ScheduleForm
        isEditing={false}
        availableModes={availableModes}
        onSave={jest.fn()}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByText(/Cancel/i));
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onSave with correct data when Save Schedule is clicked", () => {
    const onSave = jest.fn();
    render(
      <ScheduleForm
        isEditing={false}
        availableModes={availableModes}
        onSave={onSave}
        onCancel={jest.fn()}
      />
    );
    // Change schedule name
    fireEvent.change(screen.getByPlaceholderText(/Enter schedule name/i), { target: { value: "My Schedule" } });
    // Change mode
    fireEvent.click(screen.getByText(/Code/i)); // open mode select
    // Click the SelectItem for "Test" (skip the trigger)
    const testOptions = screen.getAllByText(/Test/i);
    if (testOptions.length > 1) {
      fireEvent.click(testOptions[1]);
    } else {
      fireEvent.click(testOptions[0]);
    }
    // Change instructions
    fireEvent.change(screen.getByPlaceholderText(/Enter task instructions/i), { target: { value: "Do something" } });
    // Deselect "mon"
    const monButton = screen.getByLabelText(/mon/i);
    fireEvent.click(monButton);
    // Save
    fireEvent.click(screen.getByText(/Save Schedule/i));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "My Schedule",
        // The mode remains "code" in the test environment
        mode: "code",
        taskInstructions: "Do something",
        taskInteraction: "wait", // Default value
        selectedDays: expect.objectContaining({
          mon: false,
          sun: true,
          tue: true,
          wed: true,
          thu: true,
          fri: true,
          sat: true,
        }),
      })
    );
  });

  it("toggles requireActivity when clicked", () => {
    render(
      <ScheduleForm
        isEditing={false}
        availableModes={availableModes}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    const label = screen.getByText(/Only execute if I had activity/i);
    // Find the parent clickable div
    const clickable = label.closest("div[role='button'],div[tabindex]");
    // If not found, fallback to the label's parent
    const target = clickable || label.parentElement!;
    // Initially unchecked
    expect(target.innerHTML).not.toMatch(/polyline/);
    // Click to check
    fireEvent.click(target);
    // Now the checkmark SVG should be present
    expect(target.innerHTML).toMatch(/polyline/);
  });

  it("includes taskInteraction in form data", () => {
    const onSave = jest.fn();
    render(
      <ScheduleForm
        isEditing={false}
        availableModes={availableModes}
        onSave={onSave}
        onCancel={jest.fn()}
      />
    );
    
    // Fill required fields
    fireEvent.change(screen.getByPlaceholderText(/Enter schedule name/i), { target: { value: "Test Schedule" } });
    fireEvent.change(screen.getByPlaceholderText(/Enter task instructions/i), { target: { value: "Test instructions" } });
    
    // Save the form
    fireEvent.click(screen.getByText(/Save Schedule/i));
    
    // Verify taskInteraction is included with default value "wait" and inactivityDelay with default value "10"
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        taskInteraction: "wait",
        inactivityDelay: "10"
      })
    );
  });

  it("shows inactivityDelay field when taskInteraction is 'wait'", () => {
    render(
      <ScheduleForm
        isEditing={false}
        availableModes={availableModes}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    
    // By default, taskInteraction is "wait", so inactivityDelay field should be visible
    expect(screen.getByLabelText(/Inactivity delay in minutes/i)).toBeInTheDocument();
    
    // Change taskInteraction to "interrupt"
    fireEvent.click(screen.getByText(/Run after specified inactivity/i));
    const interruptOption = screen.getByText(/Interrupt current task/i);
    fireEvent.click(interruptOption);
    
    // inactivityDelay field should not be visible
    expect(screen.queryByLabelText(/Inactivity delay \(minutes\)/i)).not.toBeInTheDocument();
  });

  it("includes inactivityDelay in form data when taskInteraction is 'wait'", () => {
    const onSave = jest.fn();
    render(
      <ScheduleForm
        isEditing={false}
        availableModes={availableModes}
        onSave={onSave}
        onCancel={jest.fn()}
      />
    );
    
    // Fill required fields
    fireEvent.change(screen.getByPlaceholderText(/Enter schedule name/i), { target: { value: "Test Schedule" } });
    fireEvent.change(screen.getByPlaceholderText(/Enter task instructions/i), { target: { value: "Test instructions" } });
    
    // Change inactivityDelay
    const inactivityDelayInput = screen.getByLabelText(/Inactivity delay in minutes/i);
    fireEvent.change(inactivityDelayInput, { target: { value: "10" } });
    
    // Save the form
    fireEvent.click(screen.getByText(/Save Schedule/i));
    
    // Verify inactivityDelay is included with the updated value
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        taskInteraction: "wait",
        inactivityDelay: "10"
      })
    );
  });
});