import { Flex, IconButton, Text, useToast } from "@chakra-ui/react";
import React from "react";
import { FiEdit2 } from "react-icons/fi";
import {
  SystemDocument,
  SystemSnippetFragment,
  useSystemUpdateInternalExpenseOverheadRateMutation,
} from "../../../generated/graphql";
import Rates from "../forms/Rates";
import SubmitButton from "../forms/SubmitButton";
import RatesTable from "../RatesTable";

interface ISystemInternalExpenseOverheadRate {
  system: SystemSnippetFragment;
}

const SystemInternalExpenseOverheadRate = ({
  system,
}: ISystemInternalExpenseOverheadRate) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [edit, setEdit] = React.useState(false);

  const [value, setValue] = React.useState(system.internalExpenseOverheadRate);

  const [update, { loading }] =
    useSystemUpdateInternalExpenseOverheadRateMutation({
      refetchQueries: [SystemDocument],
    });

  /**
   * ----- Functions -----
   */

  const handleSubmit = React.useCallback(async () => {
    try {
      const res = await update({
        variables: {
          data: value,
        },
      });

      if (res.data?.systemUpdateInternalExpenseOverheadRate) {
        setEdit(false);
        setValue(
          res.data.systemUpdateInternalExpenseOverheadRate
            .internalExpenseOverheadRate
        );
      } else {
        toast({
          status: "error",
          title: "Error",
          description: "Something went wrong, please try again",
          isClosable: true,
        });
      }
    } catch (error) {}
  }, [toast, update, value]);

  /**
   * ----- Rendering -----
   */

  return (
    <div>
      <Flex flexDir="row">
        <IconButton
          size="sm"
          icon={<FiEdit2 />}
          aria-label="edit"
          backgroundColor="transparent"
          onClick={() => setEdit(!edit)}
          _hover={{ backgroundColor: "transparent" }}
          _focus={{ border: "none" }}
          _active={{ backgroundColor: "transparent" }}
        />
        <Text my="auto" fontWeight="bold">
          Internal Expense Overhead:
        </Text>
      </Flex>
      {edit ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <Rates
            rates={value}
            onChange={(rates) => setValue(rates)}
            formSymbol="%"
          />
          <SubmitButton isLoading={loading} />
        </form>
      ) : (
        <RatesTable rates={system.internalExpenseOverheadRate} symbol="%" />
      )}
    </div>
  );
};

export default SystemInternalExpenseOverheadRate;
