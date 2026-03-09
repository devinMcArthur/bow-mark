import React from "react";
import {
  Flex,
  Icon,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Portal,
} from "@chakra-ui/react";
import { FiAlertTriangle } from "react-icons/fi";
import { ReportIssueSnippetFragment } from "../../../generated/graphql";
import JobsiteReportIssueCard from "./IssueCard";

interface IJobsiteReportIssues {
  issues: ReportIssueSnippetFragment[];
}

const JobsiteReportIssues = ({ issues }: IJobsiteReportIssues) => {
  if (issues.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger>
        <Flex flexDir="row">
          <Icon
            m="auto"
            as={FiAlertTriangle}
            aria-label="alert"
            backgroundColor="transparent"
            cursor="pointer"
            color="red.700"
          />
        </Flex>
      </PopoverTrigger>
      <Portal>
        <PopoverContent>
          <PopoverArrow />
          <PopoverCloseButton />
          <PopoverHeader fontWeight="bold">
            Issues ({issues.length})
          </PopoverHeader>
          <PopoverBody p={0} maxH="60vh" overflowY="scroll">
            {issues.map((issue) => (
              <JobsiteReportIssueCard issue={issue} key={issue._id} />
            ))}
          </PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  );
};

export default JobsiteReportIssues;
