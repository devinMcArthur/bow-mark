import {
  Box,
  Button,
  Flex,
  FormLabel,
  IconButton,
  SimpleGrid,
} from "@chakra-ui/react";
import React from "react";
import { FiPlus, FiTrash } from "react-icons/fi";
import { RateSnippetFragment } from "../../../generated/graphql";
import FormContainer from "../FormContainer";
import NumberForm from "./Number";
import TextField from "./TextField";

export interface IRateError {
  date?: {
    message?: string;
  };
  rate?: {
    message?: string;
  };
}

export interface IRates {
  rates: RateSnippetFragment[];
  onChange?: (rates: Omit<RateSnippetFragment, "__typename">[]) => void;
  isLoading?: boolean;
  errors?: IRateError[];
  label?: string;
  formSymbol?: string;
}

const Rates = ({
  rates = [],
  onChange,
  isLoading,
  errors,
  label,
  formSymbol = "$",
}: IRates) => {
  /**
   * ----- Variables -----
   */

  const ratesCopy: RateSnippetFragment[] = React.useMemo(() => {
    const copy: RateSnippetFragment[] = JSON.parse(JSON.stringify(rates));

    for (let i = 0; i < copy.length; i++) {
      if (copy[i].__typename) delete copy[i].__typename;
    }

    return copy;
  }, [rates]);

  /**
   * ----- Functions -----
   */

  const addRate = React.useCallback(() => {
    ratesCopy.push({
      rate: 0,
      date: new Date(),
    });
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
    (value: number, index: number) => {
      ratesCopy[index].rate = value;

      if (onChange) onChange(ratesCopy);
    },
    [ratesCopy, onChange]
  );

  /**
   * ----- Use-effects and other logic -----
   */

  React.useEffect(() => {
    if (onChange) onChange(ratesCopy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * ----- Rendering -----
   */

  return (
    <Box>
      {label && (
        <FormLabel fontWeight="bold" mb={0} mt={1} ml={1}>
          {label}
        </FormLabel>
      )}
      {rates.map((rate, index) => (
        <FormContainer
          key={index}
          justifyContent="space-between"
          display="flex"
          flexDir="row"
          border="1px solid"
          borderColor="gray.400"
        >
          <Flex flexDir="column" w="100%">
            <SimpleGrid columns={[1, 1, 2]} spacing={2} w="100%">
              <TextField
                value={rate.date}
                isDisabled={isLoading}
                type="date"
                label="Date"
                onChange={(e) => setDate(e.target.value, index)}
                errorMessage={errors && errors[index]?.date?.message}
              />
              <NumberForm
                value={rate.rate}
                isDisabled={isLoading}
                label="Rate"
                precision={2}
                inputLeftAddon={formSymbol}
                onChange={(_, num) => setRate(num, index)}
                errorMessage={errors && errors[index]?.rate?.message}
              />
            </SimpleGrid>
            <Flex flexDir="row" justifyContent="end">
              <IconButton
                size="sm"
                aria-label="remove"
                icon={<FiTrash />}
                backgroundColor="transparent"
                onClick={() => removeRate(index)}
              />
            </Flex>
          </Flex>
        </FormContainer>
      ))}
      <Flex justifyContent="end">
        <Button
          mt={2}
          isLoading={isLoading}
          leftIcon={<FiPlus />}
          onClick={addRate}
        >
          New
        </Button>
      </Flex>
    </Box>
  );
};

export default Rates;
