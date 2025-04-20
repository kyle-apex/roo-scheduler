import React from "react";
import { render, fireEvent } from "@testing-library/react";
import Checkbox from "../../components/ui/Checkbox";

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