import React from "react";
import { Input } from "../../components/ui/input";

const LabeledInput = ({ label, ...props }: { label: string } & React.ComponentProps<typeof Input>) => (
  <div className="flex flex-col gap-2">
    <label className="text-vscode-descriptionForeground text-sm">{label}</label>
    <Input {...props} />
  </div>
);

export default LabeledInput;