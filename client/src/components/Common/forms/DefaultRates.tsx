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
import {
  DefaultRateSnippetFragment,
  RateSnippetFragment,
} from "../../../generated/graphql";
import FormContainer from "../FormContainer";
import Rates, { IRateError } from "./Rates";
import TextField from "./TextField";

export interface IDefaultRateError {
  title?: {
    message?: string;
  };
  rates: IRateError[];
}

export interface IDefaultRates {
  defaultRates: DefaultRateSnippetFragment[];
  onChange?: (
    defaultRates: Omit<DefaultRateSnippetFragment, "__typename">[]
  ) => void;
  errors?: IDefaultRateError[];
  isLoading?: boolean;
  allowDeletion?: boolean;
  label?: string;
  titleName?: string;
}

const DefaultRates = ({
  defaultRates,
  onChange,
  errors = [],
  isLoading,
  allowDeletion = false,
  label,
  titleName = "Title",
}: IDefaultRates) => {
  /**
   * ----- Variables -----
   */

  const defaultRatesCopy: Omit<DefaultRateSnippetFragment, "__typename">[] =
    React.useMemo(() => {
      const copy: DefaultRateSnippetFragment[] = JSON.parse(
        JSON.stringify(defaultRates)
      );

      for (let i = 0; i < copy.length; i++) {
        if (copy[i].__typename) delete copy[i].__typename;
      }

      return copy;
    }, [defaultRates]);

  /**
   * ----- Functions -----
   */

  const addRate = React.useCallback(() => {
    defaultRatesCopy.push({
      title: "",
      rates: [
        {
          date: new Date(),
          rate: 0,
        },
      ],
    });

    if (onChange) onChange(defaultRatesCopy);
  }, [defaultRatesCopy, onChange]);

  const removeRate = React.useCallback(
    (index: number) => {
      defaultRatesCopy.splice(index, 1);
      if (onChange) onChange(defaultRatesCopy);
    },
    [defaultRatesCopy, onChange]
  );

  const setTitle = React.useCallback(
    (value: string, index: number) => {
      defaultRatesCopy[index].title = value;

      if (onChange) onChange(defaultRatesCopy);
    },
    [defaultRatesCopy, onChange]
  );

  const setRates = React.useCallback(
    (value: Omit<RateSnippetFragment, "__typename">[], index: number) => {
      defaultRatesCopy[index].rates = value;

      if (onChange) onChange(defaultRatesCopy);
    },
    [defaultRatesCopy, onChange]
  );

  /**
   * ----- Use-effects and other logic -----
   */

  React.useEffect(() => {
    if (onChange) onChange(defaultRatesCopy);
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
      {defaultRates.map((def, index) => (
        <FormContainer
          key={def._id || index}
          justifyContent="space-between"
          display="flex"
          flexDir="row"
          border="1px solid"
          borderColor="gray.400"
        >
          <SimpleGrid
            columns={[1, 1, 2]}
            spacing={2}
            w={allowDeletion ? "95%" : "100%"}
          >
            <TextField
              value={def.title}
              label={titleName}
              isDisabled={isLoading}
              errorMessage={errors[index]?.title?.message}
              onChange={(e) => setTitle(e.target.value, index)}
            />
            <Rates
              rates={def.rates}
              isLoading={isLoading}
              onChange={(rate) => setRates(rate, index)}
              errors={errors[index]?.rates}
            />
          </SimpleGrid>
          {allowDeletion && (
            <IconButton
              m="auto"
              aria-label="remove"
              icon={<FiTrash />}
              backgroundColor="transparent"
              onClick={() => removeRate(index)}
            />
          )}
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

export default DefaultRates;
