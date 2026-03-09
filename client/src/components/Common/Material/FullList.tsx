import { Flex } from "@chakra-ui/react";
import React from "react";

import { useMaterialsFullQuery } from "../../../generated/graphql";
import InfiniteScroll from "../InfiniteScroll";
import Loading from "../Loading";
import MaterialCard from "./Card";

const MaterialFullList = () => {
  /**
   * ----- Hook Initialization -----
   */

  const { data, loading, fetchMore, networkStatus } = useMaterialsFullQuery({
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
            offset: data?.materials.length,
          },
        },
      }).then((data) => {
        if (data.data.materials.length === 0) setFinished(true);
      });
    }
  }, [data?.materials.length, fetchMore, finished, networkStatus]);

  /**
   * ----- Rendering -----
   */

  const content = React.useMemo(() => {
    if (data?.materials) {
      return (
        <Flex flexDir="column" alignContent="center">
          {data.materials.map((material) => (
            <MaterialCard material={material} key={material._id} />
          ))}
          {loading && <Loading />}
        </Flex>
      );
    } else {
      return <Loading />;
    }
  }, [data?.materials, loading]);

  return (
    <InfiniteScroll
      enabled={!!data?.materials && data.materials.length > 0}
      loading={networkStatus !== 7}
      content={content}
      nextPage={nextPage}
    />
  );
};

export default MaterialFullList;
