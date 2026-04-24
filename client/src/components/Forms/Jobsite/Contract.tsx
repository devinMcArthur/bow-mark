import {
  Box,
  Button,
  Flex,
  InputGroup,
  InputLeftAddon,
  NumberInput,
  NumberInputField,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import React from "react";
import { Controller, SubmitHandler, UseFormProps } from "react-hook-form";
import { useJobsiteContractForm } from "../../../forms/jobsite";
import { JobsiteContractData } from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";

interface IJobsiteContractForm {
  submitHandler: SubmitHandler<JobsiteContractData>;
  formOptions?: UseFormProps;
  isLoading?: boolean;
}

/**
 * Format a numeric value with thousand separators for display.
 * Used by NumberInput's `format` prop so "12345.67" renders as
 * "12,345.67" while the underlying value stays numeric.
 */
const formatThousands = (val: string | number | undefined): string => {
  if (val === undefined || val === null || val === "") return "";
  const stripped = typeof val === "string" ? val.replace(/,/g, "") : String(val);
  if (stripped === "" || stripped === "-") return stripped;
  const [whole, fraction] = stripped.split(".");
  const n = parseInt(whole, 10);
  if (Number.isNaN(n)) return stripped;
  const formattedWhole = n.toLocaleString("en-US");
  return fraction !== undefined ? `${formattedWhole}.${fraction}` : formattedWhole;
};

/** Strip formatting commas before the value gets back into form state. */
const parseThousands = (val: string): string => val.replace(/,/g, "");

/**
 * Label component matching the compact uppercase style used in the
 * rates forms, so every jobsite-page form reads as one family.
 */
const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text
    as="label"
    display="block"
    fontSize="xs"
    fontWeight="semibold"
    color="gray.500"
    textTransform="uppercase"
    letterSpacing="wide"
    mb={1}
  >
    {children}
  </Text>
);

const JobsiteContractForm = ({
  submitHandler,
  isLoading,
  formOptions,
}: IJobsiteContractForm) => {
  const { handleSubmit, control, watch } = useJobsiteContractForm(formOptions);

  // Live-compute the profit margin from the two numbers so the user
  // sees the implied margin without having to do the math mentally.
  // Form values are strings during editing; coerce explicitly here.
  const bidValue = Number(watch("bidValue") ?? 0);
  const expectedProfit = Number(watch("expectedProfit") ?? 0);
  const marginPct =
    bidValue > 0 && !Number.isNaN(expectedProfit)
      ? (expectedProfit / bidValue) * 100
      : null;

  return (
    <form onSubmit={handleSubmit(submitHandler)}>
      <SimpleGrid columns={2} spacing={3}>
        <Controller
          control={control}
          name="bidValue"
          render={({ field, fieldState }) => (
            <Box>
              <FieldLabel>Bid Value</FieldLabel>
              <InputGroup size="sm">
                <InputLeftAddon>$</InputLeftAddon>
                <NumberInput
                  size="sm"
                  min={0}
                  // Track value as string so intermediate typing states
                  // (e.g. "1." while the user is still typing a decimal)
                  // aren't collapsed to an integer. Yup coerces to
                  // number at submit via its `.number()` schema.
                  value={field.value?.toString() ?? ""}
                  isDisabled={isLoading}
                  isInvalid={!!fieldState.error}
                  format={formatThousands}
                  parse={parseThousands}
                  onChange={(valueAsString) => field.onChange(valueAsString)}
                  w="100%"
                >
                  <NumberInputField borderLeftRadius={0} />
                </NumberInput>
              </InputGroup>
              {fieldState.error?.message && (
                <Text fontSize="xs" color="red.500" mt={1}>
                  {fieldState.error.message}
                </Text>
              )}
            </Box>
          )}
        />

        <Controller
          control={control}
          name="expectedProfit"
          render={({ field, fieldState }) => (
            <Box>
              <FieldLabel>Expected Profit</FieldLabel>
              <InputGroup size="sm">
                <InputLeftAddon>$</InputLeftAddon>
                <NumberInput
                  size="sm"
                  min={0}
                  // Track value as string so intermediate typing states
                  // (e.g. "1." while the user is still typing a decimal)
                  // aren't collapsed to an integer. Yup coerces to
                  // number at submit via its `.number()` schema.
                  value={field.value?.toString() ?? ""}
                  isDisabled={isLoading}
                  isInvalid={!!fieldState.error}
                  format={formatThousands}
                  parse={parseThousands}
                  onChange={(valueAsString) => field.onChange(valueAsString)}
                  w="100%"
                >
                  <NumberInputField borderLeftRadius={0} />
                </NumberInput>
              </InputGroup>
              {fieldState.error?.message && (
                <Text fontSize="xs" color="red.500" mt={1}>
                  {fieldState.error.message}
                </Text>
              )}
            </Box>
          )}
        />
      </SimpleGrid>

      {/* Computed margin helper — gives immediate feedback on what the
          inputs imply without the user doing mental math. */}
      {marginPct !== null && (
        <Flex
          mt={3}
          px={3}
          py={2}
          bg="gray.50"
          borderRadius="md"
          fontSize="sm"
          justify="space-between"
        >
          <Text color="gray.600">Implied profit margin</Text>
          <Text fontWeight="semibold" color="gray.800">
            {formatNumber(marginPct)}%
          </Text>
        </Flex>
      )}

      <Flex justify="flex-end" mt={5}>
        <Button
          type="submit"
          colorScheme="blue"
          size="sm"
          isLoading={isLoading}
        >
          Save contract
        </Button>
      </Flex>
    </form>
  );
};

export default JobsiteContractForm;
