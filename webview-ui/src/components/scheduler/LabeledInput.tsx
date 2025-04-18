import React from "react";
import { Input } from "../../components/ui/input";

const LabeledInput = ({
  label,
  required,
  ...props
}: { label: string; required?: boolean } & React.ComponentProps<typeof Input>) => (
  <div className="flex flex-col gap-2">
    <label className="text-vscode-descriptionForeground text-sm">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <Input {...props} />
  </div>
);

export default LabeledInput;