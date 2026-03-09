import {
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Select as S,
  SelectProps,
} from "@chakra-ui/react";
import React from "react";

export interface ISelect extends SelectProps {
  options: { value: string; title: string }[];
  error?: boolean;
  errorMessage?: string;
  helperText?: string | JSX.Element;
  label?: string;
  name?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  placeholder?: string;
}

const Select = React.forwardRef<HTMLSelectElement, ISelect>(
  ({ options, errorMessage, helperText, label, error, ...rest }, ref) => {
    return (
      <FormControl
        id={rest.name}
        isRequired={rest.isRequired}
        isDisabled={rest.isDisabled}
        isInvalid={!!errorMessage}
        isReadOnly={rest.isReadOnly}
      >
        {label && (
          <FormLabel fontWeight="bold" mb={0} mt={1} ml={1}>
            {label}
          </FormLabel>
        )}
        <S ref={ref} backgroundColor="white" {...rest}>
          {options.map((option, index) => (
            <option key={index} value={option.value}>
              {option.title}
            </option>
          ))}
        </S>
        {errorMessage && <FormErrorMessage>{errorMessage}</FormErrorMessage>}
        {helperText && <FormHelperText>{helperText}</FormHelperText>}
      </FormControl>
    );
  }
);

Select.displayName = "Select";

export default Select;
