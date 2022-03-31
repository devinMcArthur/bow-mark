import { Button, Flex, IconButton, useToast } from "@chakra-ui/react";
import React from "react";
import { FiPlus, FiTrash } from "react-icons/fi";
import {
  SystemDocument,
  SystemSnippetFragment,
  useSystemUpdateUnitDefaultsMutation,
} from "../../../generated/graphql";
import SubmitButton from "../../Common/forms/SubmitButton";
import TextField from "../../Common/forms/TextField";

interface ISystemUnitUpdate {
  system: SystemSnippetFragment;
  onSuccess?: () => void;
}

const SystemUnitUpdate = ({ system, onSuccess }: ISystemUnitUpdate) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [update, { loading }] = useSystemUpdateUnitDefaultsMutation({
    refetchQueries: [SystemDocument],
  });

  const [units, setUnits] = React.useState<string[]>(system.unitDefaults);

  /**
   * ----- Variables -----
   */

  const unitsCopy: string[] = React.useMemo(() => {
    return JSON.parse(JSON.stringify(units));
  }, [units]);

  /**
   * ----- Functions -----
   */

  const setUnit = React.useCallback(
    (value: string, index: number) => {
      unitsCopy[index] = value;

      setUnits(unitsCopy);
    },
    [unitsCopy]
  );

  const addUnit = React.useCallback(() => {
    unitsCopy.push("");

    setUnits(unitsCopy);
  }, [unitsCopy]);

  const removeUnit = React.useCallback(
    (index: number) => {
      unitsCopy.splice(index, 1);

      setUnits(unitsCopy);
    },
    [unitsCopy]
  );

  const handleSubmit = React.useCallback(async () => {
    try {
      const res = await update({
        variables: {
          data: units,
        },
      });

      if (res.data?.systemUpdateUnitDefaults) {
        if (onSuccess) onSuccess();
      } else {
        toast({
          status: "error",
          title: "Error",
          description: "Something went wrong, please try again",
          isClosable: true,
        });
      }
    } catch (e: any) {
      toast({
        status: "error",
        title: "Error",
        description: e.message,
        isClosable: true,
      });
    }
  }, [onSuccess, toast, units, update]);

  /**
   * ----- Rendering -----
   */

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      {units.map((unit, index) => (
        <Flex
          key={index}
          justifyContent="space-between"
          flexDir="row"
          backgroundColor="gray.200"
          borderRadius={4}
          p={2}
          m={2}
        >
          <TextField
            isDisabled={loading}
            label="Unit"
            isRequired
            value={unit}
            onChange={(e) => setUnit(e.target.value, index)}
          />
          <IconButton
            isLoading={loading}
            m="auto"
            aria-label="remove"
            icon={<FiTrash />}
            backgroundColor="transparent"
            onClick={() => removeUnit(index)}
          />
        </Flex>
      ))}
      <Flex justifyContent="end">
        <Button
          mt={2}
          mr={2}
          isLoading={loading}
          leftIcon={<FiPlus />}
          onClick={addUnit}
        >
          New
        </Button>
      </Flex>
      <SubmitButton isLoading={loading} />
    </form>
  );
};

export default SystemUnitUpdate;
