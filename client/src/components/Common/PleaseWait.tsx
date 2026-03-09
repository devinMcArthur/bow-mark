import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertProps,
  AlertTitle,
} from "@chakra-ui/react";

const PleaseWait = ({ ...props }: AlertProps) => {
  return (
    <Alert status="warning" {...props}>
      <AlertIcon />
      <AlertTitle>Please Wait</AlertTitle>
      <AlertDescription>
        This may take a minute, please do not refresh or make any additional
        updates.
      </AlertDescription>
    </Alert>
  );
};

export default PleaseWait;
