import { Checkbox as Check, CheckboxProps } from "@chakra-ui/react";

export interface ICheckbox extends CheckboxProps {}

const Checkbox = ({ children, ...props }: ICheckbox) => {
  return <Check {...props}>{children}</Check>;
};

export default Checkbox;
