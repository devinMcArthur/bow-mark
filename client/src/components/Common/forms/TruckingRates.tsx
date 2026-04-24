import {
  Box,
  Button,
  Flex,
  FormLabel,
  IconButton,
  Input,
  InputGroup,
  InputLeftAddon,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  Text,
} from "@chakra-ui/react";
import React from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import {
  TruckingRateSnippetFragment,
  TruckingRateTypes,
} from "../../../generated/graphql";

interface TruckingRateError {
  date?: { message?: string };
  rate?: { message?: string };
  type?: { message?: string };
}

export interface ITruckingRates {
  rates: TruckingRateSnippetFragment[];
  onChange?: (rates: Omit<TruckingRateSnippetFragment, "__typename">[]) => void;
  isLoading?: boolean;
  errors?: TruckingRateError[];
  label?: string;
}

const toInputDate = (d: Date | string): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/**
 * Inline-grid editor for trucking rate schedules — date, amount, and
 * hours-vs-quantity basis. Column headers render once at the top; each
 * row is a compact horizontal strip with a trailing delete.
 */
const TruckingRates = ({
  rates = [],
  onChange,
  isLoading,
  errors,
  label,
}: ITruckingRates) => {
  const ratesCopy: TruckingRateSnippetFragment[] = React.useMemo(() => {
    const copy: TruckingRateSnippetFragment[] = JSON.parse(JSON.stringify(rates));
    for (let i = 0; i < copy.length; i++) {
      if (copy[i].__typename) delete copy[i].__typename;
    }
    return copy;
  }, [rates]);

  const addTruckingRate = React.useCallback(() => {
    ratesCopy.push({
      rate: 0,
      date: new Date(),
      type: TruckingRateTypes.Hour,
    });
    if (onChange) onChange(ratesCopy);
  }, [onChange, ratesCopy]);

  const removeTruckingRate = React.useCallback(
    (index: number) => {
      ratesCopy.splice(index, 1);
      if (onChange) onChange(ratesCopy);
    },
    [onChange, ratesCopy]
  );

  const setDate = React.useCallback(
    (value: string, index: number) => {
      ratesCopy[index].date = value;
      if (onChange) onChange(ratesCopy.slice().sort((a, b) => b.date - a.date));
    },
    [ratesCopy, onChange]
  );

  const setRate = React.useCallback(
    (value: number, index: number) => {
      ratesCopy[index].rate = value;
      if (onChange) onChange(ratesCopy);
    },
    [ratesCopy, onChange]
  );

  const setType = React.useCallback(
    (value: TruckingRateTypes, index: number) => {
      ratesCopy[index].type = value;
      if (onChange) onChange(ratesCopy);
    },
    [ratesCopy, onChange]
  );

  React.useEffect(() => {
    if (onChange) onChange(ratesCopy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box>
      {label && (
        <FormLabel fontWeight="bold" mb={1} ml={1}>
          {label}
        </FormLabel>
      )}

      {rates.length > 0 && (
        <Flex
          gap={2}
          px={2}
          mb={1}
          fontSize="xs"
          fontWeight="semibold"
          color="gray.500"
          textTransform="uppercase"
          letterSpacing="wide"
        >
          <Box flex="1 1 35%">Date</Box>
          <Box flex="1 1 35%">Rate</Box>
          <Box flex="1 1 30%">Type</Box>
          <Box w="32px" />
        </Flex>
      )}

      <Flex direction="column" gap={1}>
        {rates.map((rate, index) => {
          const dateErr = errors?.[index]?.date?.message;
          const rateErr = errors?.[index]?.rate?.message;
          const typeErr = errors?.[index]?.type?.message;
          return (
            <Box key={index}>
              <Flex gap={2} align="center">
                <Box flex="1 1 35%">
                  <Input
                    size="sm"
                    type="date"
                    value={toInputDate(rate.date)}
                    isDisabled={isLoading}
                    isInvalid={!!dateErr}
                    onChange={(e) => setDate(e.target.value, index)}
                  />
                </Box>
                <Box flex="1 1 35%">
                  <InputGroup size="sm">
                    <InputLeftAddon>$</InputLeftAddon>
                    <NumberInput
                      size="sm"
                      precision={2}
                      value={rate.rate}
                      isDisabled={isLoading}
                      isInvalid={!!rateErr}
                      onChange={(_, num) => setRate(num, index)}
                      w="100%"
                    >
                      <NumberInputField borderLeftRadius={0} />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </InputGroup>
                </Box>
                <Box flex="1 1 30%">
                  <Select
                    size="sm"
                    value={rate.type}
                    isDisabled={isLoading}
                    isInvalid={!!typeErr}
                    onChange={(e) =>
                      setType(e.target.value as TruckingRateTypes, index)
                    }
                  >
                    {Object.values(TruckingRateTypes).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </Box>
                <IconButton
                  w="32px"
                  size="sm"
                  aria-label="remove rate"
                  icon={<FiTrash2 />}
                  variant="ghost"
                  color="gray.500"
                  onClick={() => removeTruckingRate(index)}
                />
              </Flex>
              {(dateErr || rateErr || typeErr) && (
                <Text fontSize="xs" color="red.500" pl={2} mt={0.5}>
                  {dateErr || rateErr || typeErr}
                </Text>
              )}
            </Box>
          );
        })}
      </Flex>

      <Flex justifyContent="flex-start" mt={2}>
        <Button
          size="sm"
          variant="outline"
          isLoading={isLoading}
          leftIcon={<FiPlus />}
          onClick={addTruckingRate}
        >
          Add rate
        </Button>
      </Flex>
    </Box>
  );
};

export default TruckingRates;
