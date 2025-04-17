import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
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

  it("renders the active/inactive toggle button with fixed width in both states", () => {
    const onEdit = jest.fn()
    const onDelete = jest.fn()
    const onToggleActive = jest.fn()

    // Active state
    render(
      <ScheduleListItem
        schedule={{ ...mockSchedule, active: true }}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleActive={onToggleActive}
      />
    )
    let toggleButton = screen.getByRole("button", { name: /deactivate schedule/i })
    expect(toggleButton).toHaveClass("w-20")

    // Inactive state
    render(
      <ScheduleListItem
        schedule={{ ...mockSchedule, active: false }}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleActive={onToggleActive}
      />
    )
    toggleButton = screen.getByRole("button", { name: /activate schedule/i })
    expect(toggleButton).toHaveClass("w-20")
  })
})