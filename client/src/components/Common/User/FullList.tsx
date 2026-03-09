import { Flex } from "@chakra-ui/react";
import React from "react";
import { useUsersQuery } from "../../../generated/graphql";
import InfiniteScroll from "../InfiniteScroll";
import Loading from "../Loading";
import UserCard from "./UserCard";

const UserFullList = () => {
  /**
   * ----- Hook Initialization -----
   */

  const { data, loading, fetchMore, networkStatus } = useUsersQuery({
    notifyOnNetworkStatusChange: true,
  });

  const [finished, setFinished] = React.useState(false);

  /**
   * ----- Functions -----
   */

  const nextPage = React.useCallback(() => {
    if (!finished && networkStatus === 7) {
      fetchMore({
        variables: {
          options: {
            offset: data?.users.length,
          },
        },
      }).then((data) => {
        if (data.data.users.length === 0) setFinished(true);
      });
    }
  }, [data?.users.length, fetchMore, finished, networkStatus]);

  /**
   * ----- Rendering -----
   */

  const content = React.useMemo(() => {
    if (data?.users) {
      return (
        <Flex flexDir="column" alignContent="center">
          {data.users.map((user) => (
            <UserCard user={user} key={user._id} />
          ))}
          {loading && <Loading />}
        </Flex>
      );
    } else {
      return <Loading />;
    }
  }, [data?.users, loading]);

  return (
    <InfiniteScroll
      enabled={!!data?.users && data.users.length > 0}
      loading={networkStatus !== 7}
      content={content}
      nextPage={nextPage}
    />
  );
};

export default UserFullList;
