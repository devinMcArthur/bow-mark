import { Box, Center, Flex, Icon, IconButton, Text } from "@chakra-ui/react";
import Link from "next/link";
import React from "react";
import { FiTrash } from "react-icons/fi";
import {
  FileFullSnippetFragment,
  FilePreloadSnippetFragment,
  useFileFullQuery,
} from "../../generated/graphql";
import ErrorMessage from "./ErrorMessage";
import Loading from "./Loading";
import { AiOutlineFilePdf, AiOutlineFileExcel, AiOutlineFileWord } from "react-icons/ai";

interface IFileDisplay {
  file: FilePreloadSnippetFragment;
  removeLoading?: boolean;
  onRemove?: (file: FileFullSnippetFragment) => void;
}

const FileDisplay = ({
  file: propsFile,
  onRemove,
  removeLoading,
}: IFileDisplay) => {
  /**
   * ----- Hook Initialization -----
   */

  const { data, loading } = useFileFullQuery({
    variables: {
      id: propsFile._id,
    },
  });

  /**
   * ----- Rendering -----
   */

  const display = React.useMemo(() => {
    if (data?.file && !loading) {
      const { file } = data;

      // const encodedUrl = encodeURIComponent(file.downloadUrl);

      switch (file.mimetype) {
        case "image/jpeg":
        case "image/png":
        case "image/gif": {
          // eslint-disable-next-line @next/next/no-img-element
          return <img src={file.buffer} alt="image" />;
        }
        case "application/pdf": {
          return (
            <Link passHref href={file.downloadUrl}>
              <Center cursor="pointer">
                <Icon boxSize={12} as={AiOutlineFilePdf} />
              </Center>
            </Link>
          );
        }
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
          return (
            <Link passHref href={file.downloadUrl}>
              <Center cursor="pointer">
                <Icon boxSize={12} as={AiOutlineFileWord} />
              </Center>
            </Link>
          )
        }
        case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
          return (
            <Link passHref href={file.downloadUrl}>
              <Center cursor="pointer">
                <Icon boxSize={12} as={AiOutlineFileExcel} />
              </Center>
            </Link>
          )
        }
        // // 1. PDF: Use Native Browser Viewer
        // case "application/pdf": {
        //   return (
        //     <iframe
        //       src={file.downloadUrl}
        //       width="100%"
        //       height="600px"
        //       style={{ border: 'none' }}
        //       title="PDF Viewer"
        //     />
        //   );
        // }
        //
        // // 2. Word: Use Microsoft Office Viewer
        // case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
        //   return (
        //     <iframe
        //       src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`}
        //       width="100%"
        //       height="600px"
        //       style={{ border: 'none' }}
        //       title="Word Viewer"
        //     />
        //   );
        // }
        //
        // // 3. Excel: Use Microsoft Office Viewer
        // case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
        //   return (
        //     <iframe
        //       src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`}
        //       width="100%"
        //       height="600px"
        //       style={{ border: 'none' }}
        //       title="Excel Viewer"
        //     />
        //   );
        // }
        default: {
          return (
            <ErrorMessage
              description={`unsupported file type: ${file.mimetype}`}
            />
          );
        }
      }
    } else {
      return <Loading />;
    }
  }, [data, loading]);

  return (
    <Box>
      {display}
      <Flex flexDir="row" justifyContent="space-between">
        <Text my="auto">{propsFile.description}</Text>
        {onRemove && data?.file && (
          <IconButton
            isLoading={removeLoading}
            aria-label="remove-file"
            icon={<FiTrash />}
            backgroundColor="transparent"
            onClick={() =>
              window.confirm("Are you sure?") && onRemove(data.file)
            }
          />
        )}
      </Flex>
    </Box>
  );
};

export default FileDisplay;
