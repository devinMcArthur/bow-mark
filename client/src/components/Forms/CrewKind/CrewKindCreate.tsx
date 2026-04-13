import React from "react";
import { Box, Button, Text, useToast } from "@chakra-ui/react";
import { useCrewKindCreateForm } from "../../../forms/crewKind";
import {
  CrewKindCreateData,
  CrewKindCardSnippetFragment,
  useCrewKindCreateMutation,
  useCrewKindUnarchiveMutation,
  CrewKindsDocument,
} from "../../../generated/graphql";
import SubmitButton from "../../Common/forms/SubmitButton";

interface ICrewKindCreateForm {
  onSuccess?: (crewKind: CrewKindCardSnippetFragment) => void;
}

/**
 * Parse the server's ARCHIVED_DUPLICATE error. Apollo wraps GraphQL errors
 * in various ways depending on version — check both `e.message` and
 * `e.graphQLErrors[*].message` for the sentinel prefix.
 */
function parseArchivedDuplicate(error: any): { id: string; message: string } | null {
  const candidates: string[] = [];
  if (typeof error?.message === "string") candidates.push(error.message);
  if (Array.isArray(error?.graphQLErrors)) {
    for (const ge of error.graphQLErrors) {
      if (typeof ge?.message === "string") candidates.push(ge.message);
    }
  }
  for (const msg of candidates) {
    const idx = msg.indexOf("ARCHIVED_DUPLICATE:");
    if (idx < 0) continue;
    const payload = msg.slice(idx + "ARCHIVED_DUPLICATE:".length);
    const colonIdx = payload.indexOf(":");
    if (colonIdx < 0) continue;
    return { id: payload.slice(0, colonIdx), message: payload.slice(colonIdx + 1) };
  }
  return null;
}

const CrewKindCreateForm = ({ onSuccess }: ICrewKindCreateForm) => {
  const toast = useToast();
  const { FormComponents } = useCrewKindCreateForm();
  const [create, { loading }] = useCrewKindCreateMutation({
    refetchQueries: [CrewKindsDocument],
  });
  const [unarchive, { loading: unarchiving }] = useCrewKindUnarchiveMutation({
    refetchQueries: [CrewKindsDocument],
  });

  // When the server detects an archived duplicate, we stash the info here
  // so the user can choose to restore it instead.
  const [archivedDuplicate, setArchivedDuplicate] = React.useState<{
    id: string;
    message: string;
  } | null>(null);

  const handleUnarchive = React.useCallback(async () => {
    if (!archivedDuplicate) return;
    try {
      const res = await unarchive({ variables: { id: archivedDuplicate.id } });
      if (res.data?.crewKindUnarchive) {
        toast({ status: "success", title: "Restored", description: "Crew kind has been restored.", isClosable: true });
        if (onSuccess) onSuccess(res.data.crewKindUnarchive);
      }
    } catch (e: any) {
      toast({ status: "error", title: "Error", description: e.message, isClosable: true });
    }
    setArchivedDuplicate(null);
  }, [archivedDuplicate, unarchive, onSuccess, toast]);

  const submitHandler = React.useCallback(
    async (data: CrewKindCreateData) => {
      setArchivedDuplicate(null);
      try {
        const res = await create({ variables: { data } });
        if (res.data?.crewKindCreate) {
          if (onSuccess) onSuccess(res.data.crewKindCreate);
        } else {
          toast({
            status: "error",
            title: "Error",
            description: "Something went wrong, please try again",
            isClosable: true,
          });
        }
      } catch (e: any) {
        const parsed = parseArchivedDuplicate(e);
        if (parsed) {
          setArchivedDuplicate(parsed);
        } else {
          toast({
            status: "error",
            title: "Error",
            description: e.message,
            isClosable: true,
          });
        }
      }
    },
    [create, onSuccess, toast]
  );

  return (
    <FormComponents.Form submitHandler={submitHandler}>
      <FormComponents.Name isLoading={loading || unarchiving} />
      <FormComponents.Description isLoading={loading || unarchiving} />

      {archivedDuplicate && (
        <Box
          bg="orange.50"
          border="1px solid"
          borderColor="orange.200"
          rounded="md"
          p={3}
          mb={3}
        >
          <Text fontSize="sm" color="orange.800" mb={2}>
            {archivedDuplicate.message}
          </Text>
          <Button
            size="sm"
            colorScheme="orange"
            isLoading={unarchiving}
            onClick={handleUnarchive}
          >
            Restore
          </Button>
        </Box>
      )}

      {!archivedDuplicate && <SubmitButton isLoading={loading} />}
    </FormComponents.Form>
  );
};

export default CrewKindCreateForm;
