import { Button, ButtonProps } from "@chakra-ui/react";

const SubmitButton = ({ children, ...props }: ButtonProps) => {
  return (
    <Button type="submit" w="100%" mt={4} border="1px solid black" {...props}>
      {children || "Submit"}
    </Button>
  );
};

export default SubmitButton;
