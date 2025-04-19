import React from "react"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import ScheduleListItem from "../components/scheduler/ScheduleListItem"
import { Schedule } from "../components/scheduler/types"

const mockSchedule: Schedule = {
  id: "1",
  name: "Test Schedule",
  mode: "auto",
  modeDisplayName: "Automatic",
  scheduleType: "time",
  timeInterval: "5",
  timeUnit: "minute",
  selectedDays: { monday: true, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false },
  taskInstructions: "Do something important.",
  taskInteraction: "wait",
  createdAt: "2023-01-01T00:00:00.000Z",
  updatedAt: "2023-01-01T00:00:00.000Z",
}

describe("ScheduleListItem", () => {
  it("opens and confirms the delete dialog", () => {
    const onEdit = jest.fn()
    const onDelete = jest.fn()

    const onToggleActive = jest.fn()
    render(
      <ScheduleListItem
        schedule={mockSchedule}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleActive={onToggleActive}
      />
    )

    // Click the delete button (trash icon)
    const deleteButton = screen.getByLabelText(/delete schedule/i)
    fireEvent.click(deleteButton)

    // Dialog should appear
    expect(screen.getByText(/delete schedule/i)).toBeInTheDocument()
    expect(screen.getByText(/are you sure you want to delete this schedule/i)).toBeInTheDocument()

    // Click the Delete action in the dialog
    const confirmButton = screen.getByRole("button", { name: /^delete$/i })
    fireEvent.click(confirmButton)

    // onDelete should be called with the schedule id
    expect(onDelete).toHaveBeenCalledWith("1")
  })

  it("cancels the delete dialog", () => {
    const onEdit = jest.fn()
    const onDelete = jest.fn()

    const onToggleActive = jest.fn()
    render(
      <ScheduleListItem
        schedule={mockSchedule}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleActive={onToggleActive}
      />
    )

    // Open dialog
    const deleteButton = screen.getByLabelText(/delete schedule/i)
    fireEvent.click(deleteButton)

    // Click Cancel
    const cancelButton = screen.getByRole("button", { name: /cancel/i })
    fireEvent.click(cancelButton)

    // onDelete should not be called
    expect(onDelete).not.toHaveBeenCalled()
  })

  it("renders the active toggle button with fixed width", () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const onToggleActive = jest.fn();
    render(
      <ScheduleListItem
        schedule={{ ...mockSchedule, active: true }}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleActive={onToggleActive}
      />
    );
    const toggleButton = screen.getByRole("button", { name: /deactivate schedule/i });
    expect(toggleButton).toHaveClass("w-20");
  });

  it("renders the inactive toggle button with fixed width", () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const onToggleActive = jest.fn();
    render(
      <ScheduleListItem
        schedule={{ ...mockSchedule, active: false }}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleActive={onToggleActive}
      />
    );
    const toggleButton = screen.getByRole("button", { name: /activate schedule/i });
    expect(toggleButton).toHaveClass("w-20");
  });
it("renders the last execution time if present", () => {
  const onEdit = jest.fn();
  const onDelete = jest.fn();
  const onToggleActive = jest.fn();
  const lastExecutionTime = "2023-04-16T20:30:00.000Z";
  render(
    <ScheduleListItem
      schedule={{ ...mockSchedule, lastExecutionTime }}
      onEdit={onEdit}
      onDelete={onDelete}
      onToggleActive={onToggleActive}
    />
  );
  // The formatted date string should appear
  const formatted = new Date(lastExecutionTime).toLocaleString();
  expect(screen.getByText(new RegExp(`Last executed: ${formatted}`))).toBeInTheDocument();
});

it("displays the taskInteraction value in the card description", () => {
  const onEdit = jest.fn();
  const onDelete = jest.fn();
  const onToggleActive = jest.fn();
  
  // Test with "wait" value
  render(
    <ScheduleListItem
      schedule={{ ...mockSchedule, taskInteraction: "wait" }}
      onEdit={onEdit}
      onDelete={onDelete}
      onToggleActive={onToggleActive}
    />
  );
  expect(screen.getByText(/Task Interaction: Run after inactivity/i)).toBeInTheDocument();
  
  // Cleanup
  cleanup();
  
  // Test with "interrupt" value
  render(
    <ScheduleListItem
      schedule={{ ...mockSchedule, taskInteraction: "interrupt" }}
      onEdit={onEdit}
      onDelete={onDelete}
      onToggleActive={onToggleActive}
    />
  );
  expect(screen.getByText(/Task Interaction: Interrupt/i)).toBeInTheDocument();
  
  // Cleanup
  cleanup();
  
  // Test with "skip" value
  render(
    <ScheduleListItem
      schedule={{ ...mockSchedule, taskInteraction: "skip" }}
      onEdit={onEdit}
      onDelete={onDelete}
      onToggleActive={onToggleActive}
    />
  );
  expect(screen.getByText(/Task Interaction: Skip/i)).toBeInTheDocument();
});

})