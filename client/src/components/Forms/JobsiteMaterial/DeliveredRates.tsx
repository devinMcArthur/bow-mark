import { Box, Button, Flex, FormLabel, SimpleGrid } from "@chakra-ui/react";
import React from "react";
import { FiPlus } from "react-icons/fi";
import {
  JobsiteMaterialDeliveredRateSnippetFragment,
  JobsiteMaterialRateSnippetFragment,
} from "../../../generated/graphql";
import FormContainer from "../../Common/FormContainer";
import TextField from "../../Common/forms/TextField";
import JobsiteMaterialRatesForm, { IJobsiteMaterialRateError } from "./Rates";

export interface IJobsiteMaterialDeliveredRateError {
  title?: {
    message?: string;
  };
  rates: IJobsiteMaterialRateError[];
}

export interface IJobsiteMaterialDeliveredRatesForm {
  deliveredRates: JobsiteMaterialDeliveredRateSnippetFragment[];
  onChange?: (
    deliveredRates: Omit<
      JobsiteMaterialDeliveredRateSnippetFragment,
      "__typename"
    >[]
  ) => void;
  errors?: IJobsiteMaterialDeliveredRateError[];
  isLoading?: boolean;
  label?: string;
  titleName?: string;
}

const JobsiteMaterialDeliveredRatesForm = ({
  deliveredRates,
  onChange,
  errors = [],
  isLoading,
  label,
  titleName,
}: IJobsiteMaterialDeliveredRatesForm) => {
  /**
   * ----- Variables -----
   */

  const delivererdRatesCopy: Omit<
    JobsiteMaterialDeliveredRateSnippetFragment,
    "__typename"
  >[] = React.useMemo(() => {
    const copy: JobsiteMaterialDeliveredRateSnippetFragment[] = JSON.parse(
      JSON.stringify(deliveredRates)
    );

    for (let i = 0; i < copy.length; i++) {
      if (copy[i].__typename) delete copy[i].__typename;
    }

    return copy;
  }, [deliveredRates]);

  /**
   * ----- Functions -----
   */

  const addRate = React.useCallback(() => {
    delivererdRatesCopy.push({
      title: "",
      rates: [
        {
          date: new Date(),
          rate: 0,
        },
      ],
    });

    if (onChange) onChange(delivererdRatesCopy);
  }, [delivererdRatesCopy, onChange]);

  const setTitle = React.useCallback(
    (value: string, index: number) => {
      delivererdRatesCopy[index].title = value;

      if (onChange) onChange(delivererdRatesCopy);
    },
    [delivererdRatesCopy, onChange]
  );

  const setRates = React.useCallback(
    (
      value: Omit<JobsiteMaterialRateSnippetFragment, "__typename">[],
      index: number
    ) => {
      delivererdRatesCopy[index].rates = value;

      if (onChange) onChange(delivererdRatesCopy);
    },
    [delivererdRatesCopy, onChange]
  );

  /**
   * ----- Use-effects and other logic -----
   */

  React.useEffect(() => {
    if (onChange) onChange(delivererdRatesCopy);
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
      {deliveredRates.map((def, index) => (
        <FormContainer
          key={def._id || def.title || def.rates[0]?.date || index}
          justifyContent="space-between"
          display="flex"
          flexDir="row"
          border="1px solid"
          borderColor="gray.400"
        >
          <SimpleGrid columns={[1, 1, 2]} spacing={2} w="100%">
            <TextField
              value={def.title}
              label={titleName}
              isDisabled={isLoading}
              errorMessage={errors[index]?.title?.message}
              onChange={(e) => setTitle(e.target.value, index)}
            />
            <JobsiteMaterialRatesForm
              rates={def.rates}
              isLoading={isLoading}
              onChange={(rate) => setRates(rate, index)}
              errors={errors[index]?.rates}
              singleColumn
            />
          </SimpleGrid>
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

export default JobsiteMaterialDeliveredRatesForm;
