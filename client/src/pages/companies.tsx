import { Flex, Heading } from "@chakra-ui/react";
import router from "next/router";
import React from "react";
import Card from "../components/Common/Card";
import Container from "../components/Common/Container";
import InfiniteScroll from "../components/Common/InfiniteScroll";
import Loading from "../components/Common/Loading";

import { useCompaniesQuery } from "../generated/graphql";
import createLink from "../utils/createLink";

const Companies = () => {
  /**
   * ----- Hook Initialization -----
   */

  const { data, loading, fetchMore, networkStatus } = useCompaniesQuery({
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
            offset: data?.companies.length,
          },
        },
      }).then((data) => {
        if (data.data.companies.length === 0) setFinished(true);
      });
    }
  }, [data?.companies.length, fetchMore, finished, networkStatus]);

  /**
   * ----- Rendering -----
   */

  const content = React.useMemo(() => {
    if (data?.companies) {
      return (
        <Flex flexDir="column" alignContent="center">
          {data.companies.map((company) => (
            <Card cursor="pointer" key={company._id} onClick={() => router.push(createLink.company(company._id))}>
              <Heading size="md">{company.name}</Heading>
            </Card>
          ))}
          {loading && <Loading />}
        </Flex>
      );
    } else {
      return <Loading />;
    }
  }, [data?.companies, loading]);

  return (
    <Container>
      <Heading>Companies</Heading>
      <InfiniteScroll
        enabled={!!data?.companies && data.companies.length > 0}
        loading={networkStatus !== 7}
        content={content}
        nextPage={nextPage}
      />
    </Container>
  );
};

export default Companies;
