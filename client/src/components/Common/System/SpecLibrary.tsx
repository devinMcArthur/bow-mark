import { Box, Text } from "@chakra-ui/react";
import { gql, useQuery } from "@apollo/client";
import React from "react";
import FileBrowser from "../../FileBrowser";
import Loading from "../Loading";
import { useAuth } from "../../../contexts/Auth";

const SYSTEM_SPECS_ROOT = gql`
  query SystemSpecsRoot {
    systemSpecsRoot {
      _id
    }
  }
`;

const SystemSpecLibrary: React.FC = () => {
  const {
    state: { user },
  } = useAuth();
  const { data, loading } = useQuery<{
    systemSpecsRoot: { _id: string } | null;
  }>(SYSTEM_SPECS_ROOT);

  return (
    <Box mt={8}>
      <Text fontWeight="semibold" fontSize="lg" mb={3}>
        Reference Spec Library
      </Text>
      <Text fontSize="sm" color="gray.500" mb={4}>
        Shared specification documents (e.g. City of Calgary specs, municipal
        standards) available to the AI in every Tender chat.
      </Text>

      {loading && <Loading />}
      {!loading && !data?.systemSpecsRoot?._id && (
        <Text fontSize="sm" color="orange.500">
          Spec library not provisioned yet.
        </Text>
      )}
      {data?.systemSpecsRoot?._id && (
        <FileBrowser
          rootId={data.systemSpecsRoot._id}
          rootLabel="Specs"
          userRole={user?.role}
          compact={false}
        />
      )}
    </Box>
  );
};

export default SystemSpecLibrary;
