import React from "react";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  label?: React.ReactNode;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  className = "",
  label,
  id,
  disabled = false,
  "aria-label": ariaLabel,
}) => {
  // Handler: only check if currently unchecked
  const handleLabelClick = (e: React.MouseEvent<HTMLLabelElement>) => {
    if (disabled) return;
    // Only toggle if currently unchecked
    if (!checked) {
      onChange(true);
    }
  };

  // Handler for checkbox span (keyboard and mouse)
  const handleCheckboxClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (disabled) return;
    onChange(!checked);
    // Prevent label's onClick from firing
    e.stopPropagation();
  };

  const handleCheckboxKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (disabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <label
      className={`flex items-center cursor-pointer select-none ${className} ${disabled ? "opacity-60 pointer-events-none" : ""}`}
      htmlFor={id}
      onClick={handleLabelClick}
    >
      <span
        className={`w-4 h-4 min-w-4 min-h-4 flex-shrink-0 border rounded-xs flex items-center justify-center mr-2 transition-colors
          ${checked
            ? "bg-vscode-button-background border-vscode-button-background"
            : "border-vscode-input-border bg-transparent"
          }
        `}
        tabIndex={0}
        role="checkbox"
        aria-checked={checked}
        aria-label={ariaLabel}
        id={id}
        onClick={handleCheckboxClick}
        onKeyDown={handleCheckboxKeyDown}
        style={{ outline: "none" }}
      >
        {checked && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-vscode-button-foreground"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        )}
      </span>
      {label && (
        <span className="text-vscode-descriptionForeground text-sm cursor-pointer">{label}</span>
      )}
    </label>
  );
};

export default Checkbox;