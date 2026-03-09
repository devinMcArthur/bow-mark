import {
  Box,
  Divider,
  Flex,
  Heading,
  IconButton,
  SimpleGrid,
  Text,
  useToast,
} from "@chakra-ui/react";
import React from "react";
import { FiEdit, FiPlus, FiX } from "react-icons/fi";
import { useReportNotesUpdateForm } from "../../../../../forms/reportNote";

import {
  DailyReportFullDocument,
  DailyReportFullSnippetFragment,
  DailyReportNoteUpdateData,
  useDailyReportAddNoteFileMutation,
  useDailyReportNoteUpdateMutation,
  useReportNoteRemoveFileMutation,
  UserRoles,
} from "../../../../../generated/graphql";
import dataUrlToBlob from "../../../../../utils/dataUrlToBlob";
import Card from "../../../../Common/Card";
import FileDisplay from "../../../../Common/FileDisplay";
import FormContainer from "../../../../Common/FormContainer";
import FileUpload, {
  IFileUploadFile,
} from "../../../../Common/forms/FileUpload";
import SubmitButton from "../../../../Common/forms/SubmitButton";
import Permission from "../../../../Common/Permission";

interface IReportNotes {
  dailyReport: DailyReportFullSnippetFragment;
  editPermission?: boolean;
}

const ReportNotes = ({ dailyReport, editPermission }: IReportNotes) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [collapsed, setCollapsed] = React.useState(false);

  const [editNotes, setEditNotes] = React.useState(false);

  const [fileView, setFileView] = React.useState(false);

  const [fileForm, setFileForm] = React.useState(false);

  const { FormComponents } = useReportNotesUpdateForm({
    defaultValues: {
      note: dailyReport.reportNote?.note || "",
    },
  });

  const [update, { loading }] = useDailyReportNoteUpdateMutation();

  const [uploadFile, { loading: fileLoading }] =
    useDailyReportAddNoteFileMutation();

  const [removeFile, { loading: removeFileLoading }] =
    useReportNoteRemoveFileMutation({
      refetchQueries: [DailyReportFullDocument],
    });

  /**
   * ----- Functions -----
   */

  const submitUpdate = React.useCallback(
    (data: DailyReportNoteUpdateData) => {
      update({
        variables: {
          id: dailyReport._id,
          data,
        },
      });
    },
    [dailyReport._id, update]
  );

  const submitFile = React.useCallback(
    async (data: IFileUploadFile) => {
      try {
        await uploadFile({
          variables: {
            dailyReportId: dailyReport._id,
            data: {
              description: data.description,
              file: new File(
                [dataUrlToBlob(data.buffer)],
                `${Math.random() * 1000000}`,
                {
                  type: data.contentType,
                }
              ),
            },
          },
        });
        setFileForm(false);
        setFileView(true);
      } catch (e: any) {
        toast({
          title: "Error",
          description: e.message,
          isClosable: true,
          status: "error",
        });
      }
    },
    [dailyReport._id, toast, uploadFile]
  );

  /**
   * ----- Rendering -----
   */

  return (
    <Card>
      <Flex flexDir="row" justifyContent="space-between">
        <Heading
          ml={2}
          size="md"
          my="auto"
          w="100%"
          cursor="pointer"
          onClick={() => setCollapsed(!collapsed)}
        >
          Notes
        </Heading>
        <Permission otherCriteria={editPermission} minRole={UserRoles.User}>
          <IconButton
            aria-label="edit"
            onClick={() => setEditNotes(!editNotes)}
            icon={editNotes ? <FiX /> : <FiEdit />}
            backgroundColor="transparent"
          />
        </Permission>
      </Flex>
      {editNotes && (
        <FormContainer>
          <FormComponents.Form submitHandler={submitUpdate}>
            <FormComponents.Note isLoading={loading} />
            <SubmitButton isLoading={loading} />
          </FormComponents.Form>
        </FormContainer>
      )}
      {!collapsed && (
        <Box ml={2} py={2} px={4} borderLeft="2px solid gray" borderRadius={4}>
          {/* NOTES */}
          <Text whiteSpace="pre-wrap">{dailyReport.reportNote?.note}</Text>
          <Divider my={2} />
          {/* FILES */}
          <Flex flexDir="row" justifyContent="space-between">
            <Heading
              size="sm"
              cursor="pointer"
              onClick={() => setFileView(!fileView)}
              w="100%"
            >
              Files ({dailyReport.reportNote?.files.length || 0})
            </Heading>
            <Permission otherCriteria={editPermission} minRole={UserRoles.User}>
              <IconButton
                aria-label="add-file"
                onClick={() => setFileForm(!fileForm)}
                icon={fileForm ? <FiX /> : <FiPlus />}
                backgroundColor="transparent"
                size="sm"
              />
            </Permission>
          </Flex>
          {fileForm && (
            <FormContainer>
              <FileUpload isLoading={fileLoading} handleSubmit={submitFile} />
            </FormContainer>
          )}
          {fileView && (
            <SimpleGrid columns={[1, 1, 2]}>
              {dailyReport.reportNote?.files.map((file) => (
                <FileDisplay
                  key={file._id}
                  file={file}
                  removeLoading={removeFileLoading}
                  onRemove={(file) =>
                    removeFile({
                      variables: {
                        fileId: file._id,
                        reportNoteId: dailyReport.reportNote!._id,
                      },
                    })
                  }
                />
              ))}
            </SimpleGrid>
          )}
        </Box>
      )}
    </Card>
  );
};

export default ReportNotes;
