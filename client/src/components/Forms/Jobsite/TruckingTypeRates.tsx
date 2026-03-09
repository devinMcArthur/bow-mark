import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  IconButton,
} from "@chakra-ui/react";
import React from "react";
import { FiPlus, FiTrash } from "react-icons/fi";
import {
  TruckingRateSnippetFragment,
  TruckingRateTypes,
  TruckingTypeRateSnippetFragment,
} from "../../../generated/graphql";
import FormContainer from "../../Common/FormContainer";
import TextField from "../../Common/forms/TextField";
import TruckingRates from "../../Common/forms/TruckingRates";

interface ITruckingTypeRates {
  truckingRates: TruckingTypeRateSnippetFragment[];
  onChange?: (
    truckingRates: Omit<TruckingTypeRateSnippetFragment, "__typename">[]
  ) => void;
  isLoading?: boolean;
  allowDeletion?: boolean;
}

const TruckingTypeRates = ({
  truckingRates,
  onChange,
  isLoading,
  allowDeletion = false,
}: ITruckingTypeRates) => {
  /**
   * ----- Variables -----
   */

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

  /**
   * ----- Functions -----
   */

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

  /**
   * ----- Use-effects and other logic -----
   */

  React.useEffect(() => {
    if (onChange) onChange(truckingRatesCopy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * ----- Rendering -----
   */

  return (
    <Box>
      {truckingRates.map((rate, index) => (
        <FormContainer
          key={index}
          justifyContent="space-between"
          display="flex"
          flexDir="row"
        >
          <Grid
            templateColumns="repeat(6, 1fr)"
            gap={2}
            w={allowDeletion ? "95%" : "100%"}
          >
            <GridItem colSpan={[6, 6, 6, 6, 2]}>
              <TextField
                value={rate.title}
                label="Title"
                isDisabled={isLoading}
                onChange={(e) => setTitle(e.target.value, index)}
              />
            </GridItem>
            <GridItem colSpan={[6, 6, 6, 6, 4]}>
              <TruckingRates
                rates={rate.rates}
                isLoading={isLoading}
                onChange={(rates) => setRates(rates, index)}
                label="Rates"
              />
            </GridItem>
          </Grid>
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

export default TruckingTypeRates;
