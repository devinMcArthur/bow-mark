import { Box, Center, Table, Tbody, Th, Thead, Text, Heading } from "@chakra-ui/react";
import React from "react";
import { useVehicleHourReportsQuery } from "../../../../generated/graphql";
import formatNumber from "../../../../utils/formatNumber";
import Loading from "../../../Common/Loading";
import Card from "../../../Common/Card";

interface IVehicleHoursCard {
  vehicleId: string;
}

const VehicleHoursCard = ({
  vehicleId,
}: IVehicleHoursCard) => {
  /**
   * ----- Hook Initialization -----
   */

  const { data } = useVehicleHourReportsQuery({
    variables: {
      id: vehicleId,
    }
  });

  /**
   * ----- Variables -----
   */

  const totalHours = React.useMemo(() => {
    if (data?.vehicleHourReports) {
      return data.vehicleHourReports.years.reduce(
        (acc, curr) => acc + curr.hours,
        0
      );
    }
    return 0;
  }, [data?.vehicleHourReports]);

  /**
   * ----- Rendering -----
   */

  const tableContent = React.useMemo(() => {
    if (data?.vehicleHourReports) {
      if (data.vehicleHourReports.years.length > 0) {
        const content: {
          headers: React.ReactElement[];
          rows: React.ReactElement[];
        } = { headers: [], rows: [] };

        data.vehicleHourReports.years.forEach((year) => {
          content.headers.push(
            <Th isNumeric>{year.year}</Th>
          );
          content.rows.push(<Th isNumeric>{formatNumber(year.hours)}</Th>);
        });

        return (
          <Table>
            <Thead>
              {content.headers}
              <Th isNumeric>Total</Th>
            </Thead>
            <Tbody>
              {content.rows}
              <Th isNumeric>{formatNumber(totalHours)}</Th>
            </Tbody>
          </Table>
        );
      } else {
        return (
          <Center>
            <Text>- No hours found -</Text>
          </Center>
        );
      }
    } else return <Loading />;
  }, [data?.vehicleHourReports, totalHours]);

  return (
    <Card
      heading={
        <Heading size="md">Hours</Heading>
      }
    >
      <Box
        w="100%"
        overflowX="scroll"
        backgroundColor="gray.200"
        borderRadius={6}
        maxH="60vh"
        overflowY="scroll"
      >
        {tableContent}
      </Box>
    </Card>
  );
};

export default VehicleHoursCard;
