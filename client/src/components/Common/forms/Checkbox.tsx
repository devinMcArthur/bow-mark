import { Checkbox as Check, CheckboxProps } from "@chakra-ui/react";
import React from "react";

export interface ICheckbox extends CheckboxProps {}

// React.forwardRef is required here because this component is used inside
// react-hook-form <Controller> render props. Without it, RHF cannot attach
// its ref to the underlying DOM input, which produces a console warning:
// "Function components cannot be given refs".
const Checkbox = React.forwardRef<HTMLInputElement, ICheckbox>(
  ({ children, ...props }, ref) => {
    return (
      <Check ref={ref} {...props}>
        {children}
      </Check>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
