import { Box, Flex, Table, Tbody, Td, Th, Thead, Tr } from "@chakra-ui/react";
import { TruckingTypeRateSnippetFragment } from "../../../generated/graphql";
import formatDate from "../../../utils/formatDate";
import formatNumber from "../../../utils/formatNumber";

interface ITruckingTypeRatesTable {
  truckingRates: TruckingTypeRateSnippetFragment[];
}

const TruckingTypeRatesTable = ({ truckingRates }: ITruckingTypeRatesTable) => {
  return (
    <Table>
      <Thead>
        <Tr>
          <Th>Title</Th>
          <Th>Rates</Th>
        </Tr>
      </Thead>
      <Tbody>
        {truckingRates.map((rate, index) => (
          <Tr key={index}>
            <Td>{rate.title}</Td>
            <Td>
              <Flex flexDir="column">
                {rate.rates.map((rate, index) => (
                  <Box key={index}>
                    {formatDate(rate.date)} - ${formatNumber(rate.rate)} (
                    {rate.type})
                  </Box>
                ))}
              </Flex>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default TruckingTypeRatesTable;
