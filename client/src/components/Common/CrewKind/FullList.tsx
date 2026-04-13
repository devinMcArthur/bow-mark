import { Flex, Text } from "@chakra-ui/react";
import React from "react";

import { useCrewKindsQuery } from "../../../generated/graphql";
import Loading from "../Loading";
import CrewKindCard from "./Card";

const CrewKindFullList = () => {
  const { data, loading } = useCrewKindsQuery({
    notifyOnNetworkStatusChange: true,
  });

  if (loading && !data) return <Loading />;

  if (!data?.crewKinds || data.crewKinds.length === 0) {
    return (
      <Flex justifyContent="center" py={8}>
        <Text color="gray.500" fontSize="sm">
          No crew kinds yet. Add one to get started.
        </Text>
      </Flex>
    );
  }

  return (
    <Flex flexDir="column" alignContent="center">
      {data.crewKinds.map((crewKind) => (
        <CrewKindCard crewKind={crewKind} key={crewKind._id} />
      ))}
    </Flex>
  );
};

export default CrewKindFullList;
