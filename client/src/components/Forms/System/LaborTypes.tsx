import { Button, Flex, IconButton, useToast } from "@chakra-ui/react";
import React from "react";
import { FiPlus, FiTrash } from "react-icons/fi";
import {
  SystemDocument,
  SystemSnippetFragment,
  useSystemUpdateLaborTypesMutation,
} from "../../../generated/graphql";
import FormContainer from "../../Common/FormContainer";
import SubmitButton from "../../Common/forms/SubmitButton";
import TextField from "../../Common/forms/TextField";

interface ISystemLaborTypesUpdate {
  system: SystemSnippetFragment;
  onSuccess?: () => void;
}

const SystemLaborTypesUpdate = ({
  system,
  onSuccess,
}: ISystemLaborTypesUpdate) => {
  /**
   * ----- Hook Initialization -----
   */

  const toast = useToast();

  const [update, { loading }] = useSystemUpdateLaborTypesMutation({
    refetchQueries: [SystemDocument],
  });

  const [laborTypes, setLaborTypes] = React.useState<string[]>(
    system.laborTypes
  );

  /**
   * ----- Variables -----
   */

  const laborTypesCopy: string[] = React.useMemo(() => {
    return JSON.parse(JSON.stringify(laborTypes));
  }, [laborTypes]);

  /**
   * ----- Functions -----
   */

  const setLaborType = React.useCallback(
    (value: string, index: number) => {
      laborTypesCopy[index] = value;

      setLaborTypes(laborTypesCopy);
    },
    [laborTypesCopy]
  );

  const addLaborType = React.useCallback(() => {
    laborTypesCopy.push("");

    setLaborTypes(laborTypesCopy);
  }, [laborTypesCopy]);

  const removeLaborType = React.useCallback(
    (index: number) => {
      laborTypesCopy.splice(index, 1);

      setLaborTypes(laborTypesCopy);
    },
    [laborTypesCopy]
  );

  const handleSubmit = React.useCallback(async () => {
    try {
      const res = await update({
        variables: {
          data: laborTypes,
        },
      });

      if (res.data?.systemUpdateLaborTypes) {
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
  }, [onSuccess, toast, laborTypes, update]);

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
      {laborTypes.map((unit, index) => (
        <FormContainer
          key={index}
          justifyContent="space-between"
          display="flex"
          flexDir="row"
        >
          <TextField
            isDisabled={loading}
            label="Type"
            isRequired
            value={unit}
            onChange={(e) => setLaborType(e.target.value, index)}
          />
          <IconButton
            isLoading={loading}
            m="auto"
            aria-label="remove"
            icon={<FiTrash />}
            backgroundColor="transparent"
            onClick={() => removeLaborType(index)}
          />
        </FormContainer>
      ))}
      <Flex justifyContent="end">
        <Button
          mt={2}
          mr={2}
          isLoading={loading}
          leftIcon={<FiPlus />}
          onClick={addLaborType}
        >
          New
        </Button>
      </Flex>
      <SubmitButton isLoading={loading} />
    </form>
  );
};

export default SystemLaborTypesUpdate;
