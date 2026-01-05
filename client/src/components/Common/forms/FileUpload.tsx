import { SimpleGrid } from "@chakra-ui/react";
import React from "react";
import SubmitButton from "./SubmitButton";

import TextField, { ITextField } from "./TextField";

export interface IFileUploadFile {
  buffer: string;
  contentType: string;
  description?: string;
}

interface IFileUpload extends ITextField {
  isLoading?: boolean;
  handleSubmit: (file: IFileUploadFile) => void;
}

const FileUpload = ({ handleSubmit, isLoading, ...props }: IFileUpload) => {
  /**
   * ----- Hook Initialization
   */

  const [description, setDescription] = React.useState("");

  const [file, setFile] = React.useState<{
    buffer: string;
    contentType: string;
  }>();

  const [fileError, setFileError] = React.useState<string>();

  /**
   * ----- Functions -----
   */

  const changeHandler = React.useCallback((files: FileList | null) => {
    if (files && files[0]) {
      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target && event.target.result) {
          setFileError(undefined);
          setFile({
            buffer: event.target.result.toString(),
            contentType: files[0].type,
          });
          if (!description) setDescription(files[0].name.split(".")[0]);
        }
      };

      reader.onerror = (error) => {
        // eslint-disable-next-line no-console
        console.warn("File Reader Error:", error);
      };

      reader.readAsDataURL(files[0]);
    }
  }, [description]);

  console.log("Desc:", description);

  const submitHandler = React.useCallback(() => {
    if (!file?.buffer || !file.contentType) {
      setFileError("please provide a file");
      return;
    }

    handleSubmit({
      description,
      ...file,
    });
  }, [description, file, handleSubmit]);

  /**
   * ----- Rendering -----
   */

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submitHandler();
      }}
    >
      <SimpleGrid columns={[1, 1, 2]} spacing={2}>
        <TextField
          pt={1}
          label="File"
          {...props}
          type="file"
          onChange={(e) => changeHandler(e.target.files)}
          errorMessage={fileError}
          isDisabled={isLoading}
        />
        <TextField
          {...props}
          isDisabled={isLoading}
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </SimpleGrid>
      <SubmitButton isLoading={isLoading} />
    </form>
  );
};

export default FileUpload;
