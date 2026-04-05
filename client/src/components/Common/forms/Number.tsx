import React from "react";
import {
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  InputElementProps,
  InputGroup,
  InputLeftAddon,
  InputLeftElement,
  InputRightAddon,
  InputRightElement,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputProps,
  NumberInputStepper,
} from "@chakra-ui/react";
import { StringOrNumber } from "@chakra-ui/utils";

export interface INumber extends NumberInputProps {
  format?: (val?: StringOrNumber) => string;
  parse?: (val: string) => string;
  allowMouseWheel?: boolean;
  stepper?: boolean;
  label?: string;
  errorMessage?: string;
  helperText?: string;
  inputLeftAddon?: React.ReactNode;
  inputRightAddon?: React.ReactNode;
  inputLeftElement?: React.ReactNode;
  inputRightElement?: React.ReactNode;
  inputRightElementProps?: InputElementProps;
}

const NumberForm = ({
  stepper = true,
  allowMouseWheel = true,
  min = 0,
  format,
  parse,
  onChange,
  value,
  label,
  errorMessage,
  helperText,
  inputLeftAddon,
  inputLeftElement,
  inputRightAddon,
  inputRightElement,
  inputRightElementProps,
  ...props
}: INumber) => {
  const [numberString, setNumberString] = React.useState(value);

  const stepperJSX = React.useMemo(() => {
    if (stepper) {
      return (
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      );
    } else return null;
  }, [stepper]);

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
        {inputLeftAddon && (
          <InputLeftAddon>{inputLeftAddon}</InputLeftAddon>
        )}
        <NumberInput
          {...props}
          allowMouseWheel={allowMouseWheel}
          min={min}
          w="100%"
          value={
            format ? format(numberString?.toString()) : numberString?.toString()
          }
          onInvalid={() => {
            return;
          }}
          onChange={(val, num) => {
            setNumberString(val);
            if (onChange)
              if (parse) onChange(parse(val), num);
              else onChange(val, num);
          }}
        >
          <NumberInputField backgroundColor="white" />
          {stepperJSX}
        </NumberInput>
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
};

export default NumberForm;
