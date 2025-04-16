import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import ConfirmationDialog from "../ConfirmationDialog"

describe("ConfirmationDialog", () => {
  const title = "Test Title"
  const description = "Test description"
  const confirmLabel = "Yes, do it"
  const cancelLabel = "No, cancel"

  it("renders title and description", () => {
    render(
      <ConfirmationDialog
        open={true}
        onOpenChange={() => {}}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        onConfirm={() => {}}
      />
    )
    expect(screen.getByText(title)).toBeInTheDocument()
    expect(screen.getByText(description)).toBeInTheDocument()
    expect(screen.getByText(confirmLabel)).toBeInTheDocument()
    expect(screen.getByText(cancelLabel)).toBeInTheDocument()
  })

  it("calls onConfirm when confirm button is clicked", () => {
    const onConfirm = jest.fn()
    render(
      <ConfirmationDialog
        open={true}
        onOpenChange={() => {}}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        onConfirm={onConfirm}
      />
    )
    fireEvent.click(screen.getByText(confirmLabel))
    expect(onConfirm).toHaveBeenCalled()
  })

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = jest.fn()
    render(
      <ConfirmationDialog
        open={true}
        onOpenChange={() => {}}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    )
    fireEvent.click(screen.getByText(cancelLabel))
    expect(onCancel).toHaveBeenCalled()
  })

  it("disables buttons when loading or disabled", () => {
    render(
      <ConfirmationDialog
        open={true}
        onOpenChange={() => {}}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        onConfirm={() => {}}
        loading={true}
      />
    )
    expect(screen.getByText(confirmLabel)).toBeDisabled()
    expect(screen.getByText(cancelLabel)).toBeDisabled()
  })
})