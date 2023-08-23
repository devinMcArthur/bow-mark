import React from "react";
import { ReportNoteFullSnippetFragment } from "../../../generated/graphql";
import { Box, Divider, Flex, Heading, SimpleGrid, Text } from "@chakra-ui/react";
import jobsiteName from "../../../utils/jobsiteName";
import dayjs from "dayjs";
import createLink from "../../../utils/createLink";
import TextLink from "../TextLink";
import FileDisplay from "../FileDisplay";

interface IJobsiteReportNotes {
  reportNotes: ReportNoteFullSnippetFragment[];
}

const JobsiteReportNotes = ({
  reportNotes
}: IJobsiteReportNotes) => {
  /**
   * ----- Rendering -----
   */

  return (
    <Box>
      {reportNotes.map((note) => (
        <Box key={note._id} m="2" p="2" borderRadius="6" backgroundColor="gray.200">
          {note.dailyReport && (
            <TextLink
              link={createLink.dailyReport(note.dailyReport._id)}
              color="black"
              fontWeight="bold"
              fontSize="lg"
            >
              {jobsiteName(
                note.dailyReport.jobsite.name,
                note.dailyReport.jobsite.jobcode
              )}{" "}
              - {dayjs(note.dailyReport.date).format("MMMM DD, YYYY")}{" "}
              ({note.dailyReport.crew.name})
            </TextLink>
          )}
          <Text whiteSpace="pre-wrap">{note.note}</Text>
          {/* Files */}
          {note.files.length > 0 ? (
            <Box>
              <Divider my={1} />
              <Flex flexDir="row" justifyContent="space-between">
                <Heading
                  size="sm"
                  w="100%"
                >
                  Files ({note.files.length || 0})
                </Heading>
              </Flex>
              <SimpleGrid columns={[1, 1, 2]}>
                {note.files.map((file) => (
                  <FileDisplay
                    key={file._id}
                    file={file}
                  />
                ))}
              </SimpleGrid>
            </Box>
          ) : null}
        </Box>
      ))}
    </Box>
  );
};

export default JobsiteReportNotes;
