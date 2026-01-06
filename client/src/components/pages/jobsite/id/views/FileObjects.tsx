import {
  Box,
  Center,
  Flex,
  Heading,
  IconButton,
  useToast,
} from "@chakra-ui/react";
import React from "react";
import { FiPlus, FiTrash2, FiX } from "react-icons/fi";
import {
  JobsiteFileObjectPreloadSnippetFragment,
  JobsiteFullSnippetFragment,
  useJobsiteRemoveFileObjectMutation,
  UserRoles,
} from "../../../../../generated/graphql";
import Card from "../../../../Common/Card";
import Permission from "../../../../Common/Permission";
import JobsiteAddFileObject from "../../../../Forms/Jobsite/AddFileObject";
import { AllCommunityModule, ColDef, ModuleRegistry, RowClickedEvent, ValueFormatterParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useAuth } from "../../../../../contexts/Auth";
import hasPermission from "../../../../../utils/hasPermission";

ModuleRegistry.registerModules([AllCommunityModule]);

interface IJobsiteFileObjects {
  jobsite: Pick<JobsiteFullSnippetFragment, 'fileObjects' | '_id'>;
  hideAdd?: boolean;
}

const JobsiteFileObjects = ({ jobsite, hideAdd }: IJobsiteFileObjects) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const { state: { user }
  } = useAuth();

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

  const onRowClicked = React.useCallback((event: RowClickedEvent<JobsiteFileObjectPreloadSnippetFragment, any>) => {
    if (event.isEventHandlingSuppressed) return;
    if (event.data?.file && event.data.file.downloadUrl)
      window.open(event.data.file.downloadUrl, '_blank');
  }, []);


  /**
   * --- Variables ---
   */

  const filteredFileObjects = React.useMemo(() => {
    return jobsite.fileObjects.filter((fileObject) => {
      if (!user) return false;
      return hasPermission(user.role, fileObject.minRole);
    });
  }, [jobsite.fileObjects, user]);

  const getReadableFileType = (params: ValueFormatterParams) => {
    const mime = params.value as string;
    if (!mime) return "FILE";

    if (mime.includes("pdf")) return "PDF";
    if (mime.includes("sheet") || mime.includes("excel")) return "EXCEL";
    if (mime.includes("word") || mime.includes("document")) return "WORD";
    if (mime.includes("image")) return "IMAGE";
    if (mime.includes("zip") || mime.includes("compressed")) return "ZIP";

    // Fallback: take the second part (e.g., text/plain -> PLAIN)
    return mime.split("/")[1]?.toUpperCase() || "FILE";
  };

  const columnDefs: ColDef<JobsiteFileObjectPreloadSnippetFragment>[] = React.useMemo(() => [
    {
      field: "file.description",
      headerName: "Description",
    },
    {
      field: "file.mimetype",
      headerName: "Type",
      valueFormatter: getReadableFileType
    },
    {
      headerName: "", // Empty header for action column
      colId: "actions",
      resizable: false,
      sortable: false,
      filter: false,
      width: 40,
      supressSizeToFit: true,
      supressMouseEventHandling: true,
      cellRendererParams: {
        suppressMouseEventHandling: () => true
      },
      cellRenderer: (params: any) => (
        <Center
          h="100%"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton
            aria-label="Delete file"
            icon={<FiTrash2 />}
            size="sm"
            colorScheme="red"
            variant="ghost"
            isLoading={loading}
            onClick={() => {
              if (window.confirm("Are you sure you want to remove this file?"))
                removeHandler(params.data._id);
            }}
          />
        </Center>
      ),
    },
  ], [removeHandler, loading]);

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
          Files ({filteredFileObjects.length})
        </Heading>
        {!hideAdd &&
          <Permission minRole={UserRoles.ProjectManager}>
            <IconButton
              icon={addForm ? <FiX /> : <FiPlus />}
              aria-label="add"
              backgroundColor="transparent"
              onClick={() => setAddForm(!addForm)}
            />
          </Permission>
        }
      </Flex>
      {addForm && (
        <JobsiteAddFileObject
          jobsite={jobsite}
          onSuccess={() => setAddForm(false)}
        />
      )}
      {filteredFileObjects.length > 0 ? (
        !collapsed && (
          <Box>
            <Box
              w="100%"
              maxH="30vh"
              overflowY="auto"
            >
              <AgGridReact
                rowData={filteredFileObjects}
                columnDefs={columnDefs}
                domLayout="autoHeight"
                rowSelection="single"
                suppressCellFocus={true}
                defaultColDef={{
                  sortable: true,
                  filter: true,
                  resizable: true,
                }}
                autoSizeStrategy={{
                  type: "fitCellContents",
                  scaleUpToFitGridWidth: true,
                }}
                onRowClicked={onRowClicked}
              />
            </Box>
          </Box>
        )
      ) : (
        <Center>No Files</Center>
      )}
    </Card>
  );
};

export default JobsiteFileObjects;
