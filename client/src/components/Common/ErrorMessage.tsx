import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertProps,
  AlertTitle,
} from "@chakra-ui/alert";
import React from "react";

interface IErrorMessage extends AlertProps {
  title?: string;
  description?: string | null;
}

const ErrorMessage = ({
  description = "Something went wrong, please contact support",
  title = "Error!",
  ...props
}: IErrorMessage) => {
  return (
    <Alert status="error" variant="left-accent" {...props}>
      <AlertIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
};

export default ErrorMessage;
