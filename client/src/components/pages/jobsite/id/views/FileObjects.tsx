import {
  Box,
  Center,
  Flex,
  Heading,
  IconButton,
  SimpleGrid,
  useToast,
} from "@chakra-ui/react";
import React from "react";
import { FiPlus, FiX } from "react-icons/fi";
import {
  JobsiteFullSnippetFragment,
  useJobsiteRemoveFileObjectMutation,
  UserRoles,
} from "../../../../../generated/graphql";
import Card from "../../../../Common/Card";
import FileDisplay from "../../../../Common/FileDisplay";
import Permission from "../../../../Common/Permission";
import JobsiteAddFileObject from "../../../../Forms/Jobsite/AddFileObject";

interface IJobsiteFileObjects {
  jobsite: JobsiteFullSnippetFragment;
}

const JobsiteFileObjects = ({ jobsite }: IJobsiteFileObjects) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [collapsed, setCollapsed] = React.useState(true);

  const [addForm, setAddForm] = React.useState(false);

  const [remove, { loading }] = useJobsiteRemoveFileObjectMutation();

  /**
   * ----- Functions -----
   */

  const removeHandler = React.useCallback(
    async (fileObjectId: string) => {
      try {
        const res = await remove({
          variables: {
            fileObjectId: fileObjectId,
            id: jobsite._id,
          },
        });

        if (res.data?.jobsiteRemoveFileObject) {
          // Success
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
    [jobsite._id, remove, toast]
  );

  /**
   * ----- Rendering -----
   */

  return (
    <Card>
      <Flex flexDir="row" justifyContent="space-between">
        <Heading
          my="auto"
          ml={2}
          size="md"
          w="100%"
          cursor="pointer"
          onClick={() => setCollapsed(!collapsed)}
        >
          Files ({jobsite.fileObjects.length})
        </Heading>
        <Permission minRole={UserRoles.ProjectManager}>
          <IconButton
            icon={addForm ? <FiX /> : <FiPlus />}
            aria-label="add"
            backgroundColor="transparent"
            onClick={() => setAddForm(!addForm)}
          />
        </Permission>
      </Flex>
      {addForm && (
        <JobsiteAddFileObject
          jobsite={jobsite}
          onSuccess={() => setAddForm(false)}
        />
      )}
      {jobsite.fileObjects.length > 0 ? (
        !collapsed && (
          <SimpleGrid columns={1} spacing={4}>
            {jobsite.fileObjects.map((fileObject) => (
              <Permission minRole={fileObject.minRole} key={fileObject._id}>
                <Box
                  backgroundColor="gray.200"
                  borderRadius={4}
                  w="90%"
                  p={2}
                  m="auto"
                >
                  <FileDisplay
                    file={fileObject.file}
                    onRemove={() => removeHandler(fileObject._id || "")}
                    removeLoading={loading}
                  />
                </Box>
              </Permission>
            ))}
          </SimpleGrid>
        )
      ) : (
        <Center>No Files</Center>
      )}
    </Card>
  );
};

export default JobsiteFileObjects;
