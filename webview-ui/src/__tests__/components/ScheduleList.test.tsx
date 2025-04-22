import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ScheduleList from "../../components/scheduler/ScheduleList";
import { Schedule } from "../../components/scheduler/types";

const schedules: Schedule[] = [
  {
    id: "1",
    name: "Morning Routine",
    mode: "focus",
    modeDisplayName: "Focus",
    taskInstructions: "Do morning tasks",
    scheduleType: "time",
    timeInterval: "1",
    timeUnit: "day",
    selectedDays: { monday: true, tuesday: false },
    startDate: "2025-04-22",
    startHour: "08",
    startMinute: "00",
    expirationDate: "2025-05-01",
    expirationHour: "09",
    expirationMinute: "00",
    requireActivity: false,
    taskInteraction: "wait",
    inactivityDelay: "0",
    lastExecutionTime: "2025-04-21T08:00:00.000Z",
    lastSkippedTime: undefined,
    lastTaskId: "task-1",
    nextExecutionTime: "2025-04-22T08:00:00.000Z",
    createdAt: "2025-04-01T08:00:00.000Z",
    updatedAt: "2025-04-15T08:00:00.000Z",
    active: true,
  },
  {
    id: "2",
    name: "Evening Review",
    mode: "review",
    modeDisplayName: "Review",
    taskInstructions: "Reflect on the day",
    scheduleType: "time",
    timeInterval: "1",
    timeUnit: "day",
    selectedDays: { friday: true },
    startDate: "2025-04-22",
    startHour: "20",
    startMinute: "00",
    expirationDate: "2025-05-01",
    expirationHour: "21",
    expirationMinute: "00",
    requireActivity: false,
    taskInteraction: "wait",
    inactivityDelay: "0",
    lastExecutionTime: undefined,
    lastSkippedTime: undefined,
    lastTaskId: undefined,
    nextExecutionTime: undefined,
    createdAt: "2025-04-01T20:00:00.000Z",
    updatedAt: "2025-04-15T20:00:00.000Z",
    active: false,
  },
];

const formatDate = (dateString: string) => "formatted:" + dateString;

describe("ScheduleList", () => {
  it("renders schedule items", () => {
    render(
      <ScheduleList
        schedules={schedules}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onToggleActive={jest.fn()}
        onResumeTask={jest.fn()}
        formatDate={formatDate}
      />
    );
    expect(screen.getByText("Morning Routine")).toBeInTheDocument();
    expect(screen.getByText("Evening Review")).toBeInTheDocument();
  });

  it("calls onEdit when item is clicked", () => {
    const onEdit = jest.fn();
    render(
      <ScheduleList
        schedules={schedules}
        onEdit={onEdit}
        onDelete={jest.fn()}
        onToggleActive={jest.fn()}
        onResumeTask={jest.fn()}
        formatDate={formatDate}
      />
    );
    fireEvent.click(screen.getByText("Morning Routine"));
    expect(onEdit).toHaveBeenCalledWith("1");
  });

  it("calls onDelete when delete button is clicked", () => {
    const onDelete = jest.fn();
    render(
      <ScheduleList
        schedules={schedules}
        onEdit={jest.fn()}
        onDelete={onDelete}
        onToggleActive={jest.fn()}
        onResumeTask={jest.fn()}
        formatDate={formatDate}
      />
    );
    const deleteButtons = screen.getAllByLabelText("Delete schedule");
    fireEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith("1");
  });

  it("calls onToggleActive when active button is clicked", () => {
    const onToggleActive = jest.fn();
    render(
      <ScheduleList
        schedules={schedules}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onToggleActive={onToggleActive}
        onResumeTask={jest.fn()}
        formatDate={formatDate}
      />
    );
    const activeButtons = screen.getAllByLabelText(/Activate schedule|Deactivate schedule/);
    fireEvent.click(activeButtons[0]);
    expect(onToggleActive).toHaveBeenCalledWith("1", false);
    fireEvent.click(activeButtons[1]);
    expect(onToggleActive).toHaveBeenCalledWith("2", true);
  });

  it("calls onResumeTask when last execution time button is clicked", () => {
    const onResumeTask = jest.fn();
    render(
      <ScheduleList
        schedules={schedules}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onToggleActive={jest.fn()}
        onResumeTask={onResumeTask}
        formatDate={formatDate}
      />
    );
    // The button is rendered only for the first schedule (has lastTaskId and lastExecutionTime)
    const resumeButton = screen.getByTitle("Click to view/resume this task in Roo Code");
    fireEvent.click(resumeButton);
    expect(onResumeTask).toHaveBeenCalledWith("task-1");
  });
});