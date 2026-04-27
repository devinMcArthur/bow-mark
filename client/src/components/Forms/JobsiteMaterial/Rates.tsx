import {
  Box,
  Button,
  Checkbox,
  Flex,
  FormLabel,
  IconButton,
  Input,
  InputGroup,
  InputLeftAddon,
  NumberInput,
  NumberInputField,
  Text,
} from "@chakra-ui/react";
import React from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { JobsiteMaterialRateSnippetFragment } from "../../../generated/graphql";
import {
  formatThousands,
  parseThousands,
  THOUSANDS_PATTERN,
} from "../../../utils/numberFormat";

export interface IJobsiteMaterialRateError {
  date?: { message?: string };
  rate?: { message?: string };
  estimate?: { message?: string };
}

export interface IJobsiteMaterialRatesForm {
  rates: JobsiteMaterialRateSnippetFragment[];
  onChange?: (
    rates: Omit<JobsiteMaterialRateSnippetFragment, "__typename">[]
  ) => void;
  isLoading?: boolean;
  errors?: IJobsiteMaterialRateError[];
  label?: string;
  /** Retained for backward-compat; ignored in the new compact layout. */
  singleColumn?: boolean;
}

const toInputDate = (d: Date | string): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};


/**
 * Compact inline-grid editor for material rate schedules. Column
 * headers render once at the top; each row is a tight horizontal strip
 * (Date · Rate · Est. checkbox · trash).
 */
const JobsiteMaterialRatesForm = ({
  rates = [],
  onChange,
  isLoading,
  errors,
  label,
}: IJobsiteMaterialRatesForm) => {
  const ratesCopy = React.useMemo(() => {
    const copy: JobsiteMaterialRateSnippetFragment[] = JSON.parse(
      JSON.stringify(rates)
    );
    for (let i = 0; i < copy.length; i++) {
      if (copy[i].__typename) delete copy[i].__typename;
    }
    return copy;
  }, [rates]);

  const addRate = React.useCallback(() => {
    ratesCopy.push({ rate: 0, date: new Date(), estimated: false });
    if (onChange) onChange(ratesCopy);
  }, [onChange, ratesCopy]);

  const removeRate = React.useCallback(
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
    (value: string, index: number) => {
      ratesCopy[index].rate = value as unknown as number;
      if (onChange) onChange(ratesCopy);
    },
    [ratesCopy, onChange]
  );

  const setEstimated = React.useCallback(
    (value: boolean, index: number) => {
      ratesCopy[index].estimated = value;
      if (onChange) onChange(ratesCopy);
    },
    [ratesCopy, onChange]
  );

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
          <Box flex="1 1 40%">Rate</Box>
          <Box flex="0 0 90px">Est.</Box>
          <Box w="32px" />
        </Flex>
      )}

      <Flex direction="column" gap={1}>
        {rates.map((rate, index) => {
          const dateErr = errors?.[index]?.date?.message;
          const rateErr = errors?.[index]?.rate?.message;
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
                <Box flex="1 1 40%">
                  <InputGroup size="sm">
                    <InputLeftAddon>$</InputLeftAddon>
                    <NumberInput
                      size="sm"
                      value={rate.rate?.toString() ?? ""}
                      isDisabled={isLoading}
                      isInvalid={!!rateErr}
                      format={formatThousands}
                      parse={parseThousands}
                      pattern={THOUSANDS_PATTERN}
                      onChange={(valueAsString) =>
                        setRate(valueAsString, index)
                      }
                      w="100%"
                    >
                      <NumberInputField borderLeftRadius={0} />
                    </NumberInput>
                  </InputGroup>
                </Box>
                <Box flex="0 0 90px">
                  <Checkbox
                    isChecked={!!rate.estimated}
                    isDisabled={isLoading}
                    onChange={(e) => setEstimated(e.target.checked, index)}
                  >
                    <Text fontSize="sm">Est.</Text>
                  </Checkbox>
                </Box>
                <IconButton
                  w="32px"
                  size="sm"
                  aria-label="remove rate"
                  icon={<FiTrash2 />}
                  variant="ghost"
                  color="gray.500"
                  onClick={() => removeRate(index)}
                />
              </Flex>
              {(dateErr || rateErr) && (
                <Text fontSize="xs" color="red.500" pl={2} mt={0.5}>
                  {dateErr || rateErr}
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
          onClick={addRate}
        >
          Add rate
        </Button>
      </Flex>
    </Box>
  );
};

export default JobsiteMaterialRatesForm;
