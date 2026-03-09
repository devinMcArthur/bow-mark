import React from "react";
import {
  Input,
  InputElementProps,
  InputGroup,
  InputLeftAddon,
  InputLeftElement,
  InputProps,
  InputRightAddon,
  InputRightElement,
} from "@chakra-ui/input";
import {
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
} from "@chakra-ui/form-control";
import dayjs from "dayjs";

export interface ITextField extends InputProps {
  label?: string;
  errorMessage?: React.ReactNode;
  helperText?: React.ReactNode;
  inputLeftAddon?: React.ReactNode;
  inputRightAddon?: React.ReactNode;
  inputLeftElement?: React.ReactNode;
  inputRightElement?: React.ReactNode;
  inputRightElementProps?: InputElementProps;
}

const TextField = React.forwardRef<HTMLInputElement, ITextField>(
  (
    {
      label,
      errorMessage,
      helperText,
      inputLeftAddon,
      inputLeftElement,
      inputRightAddon,
      inputRightElement,
      inputRightElementProps,
      ...props
    },
    ref
  ) => {
    let value = props.value;
    if (props.type === "date" && value) {
      value = dayjs(value.toString()).format("YYYY-MM-DD");
    } else if (
      props.type === "time" &&
      value &&
      new Date(value.toString()).toString() !== "Invalid Date"
    ) {
      value = dayjs(value.toString()).format("HH:mm");
    }

    return (
      <FormControl isInvalid={!!errorMessage} margin="auto">
        {label && (
          <FormLabel fontWeight="bold" mb={0} mt={1} ml={1}>
            {label}
          </FormLabel>
        )}
        <InputGroup>
          {inputLeftElement && (
            <InputLeftElement h="auto">{inputLeftElement}</InputLeftElement>
          )}
          {inputLeftAddon && <InputLeftAddon>{inputLeftAddon}</InputLeftAddon>}
          <Input ref={ref} backgroundColor="white" {...props} value={value} />
          {inputRightElement && (
            <InputRightElement {...inputRightElementProps}>
              {inputRightElement}
            </InputRightElement>
          )}
          {inputRightAddon && (
            <InputRightAddon>{inputRightAddon}</InputRightAddon>
          )}
        </InputGroup>
        {errorMessage && <FormErrorMessage>{errorMessage}</FormErrorMessage>}
        {helperText && <FormHelperText>{helperText}</FormHelperText>}
      </FormControl>
    );
  }
);

TextField.displayName = "TextField";

export default TextField;
