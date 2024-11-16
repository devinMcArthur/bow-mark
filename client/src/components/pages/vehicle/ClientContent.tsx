import { Box, Center, Flex, Heading, Text } from "@chakra-ui/react";
import React from "react";
import { useVehicleFullQuery } from "../../../generated/graphql";
import createLink from "../../../utils/createLink";
import formatNumber from "../../../utils/formatNumber";
import Card from "../../Common/Card";
import Loading from "../../Common/Loading";
import OperatorDailyReportCard from "../../Common/OperatorDailyReport/OperatorDailyReportCard";
import Permission from "../../Common/Permission";
import ShowMore from "../../Common/ShowMore";
import TextLink from "../../Common/TextLink";
import VehicleIssueCard from "../../Common/VehicleIssue/Card";
import VehicleRates from "./views/Rates";
import VehicleHoursCard from "./views/Hours";

interface IVehicleClientContent {
  id: string;
}

const VehicleClientContent = ({ id }: IVehicleClientContent) => {
  /**
   * ----- Hook Initialization -----
   */

  const { data } = useVehicleFullQuery({
    variables: { id },
  });

  return React.useMemo(() => {
    if (data?.vehicle) {
      const { vehicle } = data;

      return (
        <Box>
          <Card heading={<Heading size="md">Info</Heading>}>
            <Text>
              <Text fontWeight="bold" as="span">
                Code:{" "}
              </Text>
              {vehicle.vehicleCode}
            </Text>
            <Text>
              <Text fontWeight="bold" as="span">
                Type:{" "}
              </Text>
              {vehicle.vehicleType}
            </Text>
            <Text>
              <Text fontWeight="bold" as="span">
                Current Rate:{" "}
              </Text>
              ${formatNumber(vehicle.currentRate)}
            </Text>
          </Card>
          <Permission>
            <VehicleRates vehicle={vehicle} />
          </Permission>
          <VehicleHoursCard vehicleId={id} />
          <Card>
            <Heading size="md">Crews</Heading>
            {vehicle.crews.map((crew) => (
              <Box key={crew._id} border="1px solid lightgray" p={2}>
                <TextLink fontWeight="bold" link={createLink.crew(crew._id)}>
                  {crew.name}
                </TextLink>
              </Box>
            ))}
          </Card>

          <Card>
            <Heading ml={2} w="100%" my="auto" size="md">
              Operator Daily Reports
            </Heading>
            <Flex flexDir="column" w="100%" px={4} py={2}>
              {vehicle.operatorDailyReports.length > 0 ? (
                <ShowMore
                  list={vehicle.operatorDailyReports.map(
                    (operatorDailyReport) => (
                      <OperatorDailyReportCard
                        operatorDailyReport={operatorDailyReport}
                        key={operatorDailyReport._id}
                      />
                    )
                  )}
                />
              ) : (
                <Center>No Operator Daily Reports</Center>
              )}
            </Flex>
          </Card>

          <Card>
            <Heading ml={2} w="100%" my="auto" size="md">
              Vehicle Issues
            </Heading>
            <Flex flexDir="column" w="100%" px={4} py={2}>
              {vehicle.vehicleIssues.length > 0 ? (
                <ShowMore
                  list={vehicle.vehicleIssues.map((vehicleIssue) => (
                    <VehicleIssueCard
                      vehicleIssue={vehicleIssue}
                      key={vehicleIssue._id}
                    />
                  ))}
                />
              ) : (
                <Center>No Operator Daily Reports</Center>
              )}
            </Flex>
          </Card>
        </Box>
      );
    } else return <Loading />;
  }, [data, id]);
};

export default VehicleClientContent;
