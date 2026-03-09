import React from "react";
import {
  InputElementProps,
  InputGroup,
  InputLeftAddon,
  InputLeftElement,
  InputRightAddon,
  InputRightElement,
} from "@chakra-ui/input";
import {
  FormControl,
  FormErrorMessage,
  FormLabel,
} from "@chakra-ui/form-control";
import { Textarea, TextareaProps } from "@chakra-ui/react";

export interface ITextArea extends TextareaProps {
  label?: string;
  errorMessage?: string;
  inputLeftAddon?: React.ReactNode;
  inputRightAddon?: React.ReactNode;
  inputLeftElement?: React.ReactNode;
  inputRightElement?: React.ReactNode;
  inputRightElementProps?: InputElementProps;
}

const TextArea = React.forwardRef<HTMLTextAreaElement, ITextArea>(
  (
    {
      label,
      errorMessage,
      inputLeftAddon,
      inputLeftElement,
      inputRightAddon,
      inputRightElement,
      inputRightElementProps,
      ...props
    },
    ref
  ) => {
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
          <Textarea ref={ref} backgroundColor="white" {...props} />
          {inputRightElement && (
            <InputRightElement h="auto" py="auto" {...inputRightElementProps}>
              {inputRightElement}
            </InputRightElement>
          )}
          {inputRightAddon && (
            <InputRightAddon>{inputRightAddon}</InputRightAddon>
          )}
        </InputGroup>
        {errorMessage && <FormErrorMessage>{errorMessage}</FormErrorMessage>}
      </FormControl>
    );
  }
);

TextArea.displayName = "TextArea";

export default TextArea;
