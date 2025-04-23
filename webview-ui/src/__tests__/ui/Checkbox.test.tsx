import React from "react";
import { render, fireEvent } from "@testing-library/react";
import Checkbox from "../../components/ui/checkbox";

describe("Checkbox", () => {
  it("renders unchecked and toggles on click", () => {
    const handleChange = jest.fn();
    const { getByRole } = render(
      <Checkbox checked={false} onChange={handleChange} label="Test Checkbox" />
    );
    const checkbox = getByRole("checkbox");
    expect(checkbox).toHaveAttribute("aria-checked", "false");
    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it("renders checked and toggles off on click", () => {
    const handleChange = jest.fn();
    const { getByRole } = render(
      <Checkbox checked={true} onChange={handleChange} label="Test Checkbox" />
    );
    const checkbox = getByRole("checkbox");
    expect(checkbox).toHaveAttribute("aria-checked", "true");
    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it("checks the box when clicking the label if unchecked", () => {
    const handleChange = jest.fn();
    const { getByText } = render(
      <Checkbox checked={false} onChange={handleChange} label="Test Checkbox" />
    );
    const label = getByText("Test Checkbox");
    fireEvent.click(label);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it("does not uncheck the box when clicking the label if already checked", () => {
    const handleChange = jest.fn();
    const { getByText } = render(
      <Checkbox checked={true} onChange={handleChange} label="Test Checkbox" />
    );
    const label = getByText("Test Checkbox");
    fireEvent.click(label);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it("calls onChange on space/enter keydown", () => {
    const handleChange = jest.fn();
    const { getByRole } = render(
      <Checkbox checked={false} onChange={handleChange} label="Test Checkbox" />
    );
    const checkbox = getByRole("checkbox");
    fireEvent.keyDown(checkbox, { key: " " });
    expect(handleChange).toHaveBeenCalledWith(true);
    fireEvent.keyDown(checkbox, { key: "Enter" });
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it("does not call onChange when disabled", () => {
    const handleChange = jest.fn();
    const { getByRole } = render(
      <Checkbox checked={false} onChange={handleChange} label="Test Checkbox" disabled />
    );
    const checkbox = getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(handleChange).not.toHaveBeenCalled();
    fireEvent.keyDown(checkbox, { key: " " });
    expect(handleChange).not.toHaveBeenCalled();
  });
});