import { Box, Table, Tbody, Td, Tfoot, Th, Thead, Tr } from "@chakra-ui/react";
import dayjs from "dayjs";
import React from "react";
import { CrewLocationSnippetFragment } from "../../../generated/graphql";
import createLink from "../../../utils/createLink";
import TextLink from "../TextLink";

interface ICrewLocationsTable {
  startTime: Date;
  endTime: Date;
  locations: CrewLocationSnippetFragment[];
}

const CrewLocationsTable = ({
  startTime,
  endTime,
  locations,
}: ICrewLocationsTable) => {
  /**
   * ----- Variables -----
   */

  const uniqueDates = React.useMemo(() => {
    // Get all dates between start and end time in format YYYY-MM-DD
    const dates = [];
    let start = dayjs(startTime);
    const end = dayjs(endTime).endOf("day");
    while (start.toDate().getTime() <= end.toDate().getTime()) {
      dates.push(start.format("YYYY-MM-DD"));
      start = start.add(1, "day");
    }
    return dates;
  }, [startTime, endTime]);

  const crewTotals = React.useMemo(() => {
    // Get total number of days each crew worked
    const totals: { [crewId: string]: number } = {};
    locations.forEach((location) => {
      if (totals[location.crew._id]) {
        totals[location.crew._id]++;
      } else {
        totals[location.crew._id] = location.days.length;
      }
    });
    return totals;
  }, [locations]);

  /**
   * ----- Render -----
   */

  return (
    <Box
      w="100%"
      backgroundColor="gray.200"
      borderRadius={6}
      overflowY="scroll"
      maxH="80vh"
    >
      <Table id="jobsite-report-table">
        <Thead>
          <Tr>
            <Th scope="row">Date</Th>
            {locations.map((crewLocation) => {
              return (
                <Th key={crewLocation.crew._id}>{crewLocation.crew.name}</Th>
              );
            })}
          </Tr>
        </Thead>
        <Tbody>
          {uniqueDates.map((date) => {
            return (
              <Tr key={date}>
                <Td scope="row">{date}</Td>
                {locations.map((crewLocation) => {
                  const day = crewLocation.days.find((day) => {
                    return dayjs(day.date).format("YYYY-MM-DD") === date;
                  });

                  return (
                    <Td key={crewLocation.crew._id}>
                      {day?.items.map((item, index) => {
                        return (
                          <>
                            <TextLink
                              key={item.dailyReportId}
                              link={createLink.dailyReport(item.dailyReportId)}
                              newTab
                            >
                              {item.jobsiteName}{" "}
                            </TextLink>
                            {index < day.items.length - 1 ? " / " : ""}
                          </>
                        );
                      })}
                    </Td>
                  );
                })}
              </Tr>
            );
          })}
        </Tbody>
        <Tfoot>
          <Tr>
            <Td scope="row">Total</Td>
            {locations.map((crewLocation, index) => {
              return (
                <Td isNumeric key={index}>
                  {crewTotals[crewLocation.crew._id] || "Not found"}
                </Td>
              );
            })}
          </Tr>
        </Tfoot>
      </Table>
    </Box>
  );
};

export default CrewLocationsTable;
