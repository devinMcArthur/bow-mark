import { useToast } from "@chakra-ui/react";
import React from "react";
import { useJobsiteAddFileObjectMutation } from "../../../generated/graphql";
import dataUrlToBlob from "../../../utils/dataUrlToBlob";
import FormContainer from "../../Common/FormContainer";
import FileUpload, { IFileUploadFile } from "../../Common/forms/FileUpload";

interface IJobsiteAddFileObject {
  jobsite: {
    _id: string;
  };
  onSuccess?: () => void;
}

const JobsiteAddFileObject = ({
  jobsite,
  onSuccess,
}: IJobsiteAddFileObject) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [addFile, { loading }] = useJobsiteAddFileObjectMutation();

  /**
   * ----- Functions -----
   */

  const submitHandler = React.useCallback(
    async (data: IFileUploadFile) => {
      try {
        const res = await addFile({
          variables: {
            id: jobsite._id,
            data: {
              file: {
                file: new File(
                  [dataUrlToBlob(data.buffer)],
                  `${Math.random() * 1000000}`,
                  {
                    type: data.contentType,
                  }
                ),
                description: data.description,
              },
            },
          },
        });

        if (res.data?.jobsiteAddFileObject) {
          if (onSuccess) onSuccess();
        } else {
          toast({
            title: "Error",
            description: "Something went wrong, please try again.",
            isClosable: true,
            status: "error",
          });
        }
      } catch (e: any) {
        toast({
          title: "Error",
          description: e.message,
          isClosable: true,
          status: "error",
        });
      }
    },
    [addFile, jobsite._id, onSuccess, toast]
  );

  /**
   * ----- Rendering -----
   */

  return (
    <FormContainer>
      <FileUpload handleSubmit={submitHandler} isLoading={loading} />
    </FormContainer>
  );
};

export default JobsiteAddFileObject;
