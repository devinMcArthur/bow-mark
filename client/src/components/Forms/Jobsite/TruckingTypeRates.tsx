import {
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  Text,
} from "@chakra-ui/react";
import React from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import {
  TruckingRateSnippetFragment,
  TruckingRateTypes,
  TruckingTypeRateSnippetFragment,
} from "../../../generated/graphql";
import TruckingRates from "../../Common/forms/TruckingRates";

interface ITruckingTypeRates {
  truckingRates: TruckingTypeRateSnippetFragment[];
  onChange?: (
    truckingRates: Omit<TruckingTypeRateSnippetFragment, "__typename">[]
  ) => void;
  isLoading?: boolean;
  allowDeletion?: boolean;
}

/**
 * Outer editor: one block per trucking type (Tandem, Truck and Pup,
 * etc.). Title sits on top, rate schedule below — reads as a stack per
 * vehicle type instead of competing title/rates columns side-by-side.
 */
const TruckingTypeRates = ({
  truckingRates,
  onChange,
  isLoading,
  allowDeletion = false,
}: ITruckingTypeRates) => {
  const truckingRatesCopy: Omit<
    TruckingTypeRateSnippetFragment,
    "__typename"
  >[] = React.useMemo(() => {
    const copy: TruckingTypeRateSnippetFragment[] = JSON.parse(
      JSON.stringify(truckingRates)
    );
    for (let i = 0; i < copy.length; i++) {
      if (copy[i].__typename) delete copy[i].__typename;
    }
    return copy;
  }, [truckingRates]);

  const addRate = React.useCallback(() => {
    truckingRatesCopy.push({
      title: "",
      rates: [
        {
          rate: 0,
          date: new Date(),
          type: TruckingRateTypes.Hour,
        },
      ],
    });
    if (onChange) onChange(truckingRatesCopy);
  }, [truckingRatesCopy, onChange]);

  const removeRate = React.useCallback(
    (index: number) => {
      truckingRatesCopy.splice(index, 1);
      if (onChange) onChange(truckingRatesCopy);
    },
    [truckingRatesCopy, onChange]
  );

  const setTitle = React.useCallback(
    (value: string, index: number) => {
      truckingRatesCopy[index].title = value;
      if (onChange) onChange(truckingRatesCopy);
    },
    [truckingRatesCopy, onChange]
  );

  const setRates = React.useCallback(
    (
      value: Omit<TruckingRateSnippetFragment, "__typename">[],
      index: number
    ) => {
      truckingRatesCopy[index].rates = value;
      if (onChange) onChange(truckingRatesCopy);
    },
    [truckingRatesCopy, onChange]
  );

  React.useEffect(() => {
    if (onChange) onChange(truckingRatesCopy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Flex direction="column" gap={4}>
      {truckingRates.map((rate, index) => (
        <Box
          key={index}
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          p={3}
        >
          {/* Title row — full-width, clearly belongs to the section. */}
          <Flex align="flex-end" gap={2} mb={3}>
            <Box flex={1}>
              <Text
                fontSize="xs"
                fontWeight="semibold"
                color="gray.500"
                textTransform="uppercase"
                letterSpacing="wide"
                mb={1}
              >
                Title
              </Text>
              <Input
                size="sm"
                value={rate.title}
                isDisabled={isLoading}
                onChange={(e) => setTitle(e.target.value, index)}
                placeholder="e.g. Tandem, Truck and Pup"
              />
            </Box>
            {allowDeletion && (
              <IconButton
                aria-label="Remove type"
                icon={<FiTrash2 />}
                size="sm"
                variant="ghost"
                color="gray.500"
                onClick={() => removeRate(index)}
              />
            )}
          </Flex>

          {/* Rates grid lives below the title — stacked per section. */}
          <TruckingRates
            rates={rate.rates}
            isLoading={isLoading}
            onChange={(rates) => setRates(rates, index)}
          />
        </Box>
      ))}

      <Flex justifyContent="flex-start">
        <Button
          size="sm"
          variant="outline"
          isLoading={isLoading}
          leftIcon={<FiPlus />}
          onClick={addRate}
        >
          Add trucking type
        </Button>
      </Flex>
    </Flex>
  );
};

export default TruckingTypeRates;
