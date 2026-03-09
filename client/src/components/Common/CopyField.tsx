import { Button, Flex, useClipboard } from "@chakra-ui/react";
import TextField from "./forms/TextField";

interface ICopyField {
  link: string;
  label?: string;
}

const CopyField = ({ link, label }: ICopyField) => {
  const { hasCopied, onCopy } = useClipboard(link);

  return (
    <Flex flexDir="row" my={2}>
      <TextField
        value={link}
        isReadOnly
        label={label}
        inputRightElement={
          <Button onClick={onCopy} size="sm">
            {hasCopied ? "Copied" : "Copy"}
          </Button>
        }
        inputRightElementProps={{ width: "auto" }}
      />
    </Flex>
  );
};

export default CopyField;
