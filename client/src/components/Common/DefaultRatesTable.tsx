import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useDisclosure,
} from "@chakra-ui/react";
import React from "react";
import { FiGitMerge } from "react-icons/fi";
import { DefaultRateSnippetFragment } from "../../generated/graphql";
import formatDate from "../../utils/formatDate";
import formatNumber from "../../utils/formatNumber";
import AlertDialog from "./AlertDialog";
import TextField from "./forms/TextField";

interface IDefaultRatesTable {
  defaultRates: DefaultRateSnippetFragment[];
  ratePropagateButton?: boolean;
  onPropagate?: (itemIndex: number, rateIndex: number) => void;
  isLoading?: boolean;
}

const DefaultRatesTable = ({
  defaultRates,
  ratePropagateButton = false,
  onPropagate,
  isLoading,
}: IDefaultRatesTable) => {
  /**
   * ----- Hook Initialization -----
   */

  const { isOpen, onOpen, onClose } = useDisclosure();

  const [propagateValue, setPropagateValue] = React.useState<
    { rateIndex: number; itemIndex: number } | undefined
  >();

  const [propagateCheck, setPropagateCheck] = React.useState("");

  /**
   * ----- Variables -----
   */

  const propagateTitle = React.useMemo(() => {
    if (propagateValue) {
      return defaultRates[propagateValue.itemIndex].title;
    } else return null;
  }, [defaultRates, propagateValue]);

  /**
   * ----- Use-effects -----
   */

  React.useEffect(() => {
    if (!propagateValue) setPropagateCheck("");
  }, [propagateValue]);

  /**
   * ----- Rendering -----
   */

  return (
    <Table>
      <Thead>
        <Tr>
          <Th>Title</Th>
          <Th>Rates</Th>
        </Tr>
      </Thead>
      <Tbody>
        {defaultRates.map((rate, index) => (
          <Tr key={index}>
            <Td>{rate.title}</Td>
            <Td>
              <Flex flexDir="column">
                {rate.rates.map((r, rateIndex) => (
                  <Flex key={rateIndex} flexDir="row">
                    <Text my="auto">
                      {formatDate(r.date)} - ${formatNumber(r.rate)}
                    </Text>
                    {ratePropagateButton &&
                      onPropagate &&
                      rateIndex === rate.rates.length - 1 && (
                        <Tooltip label="Propagates this rate to all applicable Jobsites.">
                          <IconButton
                            isLoading={isLoading}
                            my="auto"
                            mx={1}
                            size="sm"
                            backgroundColor="transparent"
                            icon={<FiGitMerge />}
                            onClick={() => {
                              setPropagateValue({
                                itemIndex: index,
                                rateIndex,
                              });
                            }}
                            aria-label="propagate"
                          />
                        </Tooltip>
                      )}
                  </Flex>
                ))}
              </Flex>
            </Td>
          </Tr>
        ))}
      </Tbody>
      <AlertDialog
        isOpen={!!propagateValue}
        onClose={() => setPropagateValue(undefined)}
        header="Are you sure?"
        body={
          <Box>
            <Text>
              This will propagate this rate to all jobsites. It will only add it
              if the date of this rate is past the final rate found on the
              Jobsite. This <strong>cannot</strong> be reversed.
            </Text>
            <TextField
              value={propagateCheck}
              onChange={(e) => setPropagateCheck(e.target.value)}
              label="Rate Title"
              helperText="Please enter the title of the rate you are trying to propagate"
            />
          </Box>
        }
        footer={
          <HStack spacing={2}>
            <Button onClick={() => setPropagateValue(undefined)}>Cancel</Button>
            <Button
              isDisabled={
                !propagateCheck ||
                !propagateTitle ||
                propagateCheck !== propagateTitle
              }
              colorScheme="red"
              onClick={() => {
                if (onPropagate && propagateValue) {
                  setPropagateCheck("");
                  setPropagateValue(undefined);
                  onPropagate(
                    propagateValue.itemIndex,
                    propagateValue.rateIndex
                  );
                }
              }}
            >
              Propagate
            </Button>
          </HStack>
        }
      />
    </Table>
  );
};

export default DefaultRatesTable;
