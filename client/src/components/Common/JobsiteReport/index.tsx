import React from "react";
import { Heading, SimpleGrid, Stack } from "@chakra-ui/react";
import {
  JobsiteMonthReportNoFetchSnippetFragment,
  JobsiteYearReportNoFetchSnippetFragment,
} from "../../../generated/graphql";
import Card from "../Card";
import JobsiteReportCrewType from "./CrewType";
import JobsiteReportExpenseInvoices from "./ExpenseInvoices";
import JobsiteReportOnJobSummary from "./OnJobSummary";
import JobsiteReportRevenueInvoices from "./RevenueInvoices";
import JobsiteReportSummary from "./Summary";
import JobsiteReportNotes from "./ReportNotes";

interface IJobsiteReport {
  report:
  | JobsiteMonthReportNoFetchSnippetFragment
  | JobsiteYearReportNoFetchSnippetFragment;
}

const JobsiteReport = ({ report }: IJobsiteReport) => {
  /**
   * --- Hook Initialization ---
   */

  const [notesExpanded, setNotesExpanded] = React.useState(false);

  /**
   * --- Rendering ---
   */

  return (
    <Stack spacing={2}>
      <JobsiteReportSummary report={report} />

      <SimpleGrid columns={[2]} spacingX={2}>
        <JobsiteReportExpenseInvoices report={report} />
        <JobsiteReportRevenueInvoices report={report} />
      </SimpleGrid>

      {report.crewTypes.map((crewType) => (
        <JobsiteReportCrewType
          crewType={crewType}
          key={crewType}
          report={report}
        />
      ))}

      <Card heading={<Heading size="md">On Job Summary</Heading>}>
        <JobsiteReportOnJobSummary dayReports={report.dayReports} />
      </Card>

      <Card heading={
        <Heading
          onClick={() => setNotesExpanded(!notesExpanded)}
          size="md"
          cursor="pointer"
        >
          Notes
        </Heading>}
      >
        {notesExpanded && <JobsiteReportNotes reportNotes={report.reportNotes} />}
      </Card>
    </Stack>
  );
};

export default JobsiteReport;
